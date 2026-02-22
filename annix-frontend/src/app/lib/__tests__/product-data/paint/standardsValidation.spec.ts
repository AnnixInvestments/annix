import { describe, expect, it } from "vitest";
import type { CorrosivityCategory, GenericType } from "@product-data/paint/paintProducts";
import type {
  ISO12944Part2Environment,
  ISO12944Part3Design,
  ISO12944Part4Surface,
  ISO12944Part5System,
  ISO12944Part6TestResult,
  ISO12944Part7Execution,
  ISO12944Part8NewWork,
  ISO12944Part9Maintenance,
} from "@product-data/paint/standardsValidation";
import {
  allASNZS2312Systems,
  allASNZS4680Grades,
  allASTMStandards,
  allPotableWaterStandards,
  allVOCLimits,
  astmEquivalentForTest,
  astmStandardsByCategory,
  calculateFireProtectionDft,
  checkCathodicProtectionCompatibility,
  checkFoodContactSuitability,
  checkVOCCompliance,
  findRelatedASTM,
  foodContactComplianceForRegion,
  potableWaterStandardsForRegion,
  recommendASNZS2312System,
  recommendASNZS4680Grade,
  recommendCPCompatibleCoatings,
  recommendISO8501Grade,
  recommendLowVOCAlternatives,
  validateFireProtectionSystem,
  validateGalvanizingThickness,
  validateISO8501Grade,
  validateISO12944Part1Scope,
  validateISO12944Part2,
  validateISO12944Part3,
  validateISO12944Part4,
  validateISO12944Part5,
  validateISO12944Part6Tests,
  validateISO12944Part7,
  validateISO12944Part8,
  validateISO12944Part9,
  validatePotableWaterCompliance,
  vocLimitsForRegion,
} from "@product-data/paint/standardsValidation";

