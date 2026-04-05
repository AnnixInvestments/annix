import { describe, expect, it } from "vitest";
import { extractHeadings, slugifyHeading } from "./slugify";

describe("slugifyHeading", () => {
  it("lowercases the input", () => {
    expect(slugifyHeading("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugifyHeading("a b c d")).toBe("a-b-c-d");
  });

  it("strips punctuation except hyphens", () => {
    expect(slugifyHeading("What's new?")).toBe("whats-new");
    expect(slugifyHeading("Fix (and tweak) things!")).toBe("fix-and-tweak-things");
  });

  it("collapses multiple hyphens", () => {
    expect(slugifyHeading("foo  --  bar")).toBe("foo-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyHeading("  --hello--  ")).toBe("hello");
  });

  it("preserves existing hyphens", () => {
    expect(slugifyHeading("already-slugged")).toBe("already-slugged");
  });

  it("handles empty strings", () => {
    expect(slugifyHeading("")).toBe("");
  });

  it("keeps underscores (they are word characters)", () => {
    expect(slugifyHeading("snake_case heading")).toBe("snake_case-heading");
  });
});

describe("extractHeadings", () => {
  it("extracts h2 headings with anchors", () => {
    const body = "## First Section\n\ntext\n\n## Second Section\n\ntext";
    expect(extractHeadings(body)).toEqual([
      { level: 2, text: "First Section", anchor: "first-section" },
      { level: 2, text: "Second Section", anchor: "second-section" },
    ]);
  });

  it("extracts h3 headings with level 3", () => {
    const body = "## Parent\n\n### Child\n\ntext";
    const result = extractHeadings(body);
    expect(result).toHaveLength(2);
    expect(result[0].level).toBe(2);
    expect(result[1].level).toBe(3);
    expect(result[1].text).toBe("Child");
  });

  it("ignores h1 and h4+ headings", () => {
    const body = "# Top\n\n## Keep\n\n#### Skip\n\n##### Skip";
    const result = extractHeadings(body);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Keep");
  });

  it("skips headings inside fenced code blocks", () => {
    const body = "## Real Heading\n\n```\n## Fake Heading\n### Also Fake\n```\n\n## Another Real";
    const result = extractHeadings(body);
    expect(result.map((h) => h.text)).toEqual(["Real Heading", "Another Real"]);
  });

  it("handles empty body", () => {
    expect(extractHeadings("")).toEqual([]);
  });

  it("handles body with no headings", () => {
    expect(extractHeadings("just a paragraph\n\nwith some text")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const body = "## Windows\r\n\r\ntext\r\n\r\n## Style";
    const result = extractHeadings(body);
    expect(result.map((h) => h.text)).toEqual(["Windows", "Style"]);
  });

  it("trims heading text", () => {
    const body = "##   Padded Heading   ";
    expect(extractHeadings(body)[0].text).toBe("Padded Heading");
  });
});
