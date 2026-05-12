import {
  PVC_CATALOGUE_DNS,
  pipeDimensions,
  pvcAvailableSizes,
  pvcOutsideDiameter,
} from "./dimensions";

describe("PVC pipe dimensions", () => {
  it("returns null when DN is not catalogue-stocked", () => {
    expect(pipeDimensions(48, "PVC-U", 16)).toBeNull();
  });

  it("returns null when class is not valid for the grade", () => {
    expect(pipeDimensions(110, "PVC-U", 34)).toBeNull();
    expect(pipeDimensions(110, "PVC-O", 6)).toBeNull();
  });

  it("returns OD/wall/ID/mass for a valid combination (DN110 PVC-U Class 16)", () => {
    const dims = pipeDimensions(110, "PVC-U", 16);
    expect(dims).not.toBeNull();
    if (!dims) return;
    expect(dims.odMm).toBe(110);
    expect(dims.wallMm).toBe(8.1);
    expect(dims.idMm).toBeCloseTo(93.8, 1);
    expect(dims.massPerMetreKg).toBeGreaterThan(3);
    expect(dims.massPerMetreKg).toBeLessThan(5);
  });

  it("ID always equals OD - 2 × wall", () => {
    const dims = pipeDimensions(160, "PVC-M", 12);
    expect(dims).not.toBeNull();
    if (!dims) return;
    expect(dims.idMm).toBeCloseTo(dims.odMm - 2 * dims.wallMm, 1);
  });

  it("mass scales with density — PVC-M is heavier than PVC-U for identical OD/wall", () => {
    const uClass16 = pipeDimensions(110, "PVC-U", 16);
    const mClass16 = pipeDimensions(110, "PVC-M", 16);
    expect(uClass16).not.toBeNull();
    expect(mClass16).not.toBeNull();
    if (!uClass16 || !mClass16) return;
    expect(mClass16.massPerMetreKg).toBeGreaterThan(uClass16.massPerMetreKg);
  });

  it("pvcAvailableSizes returns the catalogue-stocked DN list for class", () => {
    const sizes = pvcAvailableSizes("PVC-U", 16);
    expect(sizes).toContain(110);
    expect(sizes).toContain(160);
    expect(sizes.length).toBeGreaterThan(5);
  });

  it("pvcAvailableSizes returns [] for invalid grade × class combinations", () => {
    expect(pvcAvailableSizes("PVC-U", 40)).toEqual([]);
    expect(pvcAvailableSizes("PVC-O", 6)).toEqual([]);
  });

  it("pvcOutsideDiameter returns the canonical OD per DN", () => {
    expect(pvcOutsideDiameter(110)).toBe(110);
    expect(pvcOutsideDiameter(250)).toBe(250);
    expect(pvcOutsideDiameter(48)).toBeNull();
  });

  it("PVC_CATALOGUE_DNS includes the staple sizes 50/110/160/250", () => {
    expect(PVC_CATALOGUE_DNS).toEqual(expect.arrayContaining([50, 110, 160, 250]));
  });
});
