import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { logger } from "./logger.js";
import { shouldSilenceHttpSuccessLog } from "./http-log-policy.js";
import { redactSensitive, stripSecretBearingUrlParts } from "./redact-sensitive.js";

// pino-http is Node-only: its module initialization reads `pino.symbols`, which
// the pino build selected for Cloudflare Workers does not have. It lives here,
// apart from ./logger.ts, so shared modules can import the base logger from
// either runtime while only the Express app pulls this file in.

export function createHttpLogger(baseLogger: Logger) {
  return pinoHttp({
    logger: baseLogger,
    serializers: {
      req(req: Record<string, unknown> & { url?: unknown }) {
        return {
          ...req,
          url: typeof req.url === "string" ? stripSecretBearingUrlParts(req.url) : req.url,
          // The URL policy intentionally drops all query parameters. The default
          // serializer also exposes the parsed query separately, so omit that
          // duplicate path instead of letting credentials bypass the URL scrub.
          query: undefined,
        };
      },
    },
    customLogLevel(_req, res, err) {
      if (shouldSilenceHttpSuccessLog(_req.method, _req.url, res.statusCode)) {
        return "silent";
      }
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customSuccessMessage(req, res) {
      return `${req.method} ${stripSecretBearingUrlParts(req.url ?? "")} ${res.statusCode}`;
    },
    customErrorMessage(req, res, err) {
      const ctx = (res as any).__errorContext;
      const errMsg = ctx?.error?.message || err?.message || (res as any).err?.message || "unknown error";
      return `${req.method} ${stripSecretBearingUrlParts(req.url ?? "")} ${res.statusCode} — ${errMsg}`;
    },
    customProps(req, res) {
      if (res.statusCode >= 400) {
        const ctx = (res as any).__errorContext;
        if (ctx) {
          return {
            errorContext: ctx.error,
            reqBody: redactSensitive(ctx.reqBody),
            reqParams: redactSensitive(ctx.reqParams),
          };
        }
        const props: Record<string, unknown> = {};
        const { body, params } = req as any;
        if (body && typeof body === "object" && Object.keys(body).length > 0) {
          props.reqBody = redactSensitive(body);
        }
        if (params && typeof params === "object" && Object.keys(params).length > 0) {
          props.reqParams = redactSensitive(params);
        }
        if ((req as any).route?.path) {
          props.routePath = (req as any).route.path;
        }
        return props;
      }
      return {};
    },
  });
}

export const httpLogger = createHttpLogger(logger);
