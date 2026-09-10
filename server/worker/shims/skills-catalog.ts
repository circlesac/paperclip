/**
 * Bundle-time replacement for `services/skills-catalog.ts` (see worker/build.mjs).
 *
 * The real module resolves `@paperclipai/skills-catalog` on disk with
 * createRequire and reads the manifest and skill files with node:fs. Here the
 * manifest (packages/skills-catalog/generated/catalog.json, tracked) is
 * imported at build time and the skill files are packed by worker/build.mjs
 * into worker/dist/skills-catalog-files.json, so the catalog list, lookup,
 * and file previews answer from the bundle. Filtering/lookup mirror the
 * exported functions of the real module one for one; copying a catalog file
 * to a path (used by skill installs into a workspace) is not available.
 */
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import type { CatalogSkill, CatalogSkillFileDetail, CatalogSkillListQuery } from "@paperclipai/shared";
import { HttpError, conflict, notFound, unprocessable } from "../../src/errors.js";
import { normalizePortablePath } from "../../src/services/portable-path.js";
import { ghFetch, resolveRawGitHubUrl } from "../../src/services/github-fetch.js";
import manifest from "../../../packages/skills-catalog/generated/catalog.json";
import catalogFiles from "../dist/skills-catalog-files.json";

type CatalogManifestFile = { packageName: string; packageVersion: string; skills: Array<Omit<CatalogSkill, "packageName" | "packageVersion">> };
const catalogManifest = manifest as unknown as CatalogManifestFile;
const bundledFiles = catalogFiles as Record<string, string>; // "<skill.path>/<file path>" → base64

export class CatalogManifestUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CatalogManifestUnavailableError";
  }
}
export function isCatalogManifestUnavailableError(error: unknown): error is CatalogManifestUnavailableError {
  return error instanceof CatalogManifestUnavailableError;
}

function getCatalogSkills(): CatalogSkill[] {
  return catalogManifest.skills.map((skill) => ({
    ...skill,
    packageName: catalogManifest.packageName,
    packageVersion: catalogManifest.packageVersion,
  })) as CatalogSkill[];
}

function isMarkdownPath(filePath: string) {
  const fileName = filePath.split("/").pop()!.toLowerCase();
  return fileName === "skill.md" || fileName.endsWith(".md");
}

function inferLanguageFromPath(filePath: string) {
  const fileName = filePath.split("/").pop()!.toLowerCase();
  if (fileName === "skill.md" || fileName.endsWith(".md")) return "markdown";
  if (fileName.endsWith(".ts")) return "typescript";
  if (fileName.endsWith(".tsx")) return "tsx";
  if (fileName.endsWith(".js")) return "javascript";
  if (fileName.endsWith(".jsx")) return "jsx";
  if (fileName.endsWith(".json")) return "json";
  if (fileName.endsWith(".yml") || fileName.endsWith(".yaml")) return "yaml";
  if (fileName.endsWith(".sh")) return "bash";
  if (fileName.endsWith(".py")) return "python";
  if (fileName.endsWith(".html")) return "html";
  if (fileName.endsWith(".css")) return "css";
  return null;
}

async function readCatalogFileBytes(skill: CatalogSkill, relativePath: string): Promise<Buffer> {
  const fileEntry = skill.files.find((entry) => entry.path === relativePath);
  if (!fileEntry) throw notFound("Catalog skill file not found");
  let bytes: Buffer;
  const source = skill.source;
  if (!source) {
    const packed = bundledFiles[`${skill.path}/${relativePath}`];
    if (packed === undefined) throw notFound("Catalog skill file not found");
    bytes = Buffer.from(packed, "base64");
  } else if (source.type !== "github") {
    throw unprocessable(`Unsupported catalog source type: ${(source as { type: string }).type}`);
  } else {
    const sourceRoot = source.path ? normalizePortablePath(source.path) : "";
    const sourcePath = sourceRoot ? `${sourceRoot}/${relativePath}` : relativePath;
    const response = await ghFetch(resolveRawGitHubUrl(source.hostname, source.owner, source.repo, source.commit, sourcePath));
    if (!response.ok) {
      throw unprocessable(`Failed to fetch pinned catalog file ${sourcePath} from ${source.owner}/${source.repo}@${source.commit}: HTTP ${response.status}`);
    }
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash("sha256").update(bytes).digest("hex") !== fileEntry.sha256) {
    throw unprocessable(`Pinned catalog file hash mismatch for ${skill.id}:${relativePath}.`);
  }
  return bytes;
}

function searchText(skill: CatalogSkill) {
  return [skill.id, skill.key, skill.slug, skill.name, skill.description, skill.category, skill.kind, ...skill.recommendedForRoles, ...skill.tags]
    .join("\n")
    .toLowerCase();
}

export function listCatalogSkills(query: CatalogSkillListQuery = {}): CatalogSkill[] {
  const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
  return getCatalogSkills()
    .filter((skill) => !query.kind || skill.kind === query.kind)
    .filter((skill) => !query.category || skill.category === query.category)
    .filter((skill) => !normalizedQuery || searchText(skill).includes(normalizedQuery))
    .sort((left, right) => left.name.localeCompare(right.name) || left.key.localeCompare(right.key));
}

export function listCatalogSkillsOrEmpty(query: CatalogSkillListQuery = {}): CatalogSkill[] {
  return listCatalogSkills(query);
}

export function resolveCatalogSkillReference(reference: string): { skill: CatalogSkill | null; ambiguous: boolean } {
  const trimmed = reference.trim();
  if (!trimmed) return { skill: null, ambiguous: false };
  const catalogSkills = getCatalogSkills();
  const exact = catalogSkills.find((skill) => skill.id === trimmed || skill.key === trimmed);
  if (exact) return { skill: exact, ambiguous: false };
  const slugMatches = catalogSkills.filter((skill) => skill.slug === trimmed);
  if (slugMatches.length === 1) return { skill: slugMatches[0]!, ambiguous: false };
  if (slugMatches.length > 1) return { skill: null, ambiguous: true };
  return { skill: null, ambiguous: false };
}

export function getCatalogSkillOrThrow(reference: string): CatalogSkill {
  const result = resolveCatalogSkillReference(reference);
  if (result.ambiguous) throw conflict(`Catalog skill slug "${reference}" is ambiguous. Use an id or key.`);
  if (!result.skill) throw notFound("Catalog skill not found");
  return result.skill;
}

export async function readCatalogSkillFile(reference: string, relativePath = "SKILL.md"): Promise<CatalogSkillFileDetail> {
  const skill = getCatalogSkillOrThrow(reference);
  const normalizedPath = normalizePortablePath(relativePath || "SKILL.md");
  const fileEntry = skill.files.find((entry) => entry.path === normalizedPath);
  if (!fileEntry) throw notFound("Catalog skill file not found");
  if (fileEntry.kind === "asset") throw new HttpError(415, "Catalog asset previews are not supported.");
  const content = (await readCatalogFileBytes(skill, normalizedPath)).toString("utf8");
  return {
    catalogSkillId: skill.id,
    path: normalizedPath,
    kind: fileEntry.kind,
    content,
    language: inferLanguageFromPath(normalizedPath),
    markdown: isMarkdownPath(normalizedPath),
  };
}

export async function copyCatalogSkillFile(_reference: string, _relativePath: string, _targetPath: string): Promise<void> {
  throw new Error("skills-catalog.copyCatalogSkillFile is not available on the Cloudflare Worker yet");
}

export function getCatalogPackageMetadata() {
  return { packageName: catalogManifest.packageName, packageVersion: catalogManifest.packageVersion };
}
