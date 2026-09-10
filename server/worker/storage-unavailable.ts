import type { StorageService } from "../src/storage/types.js";
import { HttpError } from "../src/errors.js";

/**
 * StorageService for the Worker until an R2-backed provider exists. Route
 * factories require a storage instance at construction; every operation
 * answers 501 so attachment/logo/document-blob paths fail loudly and
 * everything else on those routers keeps working.
 */
function unavailable(op: string): never {
  throw new HttpError(501, `storage.${op} is not available on the Cloudflare Worker yet`);
}

export const storageUnavailable: StorageService = {
  provider: "local_disk" as StorageService["provider"],
  async putFile() { return unavailable("putFile"); },
  async getObject() { return unavailable("getObject"); },
  async headObject() { return unavailable("headObject"); },
  async deleteObject() { return unavailable("deleteObject"); },
};
