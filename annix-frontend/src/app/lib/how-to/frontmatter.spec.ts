import { describe, expect, it } from "vitest";
import { asNumber, asString, asStringArray, parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("extracts scalar fields from frontmatter", () => {
    const raw = `---
title: Hello
summary: A guide
---
# Body`;
    const { data, body } = parseFrontmatter(raw);
    expect(data.title).toBe("Hello");
    expect(data.summary).toBe("A guide");
    expect(body).toBe("# Body");
  });

  it("strips surrounding quotes from string values", () => {
    const raw = `---
title: "Quoted Title"
slug: 'single-quoted'
---
body`;
    const { data } = parseFrontmatter(raw);
    expect(data.title).toBe("Quoted Title");
    expect(data.slug).toBe("single-quoted");
  });

  it("parses numeric values as numbers", () => {
    const raw = `---
order: 5
readingMinutes: 12
---
x`;
    const { data } = parseFrontmatter(raw);
    expect(data.order).toBe(5);
    expect(data.readingMinutes).toBe(12);
    expect(typeof data.order).toBe("number");
  });

  it("parses inline arrays with quoted and unquoted items", () => {
    const raw = `---
roles: [admin, "manager", 'viewer']
tags: [onboarding, basics]
---
x`;
    const { data } = parseFrontmatter(raw);
    expect(data.roles).toEqual(["admin", "manager", "viewer"]);
    expect(data.tags).toEqual(["onboarding", "basics"]);
  });

  it("parses empty arrays", () => {
    const raw = `---
relatedPaths: []
---
x`;
    const { data } = parseFrontmatter(raw);
    expect(data.relatedPaths).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const raw = "---\r\ntitle: Win\r\n---\r\nbody line";
    const { data, body } = parseFrontmatter(raw);
    expect(data.title).toBe("Win");
    expect(body).toBe("body line");
  });

  it("returns empty data and original body when no frontmatter is present", () => {
    const raw = "# Just a heading\n\nSome content";
    const { data, body } = parseFrontmatter(raw);
    expect(data).toEqual({});
    expect(body).toBe(raw);
  });

  it("ignores malformed lines inside the frontmatter block", () => {
    const raw = `---
title: Valid
: orphan colon
not a key value
another: field
---
body`;
    const { data } = parseFrontmatter(raw);
    expect(data.title).toBe("Valid");
    expect(data.another).toBe("field");
  });

  it("preserves body content after a single trailing newline", () => {
    const raw = `---
title: X
---

## Heading

paragraph`;
    const { body } = parseFrontmatter(raw);
    expect(body).toContain("## Heading");
    expect(body).toContain("paragraph");
  });
});

describe("asString", () => {
  it("returns the string when given a string", () => {
    expect(asString("hello")).toBe("hello");
  });

  it("returns fallback for non-string values", () => {
    expect(asString(42, "fallback")).toBe("fallback");
    expect(asString(null, "fallback")).toBe("fallback");
    expect(asString(undefined, "fallback")).toBe("fallback");
    expect(asString([], "fallback")).toBe("fallback");
  });

  it("defaults fallback to empty string", () => {
    expect(asString(123)).toBe("");
  });
});

describe("asNumber", () => {
  it("returns the number when given a number", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(0)).toBe(0);
  });

  it("returns fallback for non-number values", () => {
    expect(asNumber("42", 99)).toBe(99);
    expect(asNumber(null, 99)).toBe(99);
    expect(asNumber(undefined, 99)).toBe(99);
  });

  it("defaults fallback to 0", () => {
    expect(asNumber("not a number")).toBe(0);
  });
});

describe("asStringArray", () => {
  it("returns an array of strings when given an array of strings", () => {
    expect(asStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("filters out non-string entries", () => {
    expect(asStringArray(["a", 1, null, "b", {}, "c"])).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for non-array inputs", () => {
    expect(asStringArray("not an array")).toEqual([]);
    expect(asStringArray(null)).toEqual([]);
    expect(asStringArray(undefined)).toEqual([]);
    expect(asStringArray({})).toEqual([]);
  });
});