describe("standardsValidation", () => {
  describe("ISO 12944 Validation", () => {
    describe("validateISO12944Part1Scope", () => {
      it("should confirm applicability for all structure types", () => {
        const structureTypes = [
          "building-external",
          "bridge",
          "tank-external",
          "offshore-structure",
        ] as const;

        structureTypes.forEach((structureType) => {
          const result = validateISO12944Part1Scope(structureType, "C4");
          expect(result.applicable).toBe(true);
          expect(result.notes.length).toBeGreaterThan(0);
        });
      });

      it("should warn about corrosivity mismatch for offshore structures", () => {
        const result = validateISO12944Part1Scope("offshore-structure", "C3");
        expect(result.notes.some((n) => n.includes("Warning"))).toBe(true);
      });

      it("should not warn when offshore structure has C5 or CX", () => {
        const resultC5 = validateISO12944Part1Scope("offshore-structure", "C5");
        const resultCX = validateISO12944Part1Scope("offshore-structure", "CX");

        expect(resultC5.notes.some((n) => n.includes("Warning"))).toBe(false);
        expect(resultCX.notes.some((n) => n.includes("Warning"))).toBe(false);
      });
    });

    describe("validateISO12944Part2", () => {
      it("should validate standard atmospheric environment", () => {
        const env: ISO12944Part2Environment = {
          atmosphericCategory: "C3",
          temperatureRange: { minC: -10, maxC: 40 },
          humidityConditions: "dry",
          uvExposure: "moderate",
        };

        const result = validateISO12944Part2(env);
        expect(result.category).toBe("C3");
      });

      it("should flag high temperature requiring CX", () => {
        const env: ISO12944Part2Environment = {
          atmosphericCategory: "C4",
          temperatureRange: { minC: 0, maxC: 150 },
          humidityConditions: "dry",
          uvExposure: "moderate",
        };

        const result = validateISO12944Part2(env);
        expect(result.issues.some((i) => i.includes("temperature"))).toBe(true);
      });

      it("should flag condensing conditions with low category", () => {
        const env: ISO12944Part2Environment = {
          atmosphericCategory: "C2",
          temperatureRange: { minC: 0, maxC: 40 },
          humidityConditions: "condensing",
          uvExposure: "low",
        };

        const result = validateISO12944Part2(env);
        expect(result.issues.some((i) => i.includes("ondensing"))).toBe(true);
      });

      it("should include immersion requirements when specified", () => {
        const env: ISO12944Part2Environment = {
          atmosphericCategory: "C5",
          immersionCategory: "Im2",
          temperatureRange: { minC: 0, maxC: 30 },
          humidityConditions: "wet",
          uvExposure: "low",
        };

        const result = validateISO12944Part2(env);
        expect(result.issues.some((i) => i.includes("mmersion"))).toBe(true);
      });
    });

    describe("validateISO12944Part3", () => {
      it("should return full score for good design", () => {
        const design: ISO12944Part3Design = {
          accessForMaintenance: "good",
          edgeTreatment: "rounded",
          drainageProvision: true,
          weldQuality: "ground-smooth",
          boltedConnections: false,
          ventilationAdequate: true,
        };

        const result = validateISO12944Part3(design);
        expect(result.score).toBe(100);
        expect(result.issues.length).toBe(0);
      });

      it("should deduct score for poor design elements", () => {
        const design: ISO12944Part3Design = {
          accessForMaintenance: "none",
          edgeTreatment: "sharp",
          drainageProvision: false,
          weldQuality: "rough",
          boltedConnections: true,
          ventilationAdequate: false,
        };

        const result = validateISO12944Part3(design);
        expect(result.score).toBeLessThan(100);
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.recommendations.length).toBeGreaterThan(0);
      });

      it("should provide specific recommendations for sharp edges", () => {
        const design: ISO12944Part3Design = {
          accessForMaintenance: "good",
          edgeTreatment: "sharp",
          drainageProvision: true,
          weldQuality: "ground-smooth",
          boltedConnections: false,
          ventilationAdequate: true,
        };

        const result = validateISO12944Part3(design);
        expect(result.recommendations.some((r) => r.includes("edge") || r.includes("radius"))).toBe(
          true,
        );
      });
    });

    describe("validateISO12944Part4", () => {
      it("should identify prep requirements for new steel", () => {
        const surface: ISO12944Part4Surface = {
          steelGrade: "carbon-steel",
          initialCondition: "A",
          millScalePresent: true,
        };

        const result = validateISO12944Part4(surface, "Sa 2.5");
        expect(result.achievable).toBe(true);
        expect(result.prepRequirements.length).toBeGreaterThan(0);
      });

      it("should handle galvanized steel requirements", () => {
        const surface: ISO12944Part4Surface = {
          steelGrade: "galvanized",
          initialCondition: "A",
          millScalePresent: false,
        };

        const result = validateISO12944Part4(surface, "Be");
        expect(result.prepRequirements.some((r) => r.includes("galvanized"))).toBe(true);
      });

      it("should flag existing coating removal needs", () => {
        const surface: ISO12944Part4Surface = {
          steelGrade: "carbon-steel",
          initialCondition: "C",
          millScalePresent: false,
          existingCoating: {
            type: "alkyd",
            condition: "poor",
            adhesion: "poor",
          },
        };

        const result = validateISO12944Part4(surface, "Sa 2.5");
        expect(result.prepRequirements.some((r) => r.includes("Remove"))).toBe(true);
      });

      it("should handle weathering steel", () => {
        const surface: ISO12944Part4Surface = {
          steelGrade: "weathering-steel",
          initialCondition: "C",
          millScalePresent: false,
        };

        const result = validateISO12944Part4(surface, "St 3");
        expect(result.prepRequirements.some((r) => r.includes("patina"))).toBe(true);
      });
    });

    describe("validateISO12944Part5", () => {
      it("should validate compliant system", () => {
        const system: ISO12944Part5System = {
          primerType: "zinc-rich-epoxy",
          intermediateType: "epoxy",
          topcoatType: "polyurethane",
          totalNominalDftUm: 350,
          numberOfCoats: 3,
        };

        const result = validateISO12944Part5(system, "C4", "H");
        expect(result.compliant).toBe(true);
        expect(result.issues.length).toBe(0);
      });

      it("should flag insufficient DFT", () => {
        const system: ISO12944Part5System = {
          primerType: "epoxy",
          topcoatType: "polyurethane",
          totalNominalDftUm: 100,
          numberOfCoats: 2,
        };

        const result = validateISO12944Part5(system, "C5", "H");
        expect(result.compliant).toBe(false);
        expect(result.issues.some((i) => i.includes("DFT"))).toBe(true);
      });

      it("should recommend zinc primer for high corrosivity", () => {
        const system: ISO12944Part5System = {
          primerType: "epoxy",
          totalNominalDftUm: 400,
          numberOfCoats: 3,
        };

        const result = validateISO12944Part5(system, "C5", "H");
        expect(result.issues.some((i) => i.includes("Zinc"))).toBe(true);
      });

      it("should flag insufficient coat count", () => {
        const system: ISO12944Part5System = {
          primerType: "zinc-rich-epoxy",
          totalNominalDftUm: 400,
          numberOfCoats: 1,
        };

        const result = validateISO12944Part5(system, "C5", "H");
        expect(result.issues.some((i) => i.includes("coat"))).toBe(true);
      });
    });

    describe("validateISO12944Part6Tests", () => {
      it("should pass when all tests pass", () => {
        const tests: ISO12944Part6TestResult[] = [
          { testMethod: "ISO 2409 - Cross-cut adhesion", result: "pass" },
          { testMethod: "ISO 4624 - Pull-off adhesion", result: "pass", value: 8.5 },
          { testMethod: "ISO 9227 - Salt spray resistance", result: "pass" },
        ];

        const result = validateISO12944Part6Tests(tests);
        expect(result.allPassed).toBe(true);
      });

      it("should fail when any test fails", () => {
        const tests: ISO12944Part6TestResult[] = [
          { testMethod: "ISO 2409 - Cross-cut adhesion", result: "pass" },
          { testMethod: "ISO 4624 - Pull-off adhesion", result: "fail", value: 2.1 },
        ];

        const result = validateISO12944Part6Tests(tests);
        expect(result.allPassed).toBe(false);
        expect(result.summary.some((s) => s.includes("FAIL"))).toBe(true);
      });

      it("should provide summary for all tests", () => {
        const tests: ISO12944Part6TestResult[] = [
          { testMethod: "Test 1", result: "pass" },
          { testMethod: "Test 2", result: "fail" },
        ];

        const result = validateISO12944Part6Tests(tests);
        expect(result.summary.length).toBeGreaterThan(0);
      });
    });

    describe("validateISO12944Part7", () => {
      it("should accept good conditions", () => {
        const execution: ISO12944Part7Execution = {
          surfacePrepGrade: "Sa 2.5",
          ambientConditions: {
            temperatureC: 20,
            relativeHumidityPercent: 60,
            dewPointC: 12,
            steelTempC: 22,
          },
          applicationMethod: "airless-spray",
          coatThicknessControl: true,
          cureTimeRespected: true,
        };

        const result = validateISO12944Part7(execution);
        expect(result.acceptable).toBe(true);
        expect(result.issues.length).toBe(0);
      });

      it("should reject low temperature", () => {
        const execution: ISO12944Part7Execution = {
          surfacePrepGrade: "Sa 2.5",
          ambientConditions: {
            temperatureC: 3,
            relativeHumidityPercent: 50,
            dewPointC: -5,
            steelTempC: 4,
          },
          applicationMethod: "brush",
          coatThicknessControl: true,
          cureTimeRespected: true,
        };

        const result = validateISO12944Part7(execution);
        expect(result.acceptable).toBe(false);
        expect(result.issues.some((i) => i.includes("emperature"))).toBe(true);
      });

      it("should reject high humidity", () => {
        const execution: ISO12944Part7Execution = {
          surfacePrepGrade: "Sa 2.5",
          ambientConditions: {
            temperatureC: 20,
            relativeHumidityPercent: 90,
            dewPointC: 18,
            steelTempC: 21,
          },
          applicationMethod: "airless-spray",
          coatThicknessControl: true,
          cureTimeRespected: true,
        };

        const result = validateISO12944Part7(execution);
        expect(result.acceptable).toBe(false);
        expect(result.issues.some((i) => i.includes("humidity"))).toBe(true);
      });

      it("should flag steel temp too close to dew point", () => {
        const execution: ISO12944Part7Execution = {
          surfacePrepGrade: "Sa 2.5",
          ambientConditions: {
            temperatureC: 20,
            relativeHumidityPercent: 70,
            dewPointC: 19,
            steelTempC: 20,
          },
          applicationMethod: "airless-spray",
          coatThicknessControl: true,
          cureTimeRespected: true,
        };

        const result = validateISO12944Part7(execution);
        expect(result.issues.some((i) => i.includes("dew point"))).toBe(true);
      });
    });

    describe("validateISO12944Part8", () => {
      it("should accept adequate warranty for durability", () => {
        const newWork: ISO12944Part8NewWork = {
          specificationNumber: "SPEC-001",
          systemReference: "System A",
          warrantyYears: 15,
          inspectionLevel: "comprehensive",
        };

        const result = validateISO12944Part8(newWork, "H");
        expect(result.adequate).toBe(true);
      });

      it("should flag inadequate warranty", () => {
        const newWork: ISO12944Part8NewWork = {
          specificationNumber: "SPEC-001",
          systemReference: "System A",
          warrantyYears: 5,
          inspectionLevel: "basic",
        };

        const result = validateISO12944Part8(newWork, "VH");
        expect(result.recommendations.length).toBeGreaterThan(0);
      });

      it("should recommend comprehensive inspection for high durability", () => {
        const newWork: ISO12944Part8NewWork = {
          specificationNumber: "SPEC-001",
          systemReference: "System A",
          warrantyYears: 25,
          inspectionLevel: "basic",
        };

        const result = validateISO12944Part8(newWork, "VH");
        expect(result.recommendations.some((r) => r.includes("inspection"))).toBe(true);
      });
    });

    describe("validateISO12944Part9", () => {
      it("should identify maintenance needs by rust grade", () => {
        const grades = ["Ri0", "Ri1", "Ri2", "Ri3", "Ri4", "Ri5"] as const;

        grades.forEach((grade) => {
          const maintenance: ISO12944Part9Maintenance = {
            currentCondition: grade,
            repairStrategy: "spot-repair",
            compatibilityChecked: true,
          };

          const result = validateISO12944Part9(maintenance);
          expect(result.actionRequired).toBeDefined();
          expect(result.repairScope).toBeDefined();
        });
      });

      it("should require compatibility check for overcoating", () => {
        const maintenance: ISO12944Part9Maintenance = {
          currentCondition: "Ri2",
          repairStrategy: "overcoat",
          compatibilityChecked: false,
        };

        const result = validateISO12944Part9(maintenance);
        expect(result.compatibilityNotes.some((n) => n.includes("ompatibility"))).toBe(true);
      });

      it("should warn spot repair insufficient for severe rust", () => {
        const maintenance: ISO12944Part9Maintenance = {
          currentCondition: "Ri5",
          repairStrategy: "spot-repair",
          compatibilityChecked: true,
        };

        const result = validateISO12944Part9(maintenance);
        expect(result.compatibilityNotes.some((n) => n.includes("insufficient"))).toBe(true);
      });
    });
  });

  describe("ISO 8501 Validation", () => {
    describe("validateISO8501Grade", () => {
      it("should validate all standard grades", () => {
        const grades = ["Sa 3", "Sa 2.5", "Sa 2", "Sa 1", "St 3", "St 2"];

        grades.forEach((grade) => {
          const result = validateISO8501Grade(grade, "C3");
          expect(result.grade).toBe(grade);
          expect(result.description).toBeDefined();
        });
      });

      it("should return invalid for unknown grade", () => {
        const result = validateISO8501Grade("Invalid", "C3");
        expect(result.isValid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });

      it("should flag insufficient grade for corrosivity", () => {
        const result = validateISO8501Grade("St 2", "C5");
        expect(result.isValid).toBe(false);
        expect(result.issues.some((i) => i.includes("insufficient"))).toBe(true);
      });

      it("should require Sa 2.5+ for zinc coatings", () => {
        const result = validateISO8501Grade("Sa 2", "C4", "zinc-silicate");
        expect(result.isValid).toBe(false);
        expect(result.issues.some((i) => i.includes("Zinc"))).toBe(true);
      });

      it("should include SSPC and NACE equivalents", () => {
        const result = validateISO8501Grade("Sa 2.5", "C4");
        expect(result.sspcEquivalent).toBe("SP 10");
        expect(result.naceEquivalent).toBe("NACE No. 2");
      });

      it("should include surface profile requirements", () => {
        const result = validateISO8501Grade("Sa 2.5", "C4");
        expect(result.surfaceProfile.minUm).toBeGreaterThan(0);
        expect(result.surfaceProfile.maxUm).toBeGreaterThan(result.surfaceProfile.minUm);
      });
    });

    describe("recommendISO8501Grade", () => {
      it("should recommend appropriate grade for each corrosivity", () => {
        const categories: CorrosivityCategory[] = ["C1", "C2", "C3", "C4", "C5", "CX"];

        categories.forEach((category) => {
          const result = recommendISO8501Grade(category, "epoxy");
          expect(result.recommended).toBeDefined();
          expect(result.alternatives.length).toBeGreaterThan(0);
          expect(result.rationale).toBeDefined();
        });
      });

      it("should recommend Sa 2.5+ for zinc coatings", () => {
        const result = recommendISO8501Grade("C3", "zinc-silicate");
        expect(["Sa 2.5", "Sa 3"]).toContain(result.recommended);
      });
    });
  });

  describe("AS/NZS 2312.1 Systems", () => {
    describe("allASNZS2312Systems", () => {
      it("should return all defined systems", () => {
        const systems = allASNZS2312Systems();
        expect(systems.length).toBeGreaterThan(0);
      });

      it("should include complete system information", () => {
        const systems = allASNZS2312Systems();
        systems.forEach((s) => {
          expect(s.systemCode).toBeDefined();
          expect(s.description).toBeDefined();
          expect(s.components.length).toBeGreaterThan(0);
          expect(s.totalDftUm).toBeGreaterThan(0);
          expect(s.durabilityCategory).toBeDefined();
          expect(s.suitableEnvironments.length).toBeGreaterThan(0);
        });
      });
    });

    describe("recommendASNZS2312System", () => {
      it("should recommend systems for marine environment", () => {
        const systems = recommendASNZS2312System("marine", "high");
        expect(systems.length).toBeGreaterThan(0);
        systems.forEach((s) => {
          expect(s.suitableEnvironments.some((e) => e.toLowerCase().includes("marine"))).toBe(true);
        });
      });

      it("should filter by durability requirement", () => {
        const highDurability = recommendASNZS2312System("industrial", "very-high");
        highDurability.forEach((s) => {
          expect(["high", "very-high"]).toContain(s.durabilityCategory);
        });
      });
    });
  });

  describe("AS/NZS 4680 Galvanizing", () => {
    describe("allASNZS4680Grades", () => {
      it("should return all galvanizing grades", () => {
        const grades = allASNZS4680Grades();
        expect(grades.length).toBeGreaterThan(0);
        expect(grades.some((g) => g.gradeCode === "Z275")).toBe(true);
      });

      it("should include life expectancy data", () => {
        const grades = allASNZS4680Grades();
        grades.forEach((g) => {
          expect(g.lifeExpectancyYears.rural).toBeGreaterThan(0);
          expect(g.lifeExpectancyYears.industrial).toBeGreaterThan(0);
          expect(g.lifeExpectancyYears.marine).toBeGreaterThan(0);
        });
      });
    });

    describe("recommendASNZS4680Grade", () => {
      it("should recommend grade for corrosivity and life requirement", () => {
        const result = recommendASNZS4680Grade("C3", 25, "rural");
        expect(result).not.toBeNull();
        if (result) {
          expect(result.lifeExpectancyYears.rural).toBeGreaterThanOrEqual(25);
        }
      });

      it("should return null when no grade meets requirements", () => {
        const result = recommendASNZS4680Grade("CX", 100, "marine");
        expect(result).toBeNull();
      });
    });

    describe("validateGalvanizingThickness", () => {
      it("should validate compliant thickness", () => {
        const result = validateGalvanizingThickness(25, "Z275");
        expect(result.compliant).toBe(true);
        expect(result.grade).not.toBeNull();
      });

      it("should flag insufficient thickness", () => {
        const result = validateGalvanizingThickness(10, "Z275");
        expect(result.compliant).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });

      it("should handle unknown grade", () => {
        const result = validateGalvanizingThickness(25, "Z999");
        expect(result.compliant).toBe(false);
        expect(result.grade).toBeNull();
      });
    });
  });

  describe("ASTM Standards", () => {
    describe("allASTMStandards", () => {
      it("should return ASTM standards list", () => {
        const standards = allASTMStandards();
        expect(standards.length).toBeGreaterThan(0);
      });

      it("should include key testing standards", () => {
        const standards = allASTMStandards();
        expect(standards.some((s) => s.designation.includes("D4541"))).toBe(true);
        expect(standards.some((s) => s.designation.includes("B117"))).toBe(true);
      });
    });

    describe("astmStandardsByCategory", () => {
      it("should filter by category", () => {
        const testingStandards = astmStandardsByCategory("testing");
        testingStandards.forEach((s) => {
          expect(s.category).toBe("testing");
        });
      });

      it("should return standards for major categories", () => {
        const categories = ["surface-prep", "testing", "galvanizing"] as const;
        categories.forEach((cat) => {
          const standards = astmStandardsByCategory(cat);
          expect(standards.length).toBeGreaterThan(0);
        });
      });
    });

    describe("findRelatedASTM", () => {
      it("should find ASTM equivalent for ISO standards", () => {
        const related = findRelatedASTM("ISO 2409");
        expect(related.length).toBeGreaterThan(0);
        expect(related[0].designation).toContain("D3359");
      });
    });

    describe("astmEquivalentForTest", () => {
      it("should find equivalent for common test types", () => {
        const testTypes = ["adhesion", "cross-cut", "dft", "salt-spray"];
        testTypes.forEach((testType) => {
          const result = astmEquivalentForTest(testType);
          expect(result).not.toBeNull();
        });
      });

      it("should return null for unknown test type", () => {
        const result = astmEquivalentForTest("unknown-test");
        expect(result).toBeNull();
      });
    });
  });

  describe("Cathodic Protection Compatibility", () => {
    describe("checkCathodicProtectionCompatibility", () => {
      it("should identify compatible coatings", () => {
        const compatibleTypes: GenericType[] = ["fbe", "3lpe", "epoxy-glass-flake"];
        compatibleTypes.forEach((type) => {
          const result = checkCathodicProtectionCompatibility(type);
          expect(result.compatible).toBe(true);
          expect(result.disbondmentRisk).not.toBe("high");
        });
      });

      it("should identify incompatible coatings", () => {
        const incompatibleTypes: GenericType[] = ["polyurethane", "alkyd", "acrylic"];
        incompatibleTypes.forEach((type) => {
          const result = checkCathodicProtectionCompatibility(type);
          expect(result.compatible).toBe(false);
          expect(result.disbondmentRisk).toBe("high");
        });
      });

      it("should provide test standards for compatible coatings", () => {
        const result = checkCathodicProtectionCompatibility("fbe");
        expect(result.testStandards.length).toBeGreaterThan(0);
      });

      it("should provide recommendations", () => {
        const result = checkCathodicProtectionCompatibility("epoxy");
        expect(result.recommendations.length).toBeGreaterThan(0);
      });
    });

    describe("recommendCPCompatibleCoatings", () => {
      it("should recommend coatings for buried pipes", () => {
        const result = recommendCPCompatibleCoatings("buried-pipe");
        expect(result.length).toBeGreaterThan(0);
        result.forEach((r) => {
          expect(r.compatible).toBe(true);
        });
      });

      it("should recommend coatings for submerged service", () => {
        const result = recommendCPCompatibleCoatings("submerged");
        expect(result.length).toBeGreaterThan(0);
      });

      it("should recommend coatings for splash zone", () => {
        const result = recommendCPCompatibleCoatings("splash-zone");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Fire Protection", () => {
    describe("calculateFireProtectionDft", () => {
      it("should calculate DFT for different fire ratings", () => {
        const ratings = ["30", "60", "90", "120"] as const;
        ratings.forEach((rating) => {
          const result = calculateFireProtectionDft(rating, "column", 150);
          expect(result.fireRating).toBe(rating);
          expect(result.requiredDftMm).toBeGreaterThan(0);
        });
      });

      it("should increase DFT for higher section factors", () => {
        const lowSection = calculateFireProtectionDft("60", "column", 150);
        const highSection = calculateFireProtectionDft("60", "column", 300);

        expect(highSection.requiredDftMm).toBeGreaterThan(lowSection.requiredDftMm);
      });

      it("should vary by structure type", () => {
        const column = calculateFireProtectionDft("60", "column", 150);
        const hollowSection = calculateFireProtectionDft("60", "hollow-section", 150);

        expect(column.requiredDftMm).not.toBe(hollowSection.requiredDftMm);
      });

      it("should include test standard reference", () => {
        const result = calculateFireProtectionDft("60", "beam", 150);
        expect(result.testStandard).toBeDefined();
        expect(result.testStandard.length).toBeGreaterThan(0);
      });
    });

    describe("validateFireProtectionSystem", () => {
      it("should pass compliant application", () => {
        const requirement = calculateFireProtectionDft("60", "column", 150);
        const result = validateFireProtectionSystem(requirement.requiredDftMm + 0.5, requirement);

        expect(result.compliant).toBe(true);
        expect(result.margin).toBeGreaterThan(0);
      });

      it("should fail insufficient thickness", () => {
        const requirement = calculateFireProtectionDft("60", "column", 150);
        const result = validateFireProtectionSystem(requirement.requiredDftMm - 0.5, requirement);

        expect(result.compliant).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });

      it("should warn about excessive thickness", () => {
        const requirement = calculateFireProtectionDft("30", "beam", 150);
        const result = validateFireProtectionSystem(requirement.requiredDftMm * 2, requirement);

        expect(result.issues.some((i) => i.includes("Excessive"))).toBe(true);
      });
    });
  });

  describe("Food Contact Compliance", () => {
    describe("foodContactComplianceForRegion", () => {
      it("should return USA standards", () => {
        const standards = foodContactComplianceForRegion("USA");
        expect(standards.length).toBeGreaterThan(0);
        expect(standards.some((s) => s.standard.includes("FDA"))).toBe(true);
      });

      it("should return EU standards", () => {
        const standards = foodContactComplianceForRegion("EU");
        expect(standards.length).toBeGreaterThan(0);
      });
    });

    describe("checkFoodContactSuitability", () => {
      it("should identify suitable coatings", () => {
        const result = checkFoodContactSuitability("epoxy-phenolic");
        expect(result.suitable).toBe(true);
        expect(result.standards.length).toBeGreaterThan(0);
      });

      it("should identify unsuitable coatings", () => {
        const result = checkFoodContactSuitability("intumescent");
        expect(result.suitable).toBe(false);
      });
    });
  });

  describe("Potable Water Compliance", () => {
    describe("allPotableWaterStandards", () => {
      it("should return all potable water standards", () => {
        const standards = allPotableWaterStandards();
        expect(standards.length).toBeGreaterThan(0);
      });

      it("should include NSF 61", () => {
        const standards = allPotableWaterStandards();
        expect(standards.some((s) => s.standard.includes("NSF"))).toBe(true);
      });

      it("should include WRAS", () => {
        const standards = allPotableWaterStandards();
        expect(standards.some((s) => s.standard.includes("WRAS"))).toBe(true);
      });
    });

    describe("potableWaterStandardsForRegion", () => {
      it("should filter by region", () => {
        const ukStandards = potableWaterStandardsForRegion("UK");
        expect(ukStandards.length).toBeGreaterThan(0);
        expect(ukStandards.some((s) => s.standard.includes("WRAS"))).toBe(true);
      });
    });

    describe("validatePotableWaterCompliance", () => {
      it("should validate with recognized certifications", () => {
        const result = validatePotableWaterCompliance(["NSF/ANSI 61", "WRAS Approved"], 60);
        expect(result.compliant).toBe(true);
        expect(result.coveredStandards.length).toBeGreaterThan(0);
      });

      it("should fail without certifications", () => {
        const result = validatePotableWaterCompliance([], 60);
        expect(result.compliant).toBe(false);
        expect(result.issues.some((i) => i.includes("certification"))).toBe(true);
      });

      it("should flag temperature exceedance", () => {
        const result = validatePotableWaterCompliance(["NSF/ANSI 61"], 100);
        expect(result.issues.some((i) => i.includes("temperature"))).toBe(true);
      });
    });
  });

  describe("VOC Compliance", () => {
    describe("allVOCLimits", () => {
      it("should return VOC limits", () => {
        const limits = allVOCLimits();
        expect(limits.length).toBeGreaterThan(0);
      });

      it("should include multiple regions", () => {
        const limits = allVOCLimits();
        const regions = [...new Set(limits.map((l) => l.region))];
        expect(regions.length).toBeGreaterThan(3);
      });
    });

    describe("vocLimitsForRegion", () => {
      it("should filter by region", () => {
        const euLimits = vocLimitsForRegion("EU");
        expect(euLimits.length).toBeGreaterThan(0);
        euLimits.forEach((l) => {
          expect(l.region.includes("EU")).toBe(true);
        });
      });

      it("should return California SCAQMD limits", () => {
        const caLimits = vocLimitsForRegion("California");
        expect(caLimits.length).toBeGreaterThan(0);
      });
    });

    describe("checkVOCCompliance", () => {
      it("should pass compliant product", () => {
        const result = checkVOCCompliance(200, "California", "industrial maintenance");
        expect(result.compliant).toBe(true);
      });

      it("should fail non-compliant product", () => {
        const result = checkVOCCompliance(400, "California", "industrial maintenance");
        expect(result.compliant).toBe(false);
        expect(result.exceedances.length).toBeGreaterThan(0);
      });

      it("should handle unknown category gracefully", () => {
        const result = checkVOCCompliance(300, "USA", "exotic-category-xyz");
        expect(result).toBeDefined();
      });
    });

    describe("recommendLowVOCAlternatives", () => {
      it("should recommend alternatives below target", () => {
        const result = recommendLowVOCAlternatives("alkyd", 250);
        expect(result.alternatives.length).toBeGreaterThan(0);
        expect(result.notes.length).toBeGreaterThan(0);
      });

      it("should not include current type in alternatives", () => {
        const result = recommendLowVOCAlternatives("epoxy", 300);
        expect(result.alternatives).not.toContain("epoxy");
      });
    });
  });
});
