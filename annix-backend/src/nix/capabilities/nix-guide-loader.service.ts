import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Injectable, Logger } from "@nestjs/common";

/**
 * NixGuideLoader — parses how-to guide markdown for walkthrough mode.
 *
 * Phase 1: minimal viable. Reads from a configurable directory layout:
 *
 *   <guidesRoot>/<appCode>/how-to/guides/<slug>.md
 *
 * Defaults guidesRoot to the frontend repo's `src/app` directory (works in
 * dev/test). Override via `NIX_GUIDES_ROOT` env var.
 *
 * Phase 6 polish will replace this with either:
 *   (a) a shared `@annix/how-to` package consumed by both apps, or
 *   (b) a build-step that copies guides into the backend image, or
 *   (c) the frontend sending guide content with chat messages.
 *
 * The contract — load(appCode, slug) → ParsedGuide | null — stays the same
 * across all three options, so consumers (the future WalkthroughEngine) are
 * insulated from the source.
 */

export interface ParsedGuide {
  readonly appCode: string;
  readonly slug: string;
  readonly frontMatter: Readonly<Record<string, unknown>>;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly headings: readonly { readonly level: number; readonly text: string }[];
}

@Injectable()
export class NixGuideLoader {
  private readonly logger = new Logger(NixGuideLoader.name);
  private readonly cache = new Map<string, ParsedGuide>();
  private readonly guidesRoot: string;

  constructor() {
    const envRoot = process.env.NIX_GUIDES_ROOT;
    if (envRoot) {
      this.guidesRoot = resolve(envRoot);
    } else {
      // Default: walk up from annix-backend/dist/... to the monorepo root,
      // then into annix-frontend/src/app. Works in dev (ts-node) and test
      // contexts where both packages live alongside.
      this.guidesRoot = resolve(process.cwd(), "..", "annix-frontend", "src", "app");
    }
    this.logger.log(`NixGuideLoader initialised (guidesRoot=${this.guidesRoot})`);
  }

  load(appCode: string, slug: string): ParsedGuide | null {
    const cacheKey = `${appCode}/${slug}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const guidePath = join(this.guidesRoot, appCode, "how-to", "guides", `${slug}.md`);
    if (!existsSync(guidePath)) {
      return null;
    }

    const raw = readFileSync(guidePath, "utf8");
    const parsed = this.parseGuide(appCode, slug, raw);
    this.cache.set(cacheKey, parsed);
    return parsed;
  }

  list(appCode: string): ParsedGuide[] {
    const guidesDir = join(this.guidesRoot, appCode, "how-to", "guides");
    if (!existsSync(guidesDir)) return [];

    const files = readdirSync(guidesDir).filter((f) => f.endsWith(".md"));
    return files
      .map((f) => this.load(appCode, f.replace(/\.md$/, "")))
      .filter((g): g is ParsedGuide => g !== null);
  }

  invalidate(): void {
    this.cache.clear();
  }

  private parseGuide(appCode: string, slug: string, raw: string): ParsedGuide {
    const { frontMatter, body } = this.splitFrontMatter(raw);
    const title = asString(frontMatter.title, slug);
    const summary = asString(frontMatter.summary, "");
    const headings = this.extractHeadings(body);

    return {
      appCode,
      slug,
      frontMatter,
      title,
      summary,
      body,
      headings,
    };
  }

  private splitFrontMatter(raw: string): {
    frontMatter: Record<string, unknown>;
    body: string;
  } {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = raw.match(fmRegex);
    if (!match) {
      return { frontMatter: {}, body: raw };
    }
    return {
      frontMatter: parseSimpleYaml(match[1]),
      body: match[2],
    };
  }

  private extractHeadings(body: string): { level: number; text: string }[] {
    const headings: { level: number; text: string }[] = [];
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (m) {
        headings.push({ level: m[1].length, text: m[2] });
      }
    }
    return headings;
  }
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  return fallback;
}

/**
 * Minimal YAML subset parser for guide front-matter.
 *
 * Handles only what the existing how-to guides use:
 *   key: scalar value
 *   key: [item1, item2, item3]
 *   key: "quoted string"
 *
 * Does NOT handle: nested objects, multi-line strings, anchors, references.
 * That subset is enough for every existing guide. If a guide ever needs more
 * (e.g. nested config), swap to a real YAML parser; the contract stays.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const valueRaw = line.slice(colonIdx + 1).trim();
    if (!key) continue;
    result[key] = parseSimpleYamlValue(valueRaw);
  }
  return result;
}

function parseSimpleYamlValue(raw: string): unknown {
  if (raw === "" || raw === "null" || raw === "~") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((part) => parseSimpleYamlValue(part.trim()));
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && /^-?\d+(\.\d+)?$/.test(raw)) {
    return asNum;
  }
  return raw;
}
