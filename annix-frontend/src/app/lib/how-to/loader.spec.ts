import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toPairs as entries } from "es-toolkit/compat";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHowToLoader } from "./loader";

type TestRole = "viewer" | "manager" | "admin";
const ALL_ROLES: readonly TestRole[] = ["viewer", "manager", "admin"];

const writeGuide = (dir: string, name: string, content: string) => {
  writeFileSync(join(dir, name), content, "utf8");
};

const sampleGuide = (overrides: Record<string, string> = {}) => {
  const defaults: Record<string, string> = {
    title: "Sample",
    slug: "sample",
    category: "General",
    roles: "[viewer, admin]",
    order: "1",
    tags: "[onboarding]",
    lastUpdated: "2026-01-01",
    summary: "A sample guide",
    readingMinutes: "3",
    relatedPaths: "[]",
  };
  const merged = { ...defaults, ...overrides };
  const frontmatter = entries(merged)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n\n## Heading\n\nBody content`;
};

describe("createHowToLoader", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "howto-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads a single guide with all frontmatter fields populated", () => {
    writeGuide(dir, "sample.md", sampleGuide());
    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const guides = loader.loadAllGuides();

    expect(guides).toHaveLength(1);
    const g = guides[0];
    expect(g.title).toBe("Sample");
    expect(g.slug).toBe("sample");
    expect(g.category).toBe("General");
    expect(g.roles).toEqual(["viewer", "admin"]);
    expect(g.order).toBe(1);
    expect(g.tags).toEqual(["onboarding"]);
    expect(g.lastUpdated).toBe("2026-01-01");
    expect(g.summary).toBe("A sample guide");
    expect(g.readingMinutes).toBe(3);
    expect(g.relatedPaths).toEqual([]);
    expect(g.body).toContain("## Heading");
    expect(g.body).toContain("Body content");
  });

  it("only reads .md files", () => {
    writeGuide(dir, "real.md", sampleGuide({ slug: "real" }));
    writeGuide(dir, "notes.txt", "ignored");
    writeGuide(dir, "config.json", "{}");

    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const guides = loader.loadAllGuides();
    expect(guides).toHaveLength(1);
    expect(guides[0].slug).toBe("real");
  });

  it("sorts guides by category then by order", () => {
    writeGuide(dir, "a.md", sampleGuide({ slug: "a", category: "Beta", order: "2" }));
    writeGuide(dir, "b.md", sampleGuide({ slug: "b", category: "Alpha", order: "2" }));
    writeGuide(dir, "c.md", sampleGuide({ slug: "c", category: "Beta", order: "1" }));
    writeGuide(dir, "d.md", sampleGuide({ slug: "d", category: "Alpha", order: "1" }));

    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const guides = loader.loadAllGuides();
    expect(guides.map((g) => g.slug)).toEqual(["d", "b", "c", "a"]);
  });

  it("strips invalid roles from the roles array", () => {
    writeGuide(dir, "x.md", sampleGuide({ roles: "[admin, superuser, manager, bogus]" }));
    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const g = loader.loadAllGuides()[0];
    expect(g.roles).toEqual(["admin", "manager"]);
  });

  it("applies defaults for missing frontmatter fields", () => {
    writeFileSync(join(dir, "bare.md"), "---\ntitle: Bare\n---\ncontent", "utf8");
    const loader = createHowToLoader<TestRole>({
      guidesDir: dir,
      allRoles: ALL_ROLES,
      defaultCategory: "Misc",
      defaultReadingMinutes: 7,
    });
    const g = loader.loadAllGuides()[0];
    expect(g.title).toBe("Bare");
    expect(g.slug).toBe("bare");
    expect(g.category).toBe("Misc");
    expect(g.readingMinutes).toBe(7);
    expect(g.order).toBe(999);
    expect(g.roles).toEqual([]);
    expect(g.tags).toEqual([]);
    expect(g.relatedPaths).toEqual([]);
  });

  it("uses filename as slug when no slug is provided in frontmatter", () => {
    writeFileSync(join(dir, "my-guide.md"), "---\ntitle: X\n---\ny", "utf8");
    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    expect(loader.loadAllGuides()[0].slug).toBe("my-guide");
  });

  it("caches guides between calls until clearCache is invoked", () => {
    writeGuide(dir, "a.md", sampleGuide({ slug: "a" }));
    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const first = loader.loadAllGuides();

    writeGuide(dir, "b.md", sampleGuide({ slug: "b" }));
    const second = loader.loadAllGuides();
    expect(second).toBe(first);
    expect(second).toHaveLength(1);

    loader.clearCache();
    const third = loader.loadAllGuides();
    expect(third).toHaveLength(2);
  });

  it("loadGuideBySlug returns the matching guide", () => {
    writeGuide(dir, "a.md", sampleGuide({ slug: "first" }));
    writeGuide(dir, "b.md", sampleGuide({ slug: "second", title: "Second Guide" }));

    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const guide = loader.loadGuideBySlug("second");
    expect(guide).not.toBeNull();
    expect(guide?.title).toBe("Second Guide");
  });

  it("loadGuideBySlug returns null for unknown slugs", () => {
    writeGuide(dir, "a.md", sampleGuide({ slug: "exists" }));
    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    expect(loader.loadGuideBySlug("missing")).toBeNull();
  });

  it("exposes extractHeadings for consumers", () => {
    writeGuide(dir, "a.md", sampleGuide());
    const loader = createHowToLoader<TestRole>({ guidesDir: dir, allRoles: ALL_ROLES });
    const headings = loader.extractHeadings("## One\n\n### Two\n");
    expect(headings).toHaveLength(2);
    expect(headings[0].level).toBe(2);
    expect(headings[1].level).toBe(3);
  });
});
