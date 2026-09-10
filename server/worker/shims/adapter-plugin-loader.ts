/**
 * Bundle-time replacement for `adapters/plugin-loader.ts` (see worker/build.mjs).
 *
 * External adapters are npm packages installed under the Paperclip home
 * directory and imported from disk. The registry's startup pass asks for them
 * (`buildExternalAdapters`) and would otherwise log a failure on every isolate
 * start; the Worker has none, so that answers an empty list. Installing,
 * reloading, and the UI parser extraction from a package on disk are not
 * available.
 */
import type { ServerAdapterModule } from "../../src/adapters/types.js";

function notOnWorker(name: string): never {
  throw new Error(`adapters/plugin-loader.${name} is not available on the Cloudflare Worker yet`);
}

export function getUiParserSource(_adapterType: string): string | undefined {
  return undefined;
}
export function getOrExtractUiParserSource(_adapterType: string): string | undefined {
  return undefined;
}
export function validateAdapterModule(_mod: unknown, _packageName: string): ServerAdapterModule {
  return notOnWorker("validateAdapterModule");
}
export async function loadExternalAdapterPackage(..._args: unknown[]): Promise<never> {
  return notOnWorker("loadExternalAdapterPackage");
}
export async function reloadExternalAdapter(..._args: unknown[]): Promise<never> {
  return notOnWorker("reloadExternalAdapter");
}
export async function buildExternalAdapters(): Promise<ServerAdapterModule[]> {
  return [];
}
