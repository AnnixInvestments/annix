import { describe, expect, it } from "vitest";
import { ANNIX_REP_VERSION } from "./annix-rep-version";
import { FIELDFLOW_VERSION } from "./version";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

describe("version constants", () => {
  it("should have ANNIX_REP_VERSION matching semver pattern", () => {
    expect(ANNIX_REP_VERSION).toMatch(SEMVER_PATTERN);
  });

  it("should have FIELDFLOW_VERSION matching semver pattern", () => {
    expect(FIELDFLOW_VERSION).toMatch(SEMVER_PATTERN);
  });
});
