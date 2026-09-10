/** Bundle-time replacement for `dompurify`; only reachable after `new JSDOM()` (see jsdom.ts). */
export default function createDOMPurify(_window?: unknown): never {
  throw new Error("dompurify (SVG sanitizing) is not available on the Cloudflare Worker yet");
}
