import { applyRubberRowFallbacks } from "./rubber-price-list-extraction.service";

describe("applyRubberRowFallbacks", () => {
  it("passes an AU-style row (sg + pricePerKg) through unchanged", () => {
    const row = applyRubberRowFallbacks({
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

  it("maps Chlorobutyl and Bromobutyl to Butyl (AU has no Chemical bonding)", () => {
    const chloro = applyRubberRowFallbacks({
      supplier: "AU",
      productCode: "SC-C60CB",
      compoundType: "Chlorobutyl",
      colour: "Black",
    });
    expect(chloro.bondingType).toBe("Butyl");
    expect(chloro.cureType).toBe("steam");

    const bromo = applyRubberRowFallbacks({
      supplier: "AU",
      productCode: "SC-C50BB",
      compoundType: "Bromobutyl",
      colour: "Black",
    });
    expect(bromo.bondingType).toBe("Butyl");
    expect(bromo.cureType).toBe("steam");
  });

  it("maps a steam-cured Ebonite to Natural (hard natural)", () => {
    const ebonite = applyRubberRowFallbacks({
      supplier: "Rema",
      productCode: "SC295",
      compoundType: "Ebonite",
      colour: "Black",
    });
    expect(ebonite.bondingType).toBe("Natural");
    expect(ebonite.cureType).toBe("steam");
  });

  it("derives bonding from cure: chemical -> Chemical, pre-cured -> Cured", () => {
    const chemical = applyRubberRowFallbacks({
      supplier: "Impilo",
      productCode: "CC40A",
      compoundType: "Natural",
      colour: "Black",
      cureType: "chemical",
    });
    expect(chemical.cureType).toBe("chemical");
    expect(chemical.bondingType).toBe("Chemical");

    const precured = applyRubberRowFallbacks({
      supplier: "Rema",
      productCode: "CR1078",
      compoundType: "Natural",
      colour: "Black",
    });
    expect(precured.cureType).toBe("precured");
    expect(precured.bondingType).toBe("Cured");
  });

  it("captures cureType from the code prefix and the explicit field", () => {
    const steam = applyRubberRowFallbacks({
      supplier: "AU",
      productCode: "SC40A",
      compoundType: "Natural",
      colour: "Black",
    });
    expect(steam.cureType).toBe("steam");
    expect(steam.bondingType).toBe("Natural");
  });
});
