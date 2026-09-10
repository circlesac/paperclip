/**
 * Bundle-time replacement for `multer` (see worker/build.mjs).
 *
 * Route modules such as assets.ts and cases.ts create their upload middleware
 * at module load (`multer({ storage: multer.memoryStorage() }).single("file")`),
 * and the real multer pulls busboy and Node streams. This shim keeps module
 * load working and makes every upload path fail loudly with 501 until an
 * R2-backed storage provider exists on the Worker.
 */
import { HttpError } from "../../src/errors.js";

type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void;

const notAvailable: Middleware = (_req, _res, next) => {
  next(new HttpError(501, "File upload is not available on the Cloudflare Worker yet"));
};

function multer(_options?: unknown) {
  return {
    single: (_field?: string) => notAvailable,
    array: (_field?: string, _max?: number) => notAvailable,
    fields: (_fields?: unknown) => notAvailable,
    any: () => notAvailable,
    none: () => notAvailable,
  };
}

multer.memoryStorage = (_options?: unknown) => ({});
multer.diskStorage = (_options?: unknown) => ({});

export default multer;
export const memoryStorage = multer.memoryStorage;
export const diskStorage = multer.diskStorage;
