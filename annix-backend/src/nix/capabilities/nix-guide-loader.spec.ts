import { resolve } from "node:path";
import { Test, TestingModule } from "@nestjs/testing";
import { NixGuideLoader } from "./nix-guide-loader.service";

describe("NixGuideLoader", () => {
  const fixtureRoot = resolve(__dirname, "__fixtures__");
  let loader: NixGuideLoader;

  beforeEach(async () => {
    process.env.NIX_GUIDES_ROOT = fixtureRoot;

    const module: TestingModule = await Test.createTestingModule({
      providers: [NixGuideLoader],
    }).compile();

    loader = module.get(NixGuideLoader);
  });

  afterEach(() => {
    process.env.NIX_GUIDES_ROOT = undefined;
  });

  it("loads a guide and parses front-matter", () => {
    const guide = loader.load("test-app", "sample-guide");
    expect(guide).not.toBeNull();
    if (!guide) return;

    expect(guide.appCode).toBe("test-app");
    expect(guide.slug).toBe("sample-guide");
    expect(guide.title).toBe("Sample Guide");
    expect(guide.summary).toBe("A small fixture guide for unit-testing NixGuideLoader.");
    expect(guide.frontMatter.category).toBe("Testing");
    expect(guide.frontMatter.order).toBe(1);
    expect(guide.frontMatter.lastUpdated).toBe("2026-05-08");
  });

  it("parses arrays in front-matter", () => {
    const guide = loader.load("test-app", "sample-guide");
    expect(guide?.frontMatter.roles).toEqual(["admin", "user"]);
    expect(guide?.frontMatter.tags).toEqual(["test", "fixture"]);
  });

  it("extracts headings with their levels", () => {
    const guide = loader.load("test-app", "sample-guide");
    expect(guide?.headings).toEqual([
      { level: 2, text: "Step 1 — Open the test app" },
      { level: 2, text: "Step 2 — Press the button" },
      { level: 3, text: "A note about pressing" },
      { level: 2, text: "Step 3 — Confirm the result" },
    ]);
  });

  it("returns body content with the front-matter stripped", () => {
    const guide = loader.load("test-app", "sample-guide");
    expect(guide?.body).not.toContain("---");
    expect(guide?.body).toContain("## Step 1 — Open the test app");
    expect(guide?.body).toContain("Click the test app icon");
  });

  it("handles a minimal guide with only a few front-matter keys", () => {
    const guide = loader.load("test-app", "minimal");
    expect(guide).not.toBeNull();
    expect(guide?.title).toBe("Minimal Guide");
    expect(guide?.summary).toBe("Just a title and one section.");
    expect(guide?.headings).toEqual([{ level: 2, text: "Only section" }]);
  });

  it("returns null when the guide is missing", () => {
    expect(loader.load("test-app", "does-not-exist")).toBeNull();
    expect(loader.load("nonexistent-app", "anything")).toBeNull();
  });

  it("caches loaded guides — second call returns the same object", () => {
    const first = loader.load("test-app", "sample-guide");
    const second = loader.load("test-app", "sample-guide");
    expect(first).toBe(second);
  });

  it("invalidate() clears the cache", () => {
    const first = loader.load("test-app", "sample-guide");
    loader.invalidate();
    const second = loader.load("test-app", "sample-guide");
    expect(first).not.toBe(second);
    expect(first?.slug).toBe(second?.slug);
  });

  it("list() returns every guide in an app", () => {
    const guides = loader.list("test-app");
    expect(guides).toHaveLength(2);
    const slugs = guides.map((g) => g.slug).sort();
    expect(slugs).toEqual(["minimal", "sample-guide"]);
  });

  it("list() returns empty array for an unknown app", () => {
    expect(loader.list("nonexistent-app")).toEqual([]);
  });
});
