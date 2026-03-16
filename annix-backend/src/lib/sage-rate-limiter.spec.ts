import { SAGE_RATE_LIMITS, SageRateLimiter } from "./sage-rate-limiter";

describe("SageRateLimiter", () => {
  describe("DLA rate limit constants", () => {
    it("should enforce 100 requests per minute per company (DLA 12.4.1)", () => {
      expect(SAGE_RATE_LIMITS.MAX_PER_MINUTE).toBe(100);
    });

    it("should enforce 2500 requests per day per company (DLA 12.4.2)", () => {
      expect(SAGE_RATE_LIMITS.MAX_PER_DAY).toBe(2500);
    });

    it("should enforce minimum 1 second between requests (DLA 12.4.1)", () => {
      expect(SAGE_RATE_LIMITS.MIN_INTERVAL_MS).toBe(1000);
    });
  });

  describe("per-company isolation", () => {
    it("should track limits independently per company", async () => {
      const limiter = new SageRateLimiter();

      await limiter.waitForSlot("company-A");
      await limiter.waitForSlot("company-A");

      expect(limiter.minuteCount("company-A")).toBe(2);
      expect(limiter.minuteCount("company-B")).toBe(0);
    });
  });

  describe("minute window tracking", () => {
    it("should record requests in the per-minute bucket", async () => {
      const limiter = new SageRateLimiter();

      await limiter.waitForSlot("test-co");
      await limiter.waitForSlot("test-co");
      await limiter.waitForSlot("test-co");

      expect(limiter.minuteCount("test-co")).toBe(3);
    });
  });

  describe("day window tracking", () => {
    it("should record requests in the per-day bucket", async () => {
      const limiter = new SageRateLimiter();

      await limiter.waitForSlot("test-co");
      await limiter.waitForSlot("test-co");

      expect(limiter.dayCount("test-co")).toBe(2);
    });
  });

  describe("daily limit rejection (DLA 12.4.2)", () => {
    it("should throw when daily limit is exceeded", async () => {
      const limiter = new SageRateLimiter();

      const bucket = (limiter as any).bucket("maxed-co");
      const baseTime = Date.now();
      bucket.dayTimestamps = Array.from({ length: 2500 }, (_, i) => baseTime - i * 30_000);
      bucket.minuteTimestamps = [];
      bucket.lastRequestMs = baseTime;

      await expect(limiter.waitForSlot("maxed-co")).rejects.toThrow(/daily rate limit exceeded/i);
    });
  });

  describe("returns zero for unknown company", () => {
    it("should return 0 for minute count of unknown company", () => {
      const limiter = new SageRateLimiter();
      expect(limiter.minuteCount("unknown")).toBe(0);
    });

    it("should return 0 for day count of unknown company", () => {
      const limiter = new SageRateLimiter();
      expect(limiter.dayCount("unknown")).toBe(0);
    });
  });
});
