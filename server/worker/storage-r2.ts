import { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";
import { createStorageService } from "../src/storage/service.js";
import type { GetObjectInput, GetObjectResult, HeadObjectResult, PutObjectInput, StorageProvider, StorageService } from "../src/storage/types.js";
import { notFound } from "../src/errors.js";

/**
 * R2 as a StorageProvider. The unchanged service layer
 * (server/src/storage/service.ts: object keys, sha256, company prefix checks)
 * sits on top, exactly as it does over the S3 and local-disk providers on
 * Node. Provider id is "s3": R2 is S3-compatible and the id must be one of
 * STORAGE_PROVIDERS. Missing objects raise the same notFound the S3 provider
 * raises.
 */
export function createR2StorageProvider(bucket: R2Bucket): StorageProvider {
  return {
    id: "s3",
    async putObject(input: PutObjectInput): Promise<void> {
      const body = Buffer.isBuffer(input.body) ? input.body : await buffer(input.body);
      await bucket.put(input.objectKey, body, { httpMetadata: { contentType: input.contentType } });
    },
    async getObject(input: GetObjectInput): Promise<GetObjectResult> {
      const object = input.range
        ? await bucket.get(input.objectKey, { range: { offset: input.range.start, length: input.range.end - input.range.start + 1 } })
        : await bucket.get(input.objectKey);
      if (!object) throw notFound("Object not found");
      return {
        stream: Readable.fromWeb(object.body as never),
        contentType: object.httpMetadata?.contentType,
        contentLength: object.size,
        etag: object.httpEtag,
        lastModified: object.uploaded,
      };
    },
    async headObject(input: GetObjectInput): Promise<HeadObjectResult> {
      const head = await bucket.head(input.objectKey);
      if (!head) return { exists: false };
      return { exists: true, contentType: head.httpMetadata?.contentType, contentLength: head.size, etag: head.httpEtag, lastModified: head.uploaded };
    },
    async deleteObject(input: GetObjectInput): Promise<void> {
      await bucket.delete(input.objectKey);
    },
  };
}

export function createWorkerStorage(bucket: R2Bucket): StorageService {
  return createStorageService(createR2StorageProvider(bucket));
}
