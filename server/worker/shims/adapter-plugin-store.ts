/**
 * Bundle-time replacement for `services/adapter-plugin-store.ts` (see worker/build.mjs).
 *
 * The real store keeps external adapter installs and the disabled-adapter list
 * in a JSON file under the Paperclip home directory. The Worker has no disk
 * and no external adapters: the read side answers "none installed, none
 * disabled" so `GET /api/adapters` lists the built-ins exactly like a fresh
 * Node install; the write side (install/remove/disable) is not available.
 */
export type { AdapterPluginRecord } from "../../src/services/adapter-plugin-store.js";
import type { AdapterPluginRecord } from "../../src/services/adapter-plugin-store.js";

function notOnWorker(name: string): never {
  throw new Error(`adapter-plugin-store.${name} is not available on the Cloudflare Worker yet`);
}

export function listAdapterPlugins(): AdapterPluginRecord[] {
  return [];
}
export function addAdapterPlugin(_record: AdapterPluginRecord): void {
  notOnWorker("addAdapterPlugin");
}
export function removeAdapterPlugin(_type: string): boolean {
  return notOnWorker("removeAdapterPlugin");
}
export function getAdapterPluginByType(_type: string): AdapterPluginRecord | undefined {
  return undefined;
}
export function getAdapterPluginsDir(): string {
  return notOnWorker("getAdapterPluginsDir");
}
export function getDisabledAdapterTypes(): string[] {
  return [];
}
export function isAdapterDisabled(_type: string): boolean {
  return false;
}
export function setAdapterDisabled(_type: string, _disabled: boolean): boolean {
  return notOnWorker("setAdapterDisabled");
}
