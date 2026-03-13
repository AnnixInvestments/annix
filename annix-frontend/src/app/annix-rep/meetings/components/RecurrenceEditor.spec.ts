import { describe, expect, it } from "vitest";
import type { RecurrenceOptions } from "@/app/lib/api/annixRepApi";
import { defaultRecurrenceOptions, summarizeRecurrence } from "./RecurrenceEditor";

describe("RecurrenceEditor", () => {
  describe("summarizeRecurrence", () => {
    it("should return 'Repeats daily' for daily frequency with interval 1", () => {
      const options: RecurrenceOptions = {
        frequency: "daily",
        interval: 1,
        endType: "never",
      };

      expect(summarizeRecurrence(options)).toBe("Repeats daily");
    });

    it("should return 'Repeats every 2 weeks' for weekly frequency with interval 2", () => {
      const options: RecurrenceOptions = {
        frequency: "weekly",
        interval: 2,
        endType: "never",
      };

      expect(summarizeRecurrence(options)).toBe("Repeats every 2 weeks");
    });

    it("should include weekday names for weekly frequency with byWeekDay", () => {
      const options: RecurrenceOptions = {
        frequency: "weekly",
        interval: 1,
        byWeekDay: [1, 3, 5],
        endType: "never",
      };

      expect(summarizeRecurrence(options)).toBe("Repeats weekly on Mon, Wed, Fri");
    });

    it("should include day number for monthly frequency with byMonthDay", () => {
      const options: RecurrenceOptions = {
        frequency: "monthly",
        interval: 1,
        byMonthDay: 15,
        endType: "never",
      };

      expect(summarizeRecurrence(options)).toBe("Repeats monthly on day 15");
    });

    it("should append count suffix for endType=count", () => {
      const options: RecurrenceOptions = {
        frequency: "daily",
        interval: 1,
        endType: "count",
        count: 10,
      };

      expect(summarizeRecurrence(options)).toBe("Repeats daily, 10 times");
    });

    it("should append until date for endType=until", () => {
      const options: RecurrenceOptions = {
        frequency: "daily",
        interval: 1,
        endType: "until",
        until: "2026-12-31",
      };

      expect(summarizeRecurrence(options)).toBe("Repeats daily, until 2026-12-31");
    });

    it("should return 'Repeats yearly' for yearly frequency with interval 1", () => {
      const options: RecurrenceOptions = {
        frequency: "yearly",
        interval: 1,
        endType: "never",
      };

      expect(summarizeRecurrence(options)).toBe("Repeats yearly");
    });
  });

  describe("defaultRecurrenceOptions", () => {
    it("should return correct default values", () => {
      const defaults = defaultRecurrenceOptions();

      expect(defaults.frequency).toBe("weekly");
      expect(defaults.interval).toBe(1);
      expect(defaults.byWeekDay).toEqual([1, 2, 3, 4, 5]);
      expect(defaults.endType).toBe("never");
    });
  });
});
