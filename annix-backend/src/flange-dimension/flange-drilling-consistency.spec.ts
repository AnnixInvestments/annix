import {
  auditFlangeDrillingConsistency,
  type DrillingAuditRow,
  findImpossibleDrillings,
  numericClassOf,
} from "./flange-drilling-consistency";

const row = (overrides: Partial<DrillingAuditRow>): DrillingAuditRow => ({
  id: 1,
  standardId: 2,
  classDesignation: "1000/3",
  nominalDiameterMm: 450,
  D: 615,
  pcd: 565,
  numHoles: 20,
  d1: 26,
  ...overrides,
});

describe("flange-drilling-consistency", () => {
  describe("numericClassOf", () => {
    it("extracts the table rating from SANS designations", () => {
      expect(numericClassOf("1000/3")).toBe(1000);
      expect(numericClassOf("600/1")).toBe(600);
      expect(numericClassOf("2500/8")).toBe(2500);
    });

    it("extracts PN and Class ratings", () => {
      expect(numericClassOf("PN16")).toBe(16);
      expect(numericClassOf("Class 150")).toBe(150);
    });

    it("returns null when no number is present", () => {
      expect(numericClassOf("")).toBeNull();
      expect(numericClassOf("unknown")).toBeNull();
    });
  });

  describe("auditFlangeDrillingConsistency", () => {
    it("passes a table whose types share drilling", () => {
      const rows = [
        row({ id: 1, classDesignation: "1000/1" }),
        row({ id: 2, classDesignation: "1000/2" }),
        row({ id: 3, classDesignation: "1000/3" }),
        row({ id: 4, classDesignation: "1000/8" }),
      ];
      expect(auditFlangeDrillingConsistency(rows)).toEqual([]);
    });

    it("flags a /1 row carrying the next table's heavier pattern", () => {
      const rows = [
        row({ id: 1, classDesignation: "1000/1", D: 640, pcd: 585, d1: 30 }),
        row({ id: 2, classDesignation: "1000/2" }),
        row({ id: 3, classDesignation: "1000/3" }),
        row({ id: 4, classDesignation: "1000/8" }),
      ];
      const result = auditFlangeDrillingConsistency(rows);
      expect(result).toHaveLength(1);
      expect(result[0].numericClass).toBe(1000);
      expect(result[0].nominalDiameterMm).toBe(450);
      expect(result[0].variants).toHaveLength(2);
      expect(result[0].majority?.rowIds).toEqual([2, 3, 4]);
      expect(result[0].variants.find((v) => v.rowIds.includes(1))?.d1).toBe(30);
    });

    it("reports no majority on an even split", () => {
      const rows = [
        row({ id: 1, classDesignation: "4000/3", pcd: 56 }),
        row({ id: 2, classDesignation: "4000/3", pcd: 65 }),
      ];
      const result = auditFlangeDrillingConsistency(rows);
      expect(result).toHaveLength(1);
      expect(result[0].majority).toBeNull();
    });

    it("never merges groups across standards, classes or DNs", () => {
      const rows = [
        row({ id: 1, classDesignation: "1000/3", nominalDiameterMm: 200, numHoles: 8 }),
        row({ id: 2, classDesignation: "1600/3", nominalDiameterMm: 200, numHoles: 12 }),
        row({
          id: 3,
          standardId: 1,
          classDesignation: "PN10",
          nominalDiameterMm: 200,
          numHoles: 8,
        }),
      ];
      expect(auditFlangeDrillingConsistency(rows)).toEqual([]);
    });
  });

  describe("findImpossibleDrillings", () => {
    it("flags PCD at or beyond the flange OD", () => {
      const bad = row({ id: 9, standardId: 1, classDesignation: "PN10", D: 895, pcd: 935 });
      const result = findImpossibleDrillings([bad, row({})]);
      expect(result).toHaveLength(1);
      expect(result[0].row.id).toBe(9);
      expect(result[0].reason).toContain("bolt circle outside the plate");
    });

    it("flags bolt holes breaking the flange edge", () => {
      const bad = row({ id: 10, D: 600, pcd: 580, d1: 26 });
      const result = findImpossibleDrillings([bad]);
      expect(result).toHaveLength(1);
      expect(result[0].reason).toContain("break the flange edge");
    });

    it("passes sane drilling", () => {
      expect(findImpossibleDrillings([row({})])).toEqual([]);
    });
  });
});
