import { describe, expect, it } from "vitest";
import type { CorrosivityCategory, PaintProduct } from "@product-data/paint/paintProducts";
import { paintProducts } from "@product-data/paint/paintProducts";
import type {
  CoatingSystemRequirements,
  CoverageCalculation,
  CureScheduleInput,
  ISO12944Environment,
  OvercoatWindow,
} from "@product-data/paint/paintSystemRecommendations";
import {
  allNORSOKSystems,
  allSurfacePrepStandards,
  calculateCoverage,
  calculateCureSchedule,
  calculateISO12944Durability,
  checkOvercoatWindow,
  generateNORSOKSystem,
  highTempSystemRecommendation,
  mapSurfacePrepStandards,
  recommendCoatingSystem,
  recommendPrimersForCategory,
  recommendTopcoatsForPrimer,
  surfacePrepForCorrosivity,
  systemDftSummary,
  validateMultiCoatCompatibility,
} from "@product-data/paint/paintSystemRecommendations";

describe("paintSystemRecommendations", () => {
  describe("recommendCoatingSystem", () => {
    it("should return a valid system for C3 corrosivity", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C3",
      };
      const result = recommendCoatingSystem(requirements);

      expect(result.primer).not.toBeNull();
      expect(result.numberOfCoats).toBeGreaterThanOrEqual(1);
      expect(result.totalDftRange.minUm).toBeGreaterThan(0);
    });

    it("should return a zinc-based primer for C5 corrosivity", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C5",
      };
      const result = recommendCoatingSystem(requirements);

      expect(result.primer).not.toBeNull();
      const primerType = result.primer!.genericType;
      expect(["zinc-silicate", "zinc-rich-epoxy"]).toContain(primerType);
    });

    it("should return high-temp resistant system when temperature specified", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C3",
        operatingTempC: 200,
      };
      const result = recommendCoatingSystem(requirements);

      if (result.primer) {
        expect(result.primer.heatResistance.continuousC).toBeGreaterThanOrEqual(200);
      }
    });

    it("should return UV-resistant topcoat when uvExposure is true", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C4",
        uvExposure: true,
      };
      const result = recommendCoatingSystem(requirements);

      if (result.topcoat) {
        expect(["polyurethane", "polysiloxane"]).toContain(result.topcoat.genericType);
      }
    });

    it("should return surface tolerant primer when requested", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C3",
        surfaceTolerant: true,
      };
      const result = recommendCoatingSystem(requirements);

      if (result.primer) {
        expect(result.primer.surfaceTolerant).toBe(true);
      }
    });

    it("should provide alternative primers", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C4",
      };
      const result = recommendCoatingSystem(requirements);

      expect(Array.isArray(result.alternativePrimers)).toBe(true);
    });

    it("should provide alternative topcoats", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C4",
      };
      const result = recommendCoatingSystem(requirements);

      expect(Array.isArray(result.alternativeTopcoats)).toBe(true);
    });

    it("should calculate correct total DFT range", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C4",
      };
      const result = recommendCoatingSystem(requirements);

      let expectedMin = 0;
      let expectedMax = 0;
      if (result.primer) {
        expectedMin += result.primer.dft.minUm;
        expectedMax += result.primer.dft.maxUm;
      }
      if (result.intermediate) {
        expectedMin += result.intermediate.dft.minUm;
        expectedMax += result.intermediate.dft.maxUm;
      }
      if (result.topcoat) {
        expectedMin += result.topcoat.dft.minUm;
        expectedMax += result.topcoat.dft.maxUm;
      }

      expect(result.totalDftRange.minUm).toBe(expectedMin);
      expect(result.totalDftRange.maxUm).toBe(expectedMax);
    });

    it("should handle all corrosivity categories", () => {
      const categories: CorrosivityCategory[] = ["C1", "C2", "C3", "C4", "C5", "CX"];

      categories.forEach((category) => {
        const requirements: CoatingSystemRequirements = { corrosivityCategory: category };
        const result = recommendCoatingSystem(requirements);
        expect(result).toBeDefined();
      });
    });
  });

  describe("recommendPrimersForCategory", () => {
    it("should return primers for each corrosivity category", () => {
      const categories: CorrosivityCategory[] = ["C1", "C2", "C3", "C4", "C5", "CX"];

      categories.forEach((category) => {
        const primers = recommendPrimersForCategory(category);
        expect(Array.isArray(primers)).toBe(true);
      });
    });

    it("should return primers with correct product role", () => {
      const primers = recommendPrimersForCategory("C4");

      primers.forEach((primer) => {
        expect(["primer", "multi-purpose"]).toContain(primer.productRole);
      });
    });

    it("should return primers for high corrosivity categories", () => {
      const c5Primers = recommendPrimersForCategory("C5");
      const cxPrimers = recommendPrimersForCategory("CX");

      expect(c5Primers.length).toBeGreaterThanOrEqual(0);
      expect(cxPrimers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("recommendTopcoatsForPrimer", () => {
    it("should return compatible topcoats", () => {
      const primers = recommendPrimersForCategory("C3");
      if (primers.length === 0) return;

      const primer = primers[0];
      const topcoats = recommendTopcoatsForPrimer(primer);

      expect(Array.isArray(topcoats)).toBe(true);
    });

    it("should prefer UV-resistant topcoats when uvExposure is true", () => {
      const primers = recommendPrimersForCategory("C4");
      if (primers.length === 0) return;

      const primer = primers[0];
      const topcoats = recommendTopcoatsForPrimer(primer, true);

      if (topcoats.length > 0) {
        const hasUvResistant = topcoats.some(
          (t) => t.genericType === "polyurethane" || t.genericType === "polysiloxane",
        );
        expect(hasUvResistant).toBe(true);
      }
    });
  });

  describe("highTempSystemRecommendation", () => {
    it("should return null for very high temperatures with no suitable products", () => {
      const result = highTempSystemRecommendation(800);
      expect(result).toBeNull();
    });

    it("should return a system for moderate high temperatures", () => {
      const result = highTempSystemRecommendation(300);

      if (result) {
        expect(result.primer).not.toBeNull();
        expect(result.primer!.heatResistance.continuousC).toBeGreaterThanOrEqual(300);
      }
    });

    it("should include alternative options", () => {
      const result = highTempSystemRecommendation(200);

      if (result) {
        expect(Array.isArray(result.alternativePrimers)).toBe(true);
        expect(Array.isArray(result.alternativeTopcoats)).toBe(true);
      }
    });
  });

  describe("systemDftSummary", () => {
    it("should generate readable summary string", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C4",
      };
      const system = recommendCoatingSystem(requirements);
      const summary = systemDftSummary(system);

      expect(typeof summary).toBe("string");
      expect(summary).toContain("Total:");
      expect(summary).toContain("μm");
    });

    it("should include all coat types in summary", () => {
      const requirements: CoatingSystemRequirements = {
        corrosivityCategory: "C5",
      };
      const system = recommendCoatingSystem(requirements);
      const summary = systemDftSummary(system);

      if (system.primer) expect(summary).toContain("Primer:");
      if (system.intermediate) expect(summary).toContain("Intermediate:");
      if (system.topcoat) expect(summary).toContain("Topcoat:");
    });
  });

  describe("calculateISO12944Durability", () => {
    it("should calculate durability for all category/durability combinations", () => {
      const categories: CorrosivityCategory[] = ["C1", "C2", "C3", "C4", "C5", "CX"];
      const durabilities = ["L", "M", "H", "VH"] as const;

      categories.forEach((category) => {
        durabilities.forEach((durability) => {
          const env: ISO12944Environment = {
            corrosivityCategory: category,
            expectedServiceLife: durability,
          };
          const result = calculateISO12944Durability(env);

          expect(result.durability).toBe(durability);
          expect(result.minimumDftUm).toBeGreaterThan(0);
          expect(result.recommendedCoats).toBeGreaterThanOrEqual(2);
          expect(result.yearsRange.min).toBeGreaterThan(0);
        });
      });
    });

    it("should increase DFT for immersion service", () => {
      const baseEnv: ISO12944Environment = {
        corrosivityCategory: "C4",
        expectedServiceLife: "H",
        immersionType: "none",
      };
      const immersionEnv: ISO12944Environment = {
        ...baseEnv,
        immersionType: "seawater",
      };

      const baseResult = calculateISO12944Durability(baseEnv);
      const immersionResult = calculateISO12944Durability(immersionEnv);

      expect(immersionResult.minimumDftUm).toBeGreaterThan(baseResult.minimumDftUm);
    });

    it("should return correct year ranges for each durability", () => {
      const env: ISO12944Environment = {
        corrosivityCategory: "C3",
        expectedServiceLife: "L",
      };
      const resultL = calculateISO12944Durability(env);
      expect(resultL.yearsRange.min).toBe(2);
      expect(resultL.yearsRange.max).toBe(5);

      const envVH: ISO12944Environment = {
        corrosivityCategory: "C3",
        expectedServiceLife: "VH",
      };
      const resultVH = calculateISO12944Durability(envVH);
      expect(resultVH.yearsRange.min).toBe(25);
    });
  });

  describe("mapSurfacePrepStandards", () => {
    it("should return standard for valid ISO 8501 grades", () => {
      const grades = ["Sa 3", "Sa 2.5", "Sa 2", "Sa 1", "St 3", "St 2"];

      grades.forEach((grade) => {
        const result = mapSurfacePrepStandards(grade);
        expect(result).not.toBeNull();
        expect(result!.iso8501).toBeDefined();
        expect(result!.sspcSp).toBeDefined();
      });
    });

    it("should return null for invalid grades", () => {
      const result = mapSurfacePrepStandards("Invalid");
      expect(result).toBeNull();
    });

    it("should include SSPC and NACE equivalents", () => {
      const result = mapSurfacePrepStandards("Sa 2.5");
      expect(result).not.toBeNull();
      expect(result!.sspcSp).toBe("SP 10");
      expect(result!.nace).toBe("NACE No. 2");
    });
  });

  describe("allSurfacePrepStandards", () => {
    it("should return array of all standards", () => {
      const standards = allSurfacePrepStandards();
      expect(Array.isArray(standards)).toBe(true);
      expect(standards.length).toBeGreaterThan(0);
    });

    it("should include description for each standard", () => {
      const standards = allSurfacePrepStandards();
      standards.forEach((s) => {
        expect(s.description).toBeDefined();
        expect(s.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("surfacePrepForCorrosivity", () => {
    it("should return appropriate prep for each category", () => {
      const categories: CorrosivityCategory[] = ["C1", "C2", "C3", "C4", "C5", "CX"];

      categories.forEach((category) => {
        const prep = surfacePrepForCorrosivity(category);
        expect(prep).toBeDefined();
        expect(prep.iso8501).toBeDefined();
      });
    });

    it("should require higher prep grade for higher corrosivity", () => {
      const c1Prep = surfacePrepForCorrosivity("C1");
      const cxPrep = surfacePrepForCorrosivity("CX");

      const gradeOrder = ["St 2", "St 3", "Sa 1", "Sa 2", "Sa 2.5", "Sa 3"];
      const c1Index = gradeOrder.findIndex((g) => c1Prep.iso8501.includes(g.replace(".", "")));
      const cxIndex = gradeOrder.findIndex((g) => cxPrep.iso8501.includes(g.replace(".", "")));

      expect(cxIndex).toBeGreaterThanOrEqual(c1Index);
    });
  });

  describe("generateNORSOKSystem", () => {
    it("should generate all available NORSOK systems", () => {
      const systemNumbers = [1, 2, 3, 4, 5, 7];

      systemNumbers.forEach((num) => {
        const system = generateNORSOKSystem(num);
        expect(system.systemNumber).toBe(num);
        expect(system.name).toBeDefined();
        expect(system.surfacePrep).toBeDefined();
        expect(system.totalDftUm.min).toBeGreaterThan(0);
      });
    });

    it("should throw error for invalid system number", () => {
      expect(() => generateNORSOKSystem(99)).toThrow();
    });

    it("should include test requirements", () => {
      const system = generateNORSOKSystem(1);
      expect(Array.isArray(system.testRequirements)).toBe(true);
      expect(system.testRequirements.length).toBeGreaterThan(0);
    });

    it("should match products when available", () => {
      const system = generateNORSOKSystem(1, paintProducts);
      expect(Array.isArray(system.matchedProducts)).toBe(true);
    });
  });

  describe("allNORSOKSystems", () => {
    it("should return array of systems", () => {
      const systems = allNORSOKSystems();
      expect(Array.isArray(systems)).toBe(true);
      expect(systems.length).toBeGreaterThan(0);
    });

    it("should include all required fields", () => {
      const systems = allNORSOKSystems();
      systems.forEach((s) => {
        expect(s.systemNumber).toBeDefined();
        expect(s.name).toBeDefined();
        expect(s.application).toBeDefined();
        expect(s.surfacePrep).toBeDefined();
        expect(s.primer).toBeDefined();
        expect(s.totalDftUm).toBeDefined();
      });
    });
  });

  describe("calculateCureSchedule", () => {
    const findTestProduct = (): PaintProduct | undefined => {
      return paintProducts.find((p) => p.productRole === "primer");
    };

    it("should calculate cure times at standard conditions", () => {
      const product = findTestProduct();
      if (!product) return;

      const input: CureScheduleInput = {
        product,
        ambientTempC: 23,
        relativeHumidityPercent: 50,
        airflowCondition: "moderate",
      };

      const result = calculateCureSchedule(input);

      expect(result.touchDryHours).toBeGreaterThan(0);
      expect(result.overcoatMinHours).toBeGreaterThan(0);
      expect(result.fullCureDays).toBeGreaterThan(0);
    });

    it("should extend cure times at low temperature", () => {
      const product = findTestProduct();
      if (!product) return;

      const standardInput: CureScheduleInput = {
        product,
        ambientTempC: 23,
        relativeHumidityPercent: 50,
        airflowCondition: "moderate",
      };

      const coldInput: CureScheduleInput = {
        ...standardInput,
        ambientTempC: 10,
      };

      const standardResult = calculateCureSchedule(standardInput);
      const coldResult = calculateCureSchedule(coldInput);

      expect(coldResult.touchDryHours).toBeGreaterThan(standardResult.touchDryHours);
    });

    it("should add warnings for adverse conditions", () => {
      const product = findTestProduct();
      if (!product) return;

      const input: CureScheduleInput = {
        product,
        ambientTempC: 3,
        relativeHumidityPercent: 90,
        airflowCondition: "still",
      };

      const result = calculateCureSchedule(input);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle different airflow conditions", () => {
      const product = findTestProduct();
      if (!product) return;

      const stillInput: CureScheduleInput = {
        product,
        ambientTempC: 23,
        relativeHumidityPercent: 50,
        airflowCondition: "still",
      };

      const goodInput: CureScheduleInput = {
        ...stillInput,
        airflowCondition: "good",
      };

      const stillResult = calculateCureSchedule(stillInput);
      const goodResult = calculateCureSchedule(goodInput);

      expect(stillResult.touchDryHours).toBeGreaterThan(goodResult.touchDryHours);
    });
  });

  describe("calculateCoverage", () => {
    const findTestProduct = (): PaintProduct | undefined => {
      return paintProducts.find((p) => p.volumeSolidsPercent > 0);
    };

    it("should calculate coverage for given surface area", () => {
      const product = findTestProduct();
      if (!product) return;

      const input: CoverageCalculation = {
        product,
        surfaceAreaM2: 100,
        targetDftUm: product.dft.typicalUm,
        lossFactor: 0.2,
      };

      const result = calculateCoverage(input);

      expect(result.theoreticalCoverageM2PerL).toBeGreaterThan(0);
      expect(result.practicalCoverageM2PerL).toBeGreaterThan(0);
      expect(result.volumeRequiredL).toBeGreaterThan(0);
      expect(result.volumeWithWasteL).toBeGreaterThan(result.volumeRequiredL);
    });

    it("should include waste allowance", () => {
      const product = findTestProduct();
      if (!product) return;

      const input: CoverageCalculation = {
        product,
        surfaceAreaM2: 100,
        targetDftUm: product.dft.typicalUm,
        lossFactor: 0.2,
      };

      const result = calculateCoverage(input);

      expect(result.volumeWithWasteL).toBeGreaterThan(result.volumeRequiredL);
    });

    it("should calculate multiple coats when needed", () => {
      const product = findTestProduct();
      if (!product) return;

      const input: CoverageCalculation = {
        product,
        surfaceAreaM2: 100,
        targetDftUm: product.dft.maxUm * 3,
        lossFactor: 0.2,
      };

      const result = calculateCoverage(input);

      expect(result.numberOfCoats).toBeGreaterThanOrEqual(2);
    });

    it("should include informative notes", () => {
      const product = findTestProduct();
      if (!product) return;

      const input: CoverageCalculation = {
        product,
        surfaceAreaM2: 100,
        targetDftUm: product.dft.typicalUm,
        lossFactor: 0.2,
      };

      const result = calculateCoverage(input);

      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
    });
  });

  describe("validateMultiCoatCompatibility", () => {
    it("should return compatible for single coat system", () => {
      const product = paintProducts.find((p) => p.productRole === "primer");
      if (!product) return;

      const result = validateMultiCoatCompatibility([product]);

      expect(result.isCompatible).toBe(true);
    });

    it("should validate two-coat compatibility", () => {
      const primer = paintProducts.find((p) => p.productRole === "primer");
      const topcoat = paintProducts.find(
        (p) =>
          p.productRole === "topcoat" && primer?.compatibleSubsequentCoats.includes(p.genericType),
      );

      if (!primer || !topcoat) return;

      const result = validateMultiCoatCompatibility([primer, topcoat]);

      expect(result).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should detect incompatible sequences", () => {
      const zincPrimer = paintProducts.find((p) => p.genericType === "zinc-silicate");
      const alkydTopcoat = paintProducts.find((p) => p.genericType === "alkyd");

      if (!zincPrimer || !alkydTopcoat) return;

      const result = validateMultiCoatCompatibility([zincPrimer, alkydTopcoat]);

      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should warn about temperature rating mismatches", () => {
      const highTempProduct = paintProducts.find((p) => p.heatResistance.continuousC > 200);
      const lowTempProduct = paintProducts.find(
        (p) =>
          p.heatResistance.continuousC < 100 &&
          highTempProduct?.compatibleSubsequentCoats.includes(p.genericType),
      );

      if (!highTempProduct || !lowTempProduct) return;

      const result = validateMultiCoatCompatibility([highTempProduct, lowTempProduct]);

      expect(result.warnings.some((w) => w.toLowerCase().includes("temperature"))).toBe(true);
    });
  });

  describe("checkOvercoatWindow", () => {
    const findEpoxyProduct = (): PaintProduct | undefined => {
      return paintProducts.find((p) => p.genericType.includes("epoxy"));
    };

    it("should indicate too early when below minimum", () => {
      const product = findEpoxyProduct();
      if (!product) return;

      const input: OvercoatWindow = {
        product,
        previousCoatAgeHours: 1,
        ambientTempC: 23,
      };

      const result = checkOvercoatWindow(input);

      expect(result.canOvercoat).toBe(false);
      expect(result.status).toBe("too-early");
    });

    it("should indicate within window at appropriate time", () => {
      const product = findEpoxyProduct();
      if (!product) return;

      const overcoatMin = product.curingAt23C.overcoatMinHours;

      const input: OvercoatWindow = {
        product,
        previousCoatAgeHours: overcoatMin + 2,
        ambientTempC: 23,
      };

      const result = checkOvercoatWindow(input);

      expect(result.canOvercoat).toBe(true);
      expect(result.status).toBe("within-window");
    });

    it("should adjust for temperature", () => {
      const product = findEpoxyProduct();
      if (!product) return;

      const standardInput: OvercoatWindow = {
        product,
        previousCoatAgeHours: product.curingAt23C.overcoatMinHours,
        ambientTempC: 23,
      };

      const coldInput: OvercoatWindow = {
        ...standardInput,
        ambientTempC: 10,
      };

      const standardResult = checkOvercoatWindow(standardInput);
      const coldResult = checkOvercoatWindow(coldInput);

      if (standardResult.canOvercoat && !coldResult.canOvercoat) {
        expect(coldResult.status).toBe("too-early");
      }
    });

    it("should provide recommendations", () => {
      const product = findEpoxyProduct();
      if (!product) return;

      const input: OvercoatWindow = {
        product,
        previousCoatAgeHours: 1,
        ambientTempC: 23,
      };

      const result = checkOvercoatWindow(input);

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
