import { applyRubberRowFallbacks } from "./rubber-price-list-extraction.service";

describe("applyRubberRowFallbacks", () => {
  it("passes an AU-style row (sg + pricePerKg) through unchanged", () => {
    const row = applyRubberRowFallbacks({
      family: "plate",
      supplier: "AU",
      productCode: "A38P-BSC",
      compoundType: "Natural",
      colour: "Black",
      shoreHardness: 38,
      specificGravity: 1.04,
      pricePerKg: 98.41,
      rollPrice: 8842.51,
    });
    expect(row.specificGravity).toBe(1.04);
    expect(row.sgSource).toBe("extracted");
    expect(row.costPerKg).toBe(98.41);
    expect(row.costSource).toBe("extracted");
    expect(row.bondingType).toBe("Natural");
  });

  it("derives sg from datasheet then costPerKg from roll for a Rema-style row", () => {
    const row = applyRubberRowFallbacks({
      family: "plate",
      supplier: "Rema",
      productCode: "1078",
      compoundType: "Natural",
      colour: "Black",
      shoreHardness: 38,
      specificGravity: null,
      pricePerKg: null,
      rollPrice: 10700,
    });
    expect(row.sgSource).toBe("datasheet");
    expect(row.specificGravity).toBe(1.01);
    expect(row.costSource).toBe("derived-from-roll");
    expect(row.costPerKg).toBeCloseTo(122.65, 1);
  });

  it("derives costPerKg (~77.2) for an Impilo-style row with sg + rollPrice but no pricePerKg", () => {
    const row = applyRubberRowFallbacks({
      family: "plate",
      supplier: "Impilo",
      productCode: "SC40A",
      compoundType: "Natural",
      colour: "Black",
      shoreHardness: 40,
      specificGravity: 1.13,
      pricePerKg: null,
      rollPrice: 7539,
    });
    expect(row.sgSource).toBe("extracted");
    expect(row.specificGravity).toBe(1.13);
    expect(row.costSource).toBe("derived-from-roll");
    expect(row.costPerKg).toBeCloseTo(77.2, 1);
  });

  it("falls back to a type-based default sg and reports missing cost when nothing resolves", () => {
    const row = applyRubberRowFallbacks({
      family: "plate",
      supplier: "Unknown",
      productCode: "ZZ9999",
      compoundType: "Nitrile",
      colour: "Black",
      shoreHardness: 60,
      specificGravity: null,
      pricePerKg: null,
      rollPrice: null,
    });
    expect(row.sgSource).toBe("default");
    expect(row.specificGravity).toBe(1.21);
    expect(row.costSource).toBe("missing");
    expect(row.costPerKg).toBeNull();
  });

  it("maps chemistry compound types to the engine bonding type", () => {
    const chloro = applyRubberRowFallbacks({
      family: "plate",
      supplier: "Rema",
      productCode: "CO15",
      compoundType: "Chlorobutyl",
      colour: "Black",
    });
    expect(chloro.bondingType).toBe("Chemical");
    const ebonite = applyRubberRowFallbacks({
      family: "plate",
      supplier: "Rema",
      productCode: "CR1078",
      compoundType: "Ebonite",
      colour: "Black",
    });
    expect(ebonite.bondingType).toBe("Chemical");
  });
});
