import { interpolatePTRating, selectRequiredClass } from "./b16-pt-ratings";

describe("interpolatePTRating", () => {
  it("returns exact match at 38C for Group 1.1 Class 150", () => {
    const result = interpolatePTRating("150", "1.1", 38);
    expect(result?.isExact).toBe(true);
    expect(result?.pressureBar).toBe(19.6);
  });

  it("interpolates between two table rows for Group 1.1 Class 300", () => {
    const result = interpolatePTRating("300", "1.1", 125);
    expect(result?.isExact).toBe(false);
    expect(result?.pressureBar).toBeGreaterThan(45.1);
    expect(result?.pressureBar).toBeLessThan(46.6);
  });

  it("returns minimum value when temperature below table range for Group 1.1", () => {
    const result = interpolatePTRating("150", "1.1", -50);
    expect(result?.pressureBar).toBe(19.6);
    expect(result?.notes).toContain("below table minimum");
  });

  it("returns 0 when temperature above table maximum for Group 1.1", () => {
    const result = interpolatePTRating("150", "1.1", 700);
    expect(result?.pressureBar).toBe(0);
  });

  it("returns rating for Group 2.1 stainless", () => {
    const result = interpolatePTRating("300", "2.1", 38);
    expect(result?.pressureBar).toBe(49.6);
  });

  it("returns rating for Group 3.3 super duplex", () => {
    const result = interpolatePTRating("150", "3.3", 38);
    expect(result?.pressureBar).toBe(19.6);
  });

  it("returns null for unknown material group", () => {
    expect(interpolatePTRating("150", "99.99", 38)).toBeNull();
  });
});

describe("selectRequiredClass", () => {
  it("selects the lowest class that satisfies the design pressure", () => {
    const result = selectRequiredClass(15, 100, "1.1");
    expect(result?.requiredClass).toBe("150");
    expect(result?.marginPercent).toBeGreaterThan(0);
  });

  it("escalates to higher class when design pressure exceeds Class 150 rating", () => {
    const result = selectRequiredClass(30, 200, "1.1");
    expect(result?.requiredClass).not.toBe("150");
  });
});
