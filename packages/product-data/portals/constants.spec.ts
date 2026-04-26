import { describe, expect, it } from "vitest";
import {
  canonicalHostFor,
  corsOriginsFor,
  isAliasHost,
  normaliseHost,
  PORTAL_HOSTS,
  type PortalCode,
  portalForCode,
  portalForHost,
} from "./constants";

describe("normaliseHost", () => {
  it("strips port and lowercases", () => {
    expect(normaliseHost("Admin.Localhost:3000")).toBe("admin.localhost");
  });
});

describe("portalForHost", () => {
  it("matches a dev host with port", () => {
    expect(portalForHost("aurubber.localhost:3000")?.code).toBe("au-rubber");
  });

  it("matches a production host", () => {
    expect(portalForHost("admin.annix.co.za")?.code).toBe("admin");
  });

  it("matches a www alias to the canonical portal", () => {
    expect(portalForHost("www.auind.co.za")?.code).toBe("au-industries");
  });

  it("returns null for unknown hosts", () => {
    expect(portalForHost("example.com")).toBeNull();
  });

  it("returns null for null/empty input", () => {
    expect(portalForHost(null)).toBeNull();
    expect(portalForHost("")).toBeNull();
  });

  it("matches plain localhost to marketing", () => {
    expect(portalForHost("localhost:3000")?.code).toBe("marketing");
  });
});

describe("portalForCode", () => {
  it("looks up by code", () => {
    expect(portalForCode("stock-control").prodHost).toBe("stockcontrol.annix.co.za");
  });

  it("throws for unknown codes", () => {
    expect(() => portalForCode("nope" as unknown as PortalCode)).toThrow();
  });
});

describe("isAliasHost", () => {
  it("recognises www aliases", () => {
    expect(isAliasHost("www.aurubber.co.za")).toBe(true);
  });

  it("returns false for canonical hosts", () => {
    expect(isAliasHost("aurubber.co.za")).toBe(false);
    expect(isAliasHost("admin.annix.co.za")).toBe(false);
  });
});

describe("canonicalHostFor", () => {
  it("returns the canonical prodHost for an alias", () => {
    expect(canonicalHostFor("www.auind.co.za")).toBe("auind.co.za");
  });

  it("returns the canonical prodHost when given the dev host", () => {
    expect(canonicalHostFor("admin.localhost:3000")).toBe("admin.annix.co.za");
  });
});

describe("corsOriginsFor", () => {
  it("includes every dev host on default port 3000", () => {
    const origins = corsOriginsFor("dev");
    expect(origins).toContain("http://admin.localhost:3000");
    expect(origins).toContain("http://aurubber.localhost:3000");
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toHaveLength(PORTAL_HOSTS.length);
  });

  it("includes every prod host plus aliases for prod", () => {
    const origins = corsOriginsFor("prod");
    expect(origins).toContain("https://admin.annix.co.za");
    expect(origins).toContain("https://aurubber.co.za");
    expect(origins).toContain("https://www.aurubber.co.za");
    expect(origins).not.toContain(expect.stringContaining("localhost"));
  });

  it("includes both dev and prod when env is 'all'", () => {
    const origins = corsOriginsFor("all");
    expect(origins).toContain("http://admin.localhost:3000");
    expect(origins).toContain("https://admin.annix.co.za");
  });
});
