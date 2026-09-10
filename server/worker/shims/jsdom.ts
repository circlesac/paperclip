/**
 * Bundle-time replacement for `jsdom` (see worker/build.mjs).
 *
 * routes/assets.ts imports JSDOM at module load but only constructs it inside
 * sanitizeSvgBuffer, i.e. for SVG uploads. jsdom itself (~400 modules, Node
 * streams, dynamic require) cannot load on workerd, so constructing it throws
 * the marker the adapter maps to 501; PNG/JPEG/WebP/GIF uploads never reach it.
 */
export class JSDOM {
  constructor(_html?: string, _options?: unknown) {
    throw new Error("jsdom (SVG sanitizing) is not available on the Cloudflare Worker yet");
  }
  get window(): never {
    throw new Error("jsdom (SVG sanitizing) is not available on the Cloudflare Worker yet");
  }
}
export default { JSDOM };
