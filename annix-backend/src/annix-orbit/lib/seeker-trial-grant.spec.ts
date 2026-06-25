import { BadRequestException } from "@nestjs/common";
import { assertTrialDaysWithinCeiling, clampTrialDays, MAX_TRIAL_DAYS } from "./seeker-trial-grant";

describe("seeker-trial-grant (issue #398 finding 8)", () => {
  describe("clampTrialDays", () => {
    it("passes a value at or below the ceiling unchanged", () => {
      expect(clampTrialDays(7)).toBe(7);
      expect(clampTrialDays(MAX_TRIAL_DAYS)).toBe(MAX_TRIAL_DAYS);
    });

    it("clamps anything above the ceiling to the ceiling", () => {
      expect(clampTrialDays(31)).toBe(MAX_TRIAL_DAYS);
      expect(clampTrialDays(365)).toBe(MAX_TRIAL_DAYS);
    });

    it("preserves null (permanent grants carry no trial length)", () => {
      expect(clampTrialDays(null)).toBeNull();
    });

    it("rejects non-positive and non-integer values", () => {
      expect(() => clampTrialDays(0)).toThrow(BadRequestException);
      expect(() => clampTrialDays(-5)).toThrow(BadRequestException);
      expect(() => clampTrialDays(1.5)).toThrow(BadRequestException);
      expect(() => clampTrialDays(Number.NaN)).toThrow(BadRequestException);
    });
  });

  describe("assertTrialDaysWithinCeiling", () => {
    it("accepts a positive whole number within the ceiling", () => {
      expect(assertTrialDaysWithinCeiling(14)).toBe(14);
      expect(assertTrialDaysWithinCeiling(MAX_TRIAL_DAYS)).toBe(MAX_TRIAL_DAYS);
    });

    it("rejects a value above the ceiling rather than clamping", () => {
      expect(() => assertTrialDaysWithinCeiling(MAX_TRIAL_DAYS + 1)).toThrow(BadRequestException);
    });

    it("rejects non-positive and non-integer values", () => {
      expect(() => assertTrialDaysWithinCeiling(0)).toThrow(BadRequestException);
      expect(() => assertTrialDaysWithinCeiling(-1)).toThrow(BadRequestException);
      expect(() => assertTrialDaysWithinCeiling(2.5)).toThrow(BadRequestException);
    });
  });
});
