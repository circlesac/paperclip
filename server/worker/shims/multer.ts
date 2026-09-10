/**
 * Bundle-time replacement for `multer` (see worker/build.mjs).
 *
 * Route modules create upload middleware at module load
 * (`multer({ storage: multer.memoryStorage(), limits }).single("file")`) and
 * read `req.file.buffer` afterwards. The real multer parses Node streams with
 * busboy; this one parses the Worker's `Request` with `formData()` — the
 * adapter exposes it on the Express-shaped request under RAW_REQUEST — and
 * fills `req.file` / `req.files` / text fields in `req.body` with the same
 * shapes. Size limits raise `MulterError("LIMIT_FILE_SIZE")` like multer.
 */
import { Buffer } from "node:buffer";

export const RAW_REQUEST: unique symbol = Symbol.for("paperclip.worker.rawRequest") as never;

export class MulterError extends Error {
  code: string;
  field?: string;
  constructor(code: string, field?: string) {
    super(code);
    this.name = "MulterError";
    this.code = code;
    this.field = field;
  }
}

type Middleware = (req: any, res: any, next: (err?: unknown) => void) => void;
interface Limits { fileSize?: number; files?: number }
interface UploadedFile {
  fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer: Buffer;
}

async function parseMultipart(req: any, limits: Limits, accept: (field: string) => boolean): Promise<UploadedFile[]> {
  const raw: Request | undefined = req[RAW_REQUEST];
  if (!raw) return [];
  const contentType = raw.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) return [];
  const form = await raw.clone().formData();
  const body: Record<string, unknown> = req.body && typeof req.body === "object" ? req.body : {};
  const files: UploadedFile[] = [];
  for (const [field, value] of form.entries()) {
    if (typeof value === "string") { body[field] = value; continue; }
    if (!accept(field)) throw new MulterError("LIMIT_UNEXPECTED_FILE", field);
    if (limits.files !== undefined && files.length >= limits.files) throw new MulterError("LIMIT_FILE_COUNT", field);
    const bytes = await value.arrayBuffer();
    if (limits.fileSize !== undefined && bytes.byteLength > limits.fileSize) throw new MulterError("LIMIT_FILE_SIZE", field);
    files.push({
      fieldname: field,
      originalname: value.name,
      encoding: "7bit",
      mimetype: value.type || "application/octet-stream",
      size: bytes.byteLength,
      buffer: Buffer.from(bytes),
    });
  }
  req.body = body;
  return files;
}

function middleware(limits: Limits, accept: (field: string) => boolean, assign: (req: any, files: UploadedFile[]) => void): Middleware {
  return (req, _res, next) => {
    parseMultipart(req, limits, accept).then((files) => { assign(req, files); next(); }, next);
  };
}

function multer(options?: { storage?: unknown; limits?: Limits }) {
  const limits = options?.limits ?? {};
  return {
    single: (field: string) => middleware(limits, (f) => f === field, (req, files) => { req.file = files[0]; }),
    array: (field: string, maxCount?: number) => middleware({ ...limits, files: maxCount ?? limits.files }, (f) => f === field, (req, files) => { req.files = files; }),
    fields: (defs: Array<{ name: string; maxCount?: number }>) => {
      const names = new Set(defs.map((d) => d.name));
      return middleware(limits, (f) => names.has(f), (req, files) => {
        const grouped: Record<string, UploadedFile[]> = {};
        for (const file of files) (grouped[file.fieldname] ??= []).push(file);
        req.files = grouped;
      });
    },
    any: () => middleware(limits, () => true, (req, files) => { req.files = files; }),
    none: () => middleware(limits, () => false, () => {}),
  };
}

multer.memoryStorage = (_options?: unknown) => ({});
multer.diskStorage = (_options?: unknown) => ({});
multer.MulterError = MulterError;

export default multer;
export const memoryStorage = multer.memoryStorage;
export const diskStorage = multer.diskStorage;
