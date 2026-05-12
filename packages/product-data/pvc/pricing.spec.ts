import { describe, expect, it } from "vitest";
import { calculatePvcJointCount, standardPvcPipeLengthForDn } from "./pricing";

describe("standardPvcPipeLengthForDn", () => {
  it("returns 6.0 m for the small/medium DN range (20–250)", () => {
    expect(standardPvcPipeLengthForDn(110)).toBe(6.0);
    expect(standardPvcPipeLengthForDn(20)).toBe(6.0);
    expect(standardPvcPipeLengthForDn(250)).toBe(6.0);
  });

  it("returns 5.8 m for the large DN range (315–630)", () => {
    expect(standardPvcPipeLengthForDn(315)).toBe(5.8);
    expect(standardPvcPipeLengthForDn(500)).toBe(5.8);
    expect(standardPvcPipeLengthForDn(630)).toBe(5.8);
  });

  it("falls back to 6.0 m when the DN is outside the configured ranges", () => {
    expect(standardPvcPipeLengthForDn(1000)).toBe(6.0);
  });
});

describe("calculatePvcJointCount", () => {
  it("rounds up partial-pipe orders", () => {
    const result = calculatePvcJointCount(31, 6.0);
    expect(result.pipeLengthsNeeded).toBe(6);
    expect(result.jointCount).toBe(5);
    expect(result.wasteM).toBe(5);
  });

  it("handles a perfectly-divisible length with zero waste", () => {
    const result = calculatePvcJointCount(30, 6.0);
    expect(result.pipeLengthsNeeded).toBe(5);
    expect(result.jointCount).toBe(4);
    expect(result.wasteM).toBe(0);
  });

  it("returns zeros for a non-positive length", () => {
    const result = calculatePvcJointCount(0, 6.0);
    expect(result.pipeLengthsNeeded).toBe(0);
    expect(result.jointCount).toBe(0);
  });
});
