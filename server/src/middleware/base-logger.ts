import pino from "pino";
import { HTTP_LOG_REDACT_PATHS } from "./http-log-redaction.js";

const sharedOpts = {
  translateTime: "SYS:HH:MM:ss",
  ignore: "pid,hostname",
  singleLine: true,
};

const isProduction = process.env.NODE_ENV === "production";
const level = process.env.PAPERCLIP_LOG_LEVEL?.trim() || (isProduction ? "info" : "debug");

// The pretty transport runs pino-pretty in a worker thread. It exists on Node;
// the pino build that Cloudflare's bundler selects has no `transport`, so fall
// back to a plain logger there instead of throwing at import time.
export const logger =
  isProduction || typeof pino.transport !== "function"
    ? pino({ level, redact: [...HTTP_LOG_REDACT_PATHS] })
    : pino({ level, redact: [...HTTP_LOG_REDACT_PATHS] }, pino.transport({
        target: "pino-pretty",
        options: { ...sharedOpts, ignore: "pid,hostname,req,res,responseTime", colorize: true, destination: 1 },
      }));
