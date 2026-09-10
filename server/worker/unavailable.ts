/**
 * The two-step lazy proxy worker/build.mjs generates for stubbed modules
 * (scripts/lib/module-exports.mjs), for values index.ts has to hand to an
 * unchanged route factory itself: construction and property access return
 * proxies; the first call, await, string conversion, or JSON serialization
 * throws the message the adapter maps to 501.
 */
export function unavailable<T>(name: string): T {
  const fail = () => {
    throw new Error(`${name} is not available on the Cloudflare Worker yet`);
  };
  const child: unknown = new Proxy(fail, {
    apply: fail,
    construct: fail,
    get: (_t, prop) => (prop === "then" || prop === "toJSON" || prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf" ? fail() : child),
  });
  return new Proxy(fail, { apply: () => child, construct: () => child as object, get: (_t, prop) => (prop === "then" ? undefined : child) }) as T;
}
