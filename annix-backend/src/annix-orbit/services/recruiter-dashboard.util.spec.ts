import {
  buildRevenueSeries,
  buildSourceBreakdown,
  computeRange,
  groupConsultants,
  inRange,
  pctChange,
} from "./recruiter-dashboard.util";

describe("recruiter-dashboard.util (issue #362 phase 1)", () => {
  describe("computeRange", () => {
    it("defaults to the last 30 days and a matching prior window", () => {
      const range = computeRange(undefined, undefined, "2026-06-30");
      expect(range.to).toBe("2026-06-30");
      expect(range.from).toBe("2026-06-01");
      expect(range.priorTo).toBe("2026-05-31");
      expect(range.priorFrom).toBe("2026-05-02");
    });

    it("uses an explicit window and an equal-length prior window", () => {
      const range = computeRange("2026-06-01", "2026-06-07", "2026-06-30");
      expect(range.priorTo).toBe("2026-05-31");
      expect(range.priorFrom).toBe("2026-05-25");
    });
  });

  describe("pctChange", () => {
    it("computes percentage change and guards divide-by-zero", () => {
      expect(pctChange(120, 100)).toBe(20);
      expect(pctChange(80, 100)).toBe(-20);
      expect(pctChange(50, 0)).toBeNull();
    });
  });

  describe("inRange", () => {
    it("is inclusive of both ends", () => {
      expect(inRange("2026-06-01", "2026-06-01", "2026-06-30")).toBe(true);
      expect(inRange("2026-06-30", "2026-06-01", "2026-06-30")).toBe(true);
      expect(inRange("2026-05-31", "2026-06-01", "2026-06-30")).toBe(false);
      expect(inRange(null, "2026-06-01", "2026-06-30")).toBe(false);
    });
  });

  describe("buildRevenueSeries", () => {
    it("produces one cumulative point per day and a range total", () => {
      const { series, total } = buildRevenueSeries(
        [
          { createdAt: "2026-06-01", placementFee: 100 },
          { createdAt: "2026-06-03", placementFee: 50 },
          { createdAt: "2026-05-30", placementFee: 999 }, // out of range
        ],
        "2026-06-01",
        "2026-06-03",
      );
      expect(series).toEqual([
        { date: "2026-06-01", amount: 100 },
        { date: "2026-06-02", amount: 100 },
        { date: "2026-06-03", amount: 150 },
      ]);
      expect(total).toBe(150);
    });

    it("tolerates Date createdAt and null fees", () => {
      const { total } = buildRevenueSeries(
        [{ createdAt: new Date("2026-06-02T08:00:00Z"), placementFee: null }],
        "2026-06-01",
        "2026-06-03",
      );
      expect(total).toBe(0);
    });
  });

  describe("buildSourceBreakdown", () => {
    it("counts by source with labels and percentages, defaulting null to database", () => {
      const result = buildSourceBreakdown(["database", "referral", null, "social", "social"]);
      expect(result.total).toBe(5);
      const bySource = Object.fromEntries(result.items.map((i) => [i.source, i.count]));
      expect(bySource.database).toBe(2);
      expect(bySource.referral).toBe(1);
      expect(bySource.social).toBe(2);
      const social = result.items.find((i) => i.source === "social");
      expect(social?.label).toBe("Social Media");
      expect(social?.pct).toBe(40);
    });
  });

  describe("groupConsultants", () => {
    it("groups by consultant, deltas vs prior, sorts by revenue desc", () => {
      const result = groupConsultants(
        [
          { consultantUserId: 1, placementFee: 100 },
          { consultantUserId: 1, placementFee: 50 },
          { consultantUserId: 2, placementFee: 200 },
          { consultantUserId: null, placementFee: 10 },
        ],
        [{ consultantUserId: 1, placementFee: 100 }],
        5,
      );
      expect(result.map((r) => r.userId)).toEqual([2, 1, null]);
      const one = result.find((r) => r.userId === 1);
      expect(one?.placements).toBe(2);
      expect(one?.revenue).toBe(150);
      expect(one?.deltaPct).toBe(50);
      const two = result.find((r) => r.userId === 2);
      expect(two?.deltaPct).toBeNull(); // no prior
    });
  });
});
