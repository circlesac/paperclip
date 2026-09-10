// Parses the value/type exports of a TypeScript module (including `export *`
// chains) well enough to generate a stub with the same export names.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

export function exportsOf(path, seen = new Set()) {
  if (seen.has(path) || !existsSync(path)) return { values: new Map(), types: new Set() };
  seen.add(path);
  const s = readFileSync(path, "utf8");
  const values = new Map();
  const types = new Set();
  const literals = new Map();
  for (const m of s.matchAll(/^export\s+(?:async\s+)?(function\*?|const|let|var|class|enum)\s+([A-Za-z_$][\w$]*)/gm)) values.set(m[2], m[1]);
  // `export const NAME = <simple literal>;` keeps its real value in the stub:
  // numbers (with arithmetic), strings, booleans, null, and arrays of those.
  // Constants are read at module load and in arithmetic; a proxy would throw.
  for (const m of s.matchAll(/^export\s+const\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=\n]+)?\s*=\s*([^;\n]+?)(?:\s+as\s+const)?\s*;\s*$/gm)) {
    const init = m[2].trim();
    const num = /^[\d_.\s()*+\-/%]+$/;
    const str = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`$]*`)$/;
    const lit = (x) => num.test(x) || str.test(x) || /^(true|false|null)$/.test(x);
    const arr = /^\[([^\]]*)\]$/.exec(init);
    if (lit(init) || (arr && arr[1].split(",").map((x) => x.trim()).filter(Boolean).every(lit))) literals.set(m[1], init);
  }
  for (const m of s.matchAll(/^export\s+(?:declare\s+)?(interface|type)\s+([A-Za-z_$][\w$]*)/gm)) types.add(m[2]);
  for (const m of s.matchAll(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+"([^"]+)")?/gm)) {
    for (let name of m[2].split(",")) {
      name = name.trim();
      if (!name) continue;
      const isType = Boolean(m[1]) || name.startsWith("type ");
      name = name.replace(/^type\s+/, "").split(/\s+as\s+/).pop().trim();
      if (isType) types.add(name); else values.set(name, "reexport");
    }
  }
  for (const m of s.matchAll(/^export\s+\*\s+from\s+"([^"]+)"/gm)) {
    const p = normalize(join(dirname(path), m[1])).replace(/\.js$/, ".ts");
    const sub = exportsOf(p, seen);
    for (const [k, v] of sub.values) values.set(k, v);
    for (const t of sub.types) types.add(t);
    for (const [k, v] of sub.literals ?? []) literals.set(k, v);
  }
  const hasDefault = /^export\s+default\b/m.test(s);
  return { values, types, hasDefault, literals };
}

/** Source of a lazy stub module exporting `names`. See build.mjs for the rules. */
export function stubSource(label, names, hasDefault, literals = new Map()) {
  const lines = [
    `// Generated at build time by worker/build.mjs for ${label}: the Worker cannot run this module.`,
    `// Construction and property access return proxies; the first call, await, string`,
    `// conversion, or JSON serialization of the result throws.`,
    `function unavailable(name) {`,
    `  const fail = () => { throw new Error(\`${label}.\${name} is not available on the Cloudflare Worker yet\`); };`,
    `  const child = new Proxy(fail, { apply: fail, construct: fail, get: (_t, prop) => (prop === "then" || prop === "toJSON" || prop === Symbol.toPrimitive || prop === "toString" || prop === "valueOf" ? fail() : child) });`,
    `  return new Proxy(fail, { apply: () => child, construct: () => child, get: (_t, prop) => (prop === "then" ? undefined : child) });`,
    `}`,
  ];
  for (const name of names) lines.push(literals.has(name) ? `export const ${name} = ${literals.get(name)};` : `export const ${name} = unavailable(${JSON.stringify(name)});`);
  if (hasDefault) lines.push(`export default unavailable("default");`);
  return lines.join("\n") + "\n";
}
