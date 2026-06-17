import { estimateAiCostUsd, rateForModel } from "./ai-pricing";

describe("ai-pricing", () => {
  it("prices known models by exact name", () => {
    expect(rateForModel("gemini-2.5-flash")).toEqual({
      inputPerMillion: 0.3,
      outputPerMillion: 2.5,
    });
    expect(rateForModel("gemini-2.5-flash-lite")).toEqual({
      inputPerMillion: 0.1,
      outputPerMillion: 0.4,
    });
  });

  it("matches versioned model ids by prefix", () => {
    expect(rateForModel("gemini-2.5-flash-preview-05-20")).toEqual(
      rateForModel("gemini-2.5-flash"),
    );
  });

  it("falls back to flash rates for unknown models so cost is never zero", () => {
    expect(rateForModel("some-future-model")).toEqual(rateForModel("gemini-2.5-flash"));
    expect(rateForModel(null)).toEqual(rateForModel("gemini-2.5-flash"));
  });

  it("computes input+output cost from the split", () => {
    // 1M input @ $0.30 + 1M output @ $2.50 = $2.80
    expect(estimateAiCostUsd("gemini-2.5-flash", 1_000_000, 1_000_000, 2_000_000)).toBeCloseTo(
      2.8,
      5,
    );
  });

  it("bills a total-only call at the output rate (over- not under-states)", () => {
    expect(estimateAiCostUsd("gemini-2.5-flash", null, null, 1_000_000)).toBeCloseTo(2.5, 5);
  });

  it("is zero when there is nothing to bill", () => {
    expect(estimateAiCostUsd("gemini-2.5-flash", 0, 0, 0)).toBe(0);
  });
});
