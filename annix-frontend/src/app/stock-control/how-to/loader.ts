import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_ROLES,
  type HowToGuide,
  type HowToGuideFrontmatter,
  type HowToHeading,
  type HowToRole,
  slugifyHeading,
} from "./types";

const GUIDES_DIR = join(process.cwd(), "src", "app", "stock-control", "how-to", "guides");

const parseFrontmatter = (raw: string): { data: Record<string, unknown>; body: string } => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const yaml = match[1];
  const body = match[2];
  const data: Record<string, unknown> = {};

  const lines = yaml.split(/\r?\n/);
  lines.forEach((line) => {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) return;
    const key = kv[1];
    const value = kv[2].trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] =
        inner.length === 0 ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  });

  return { data, body };
};

const validateRoles = (value: unknown): HowToRole[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is HowToRole => ALL_ROLES.includes(r as HowToRole));
};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

const buildFrontmatter = (data: Record<string, unknown>, slug: string): HowToGuideFrontmatter => ({
  title: asString(data.title, slug),
  slug: asString(data.slug, slug),
  category: asString(data.category, "General"),
  roles: validateRoles(data.roles),
  order: asNumber(data.order, 999),
  tags: asStringArray(data.tags),
  lastUpdated: asString(data.lastUpdated, ""),
  summary: asString(data.summary, ""),
  readingMinutes: asNumber(data.readingMinutes, 3),
  relatedPaths: asStringArray(data.relatedPaths),
});

let cache: HowToGuide[] | null = null;

export const loadAllGuides = (): HowToGuide[] => {
  if (cache) return cache;

  const files = readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".md"));
  const guides = files.map((file) => {
    const raw = readFileSync(join(GUIDES_DIR, file), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const slug = file.replace(/\.md$/, "");
    const fm = buildFrontmatter(data, slug);
    return { ...fm, body: body.trim() };
  });

  cache = guides.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.order - b.order;
  });
  return cache;
};

export const loadGuideBySlug = (slug: string): HowToGuide | null => {
  const match = loadAllGuides().find((g) => g.slug === slug);
  return match || null;
};

export const extractHeadings = (body: string): HowToHeading[] => {
  const lines = body.split(/\r?\n/);
  const headings: HowToHeading[] = [];
  let inCodeBlock = false;

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) return;
    const level = m[1].length === 2 ? 2 : 3;
    const text = m[2].trim();
    headings.push({ level, text, anchor: slugifyHeading(text) });
  });

  return headings;
};
