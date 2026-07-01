import { JobChannelRateLimiter } from "./job-channel-rate-limiter";

describe("JobChannelRateLimiter", () => {
  const limits = { maxPerMinute: 100, maxPerDay: 2, minIntervalMs: 0 };

  it("allows up to the daily cap then throws", async () => {
    const rl = new JobChannelRateLimiter();
    await rl.acquire("indeed:7", limits);
    await rl.acquire("indeed:7", limits);
    await expect(rl.acquire("indeed:7", limits)).rejects.toThrow(/daily rate limit/i);
  });

  it("tracks each (channel, company) key independently", async () => {
    const rl = new JobChannelRateLimiter();
    await rl.acquire("indeed:7", limits);
    await rl.acquire("indeed:8", limits);
    expect(rl.dayCount("indeed:7")).toBe(1);
    expect(rl.dayCount("indeed:8")).toBe(1);
  });
});
