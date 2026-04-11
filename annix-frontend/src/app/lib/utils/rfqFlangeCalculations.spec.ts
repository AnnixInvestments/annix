import { describe, expect, it } from "vitest";
import { scheduleToFittingClass } from "./rfqFlangeCalculations";

describe("rfqFlangeCalculations", () => {
  describe("scheduleToFittingClass", () => {
    it("returns STD for the canonical STD schedule", () => {
      expect(scheduleToFittingClass("STD")).toBe("STD");
      expect(scheduleToFittingClass("std")).toBe("STD");
    });

    it("returns STD for any schedule containing 40", () => {
      expect(scheduleToFittingClass("40")).toBe("STD");
      expect(scheduleToFittingClass("Sch40")).toBe("STD");
      expect(scheduleToFittingClass("Schedule 40")).toBe("STD");
      expect(scheduleToFittingClass("40S")).toBe("STD");
    });

    it("returns XH for XS/XH/80 schedules", () => {
      expect(scheduleToFittingClass("XS")).toBe("XH");
      expect(scheduleToFittingClass("XH")).toBe("XH");
      expect(scheduleToFittingClass("80")).toBe("XH");
      expect(scheduleToFittingClass("Sch80")).toBe("XH");
      expect(scheduleToFittingClass("xs")).toBe("XH");
    });

    it("returns XXH for XXS/XXH/160 schedules", () => {
      expect(scheduleToFittingClass("XXS")).toBe("XXH");
      expect(scheduleToFittingClass("XXH")).toBe("XXH");
      expect(scheduleToFittingClass("160")).toBe("XXH");
      expect(scheduleToFittingClass("Sch160")).toBe("XXH");
      expect(scheduleToFittingClass("xxs")).toBe("XXH");
    });

    it("prioritises XXH over XH when 160 is present", () => {
      // 160 is XXH; even if "80" appears as a substring of "1080" we still want XXH
      expect(scheduleToFittingClass("160")).toBe("XXH");
    });

    it("returns empty string for unknown schedules", () => {
      expect(scheduleToFittingClass("")).toBe("");
      expect(scheduleToFittingClass("LIGHT")).toBe("");
      expect(scheduleToFittingClass("MEDIUM")).toBe("");
      expect(scheduleToFittingClass("HEAVY")).toBe("");
      expect(scheduleToFittingClass("10")).toBe("");
      expect(scheduleToFittingClass("20")).toBe("");
      // XS-LITE is NOT recognized as XH because the check is exact-match `=== "XS"`,
      // not substring-includes — only literal "XS"/"XH" or "80"-containing schedules count
      expect(scheduleToFittingClass("XS-LITE")).toBe("");
    });
  });
});
