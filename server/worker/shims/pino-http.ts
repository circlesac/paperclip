/**
 * Bundle-time replacement for `pino-http` (see `alias` in ../../wrangler.jsonc).
 *
 * `server/src/middleware/logger.ts` calls `pinoHttp(...)` at module load to
 * build the Express request logger. That module initialization reads
 * `pino.symbols`, which the pino build selected for Cloudflare Workers does
 * not have, and crashes workerd at startup. The Worker never mounts the
 * Express request logger, so a no-op middleware is enough.
 */
export function pinoHttp(): (req: unknown, res: unknown, next?: () => void) => void {
  return (_req, _res, next) => next?.();
}
export default pinoHttp;
