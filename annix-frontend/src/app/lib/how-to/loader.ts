import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isArray } from "es-toolkit/compat";
import { asNumber, asString, asStringArray, parseFrontmatter } from "./frontmatter";
import { extractHeadings } from "./slugify";
import type { HowToGuide, HowToGuideFrontmatter, HowToHeading } from "./types";

export interface HowToLoaderConfig<TRole extends string> {
  guidesDir: string;
  allRoles: readonly TRole[];
  defaultCategory?: string;
  defaultReadingMinutes?: number;
}

export interface HowToLoader<TRole extends string> {
  loadAllGuides: () => HowToGuide<TRole>[];
  loadGuideBySlug: (slug: string) => HowToGuide<TRole> | null;
  extractHeadings: (body: string) => HowToHeading[];
  clearCache: () => void;
}

export const createHowToLoader = <TRole extends string>(
  config: HowToLoaderConfig<TRole>,
): HowToLoader<TRole> => {
  const validateRoles = (value: unknown): TRole[] => {
    if (!isArray(value)) return [];
    return value.filter((r): r is TRole => config.allRoles.includes(r as TRole));
  };

  const buildFrontmatter = (
    data: Record<string, unknown>,
    slug: string,
  ): HowToGuideFrontmatter<TRole> => {
    const rawDefaultCategory = config.defaultCategory;
    const rawDefaultReadingMinutes = config.defaultReadingMinutes;

    return {
      title: asString(data.title, slug),
      slug: asString(data.slug, slug),
      category: asString(data.category, rawDefaultCategory || "General"),
      roles: validateRoles(data.roles),
      order: asNumber(data.order, 999),
      tags: asStringArray(data.tags),
      lastUpdated: asString(data.lastUpdated, ""),
      summary: asString(data.summary, ""),
      readingMinutes: asNumber(data.readingMinutes, rawDefaultReadingMinutes || 3),
      relatedPaths: asStringArray(data.relatedPaths),
    };
  };

  let cache: HowToGuide<TRole>[] | null = null;

  const loadAllGuides = (): HowToGuide<TRole>[] => {
    if (cache) return cache;

    const files = readdirSync(config.guidesDir).filter((f) => f.endsWith(".md"));
    const guides = files.map((file) => {
      const raw = readFileSync(join(config.guidesDir, file), "utf8");
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

  const loadGuideBySlug = (slug: string): HowToGuide<TRole> | null => {
    const match = loadAllGuides().find((g) => g.slug === slug);
    return match || null;
  };

  const clearCache = () => {
    cache = null;
  };

  return { loadAllGuides, loadGuideBySlug, extractHeadings, clearCache };
};
