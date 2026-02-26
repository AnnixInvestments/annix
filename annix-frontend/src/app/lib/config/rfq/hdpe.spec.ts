import { describe, expect, it } from "vitest";
import {
  calculateInnerDiameter,
  calculatePipeWeight,
  calculateWallThickness,
  HDPE_DIMENSION_TABLES,
  pipeDimensions,
  totalPipeWeight,
} from "./hdpeDimensions";
import { HDPE_GRADES, hdpeGradeByCode } from "./hdpeGrades";
import {
  buttFusionJointCost,
  calculateHdpeMaterialCost,
  calculateJointCount,
  ELECTROFUSION_COUPLER_COSTS,
  electrofusionCouplerCost,
  estimateHdpePipeCost,
  FUSION_MACHINE_RENTALS,
  fusionMachineForSize,
  machineRentalCost,
  optimalPipeConfiguration,
} from "./hdpePricing";
import {
  calculatePnFromSdr,
  calculatePsiFromDr,
  pnClassForSdr,
  pressureRatingForSdr,
  SDR_RATINGS,
  SDR_VALUES,
  selectSdrForPressure,
} from "./hdpeSdrRatings";
import {
  recommendStandards,
  validateGradeSdrCompatibility,
  validateHdpeSpecification,
  validateSdrForPressure,
  validateTemperatureAndPressure,
} from "./hdpeStandards";
import {
  deratedPressure,
  deratingFactorForTemperature,
  HDPE_MAX_CONTINUOUS_TEMP_C,
  HDPE_MIN_OPERATING_TEMP_C,
  HDPE_TEMPERATURE_DERATING,
  validateOperatingTemperature,
} from "./hdpeTemperatureDerating";
import {
  BUTT_FUSION_PARAMETERS,
  buttFusionParametersForDn,
  estimateCoolingTime,
  estimateHeatingTime,
  HDPE_WELDING_METHODS,
  recommendedWeldingMethod,
  suitableWeldingMethods,
} from "./hdpeWelding";

describe("HDPE Configuration Tests", () => {
  describe("Pressure Calculation Formulas", () => {
    describe("ISO PN Calculation: PN = 20 × (MRS/1.25) / (SDR-1)", () => {
      it("PE100 SDR 11 should calculate to approximately PN 16", () => {
        const pn = calculatePnFromSdr(11, "PE100");
        expect(pn).toBeCloseTo(16, 0);
      });

      it("PE100 SDR 17 should calculate to approximately PN 10", () => {
        const pn = calculatePnFromSdr(17, "PE100");
        expect(pn).toBeCloseTo(10, 0);
      });

      it("PE100 SDR 21 should calculate to approximately PN 8", () => {
        const pn = calculatePnFromSdr(21, "PE100");
        expect(pn).toBeCloseTo(8, 0);
      });

      it("PE80 SDR 11 should calculate to approximately PN 12.5", () => {
        const pn = calculatePnFromSdr(11, "PE80");
        expect(pn).toBeCloseTo(12.8, 0);
      });

      it("PE80 SDR 17 should calculate to approximately PN 8", () => {
        const pn = calculatePnFromSdr(17, "PE80");
        expect(pn).toBeCloseTo(8, 0);
      });
    });

    describe("US PSI Calculation: P = 2 × HDS / (DR-1)", () => {
      it("DR 11 with HDS 4000 psi should calculate to 800 psi", () => {
        const psi = calculatePsiFromDr(11, 4000);
        expect(psi).toBe(800);
      });

      it("DR 17 with HDS 4000 psi should calculate to 500 psi", () => {
        const psi = calculatePsiFromDr(17, 4000);
        expect(psi).toBe(500);
      });

      it("DR 21 with HDS 4000 psi should calculate to 400 psi", () => {
        const psi = calculatePsiFromDr(21, 4000);
        expect(psi).toBe(400);
      });
    });

    describe("SDR to PN Class Mapping", () => {
      it("should map PE100 SDR values to correct PN classes", () => {
        expect(pnClassForSdr(11, "PE100")).toBe(16);
        expect(pnClassForSdr(17, "PE100")).toBe(10);
        expect(pnClassForSdr(21, "PE100")).toBe(8);
        expect(pnClassForSdr(26, "PE100")).toBe(6);
      });

      it("should map PE80 SDR values to correct PN classes", () => {
        expect(pnClassForSdr(11, "PE80")).toBe(12.5);
        expect(pnClassForSdr(17, "PE80")).toBe(8);
        expect(pnClassForSdr(21, "PE80")).toBe(6);
      });

      it("should return null for PE80 with high SDR values", () => {
        expect(SDR_RATINGS[33].pnPE80).toBeNull();
        expect(SDR_RATINGS[41].pnPE80).toBeNull();
      });
    });

    describe("Pressure Rating Result", () => {
      it("should return complete pressure rating information", () => {
        const result = pressureRatingForSdr(17, "PE100", 315);
        expect(result.pnBar).toBeCloseTo(10, 0);
        expect(result.sdr).toBe(17);
        expect(result.grade).toBe("PE100");
        expect(result.wallThicknessMm).toBeCloseTo(18.5, 0);
      });
    });

    describe("SDR Selection for Required Pressure", () => {
      it("should select appropriate SDR for required pressure", () => {
        expect(selectSdrForPressure(10, "PE100")).toBe(17);
        expect(selectSdrForPressure(16, "PE100")).toBe(11);
        expect(selectSdrForPressure(8, "PE100")).toBe(21);
      });

      it("should return null when no SDR meets requirement", () => {
        expect(selectSdrForPressure(35, "PE100")).toBeNull();
      });
    });
  });

  describe("Weight Calculation Tests", () => {
    describe("Weight Formula: weight = π × (OD² - ID²) / 4 × density / 1e6", () => {
      it("PE100 SDR 17 DN 110 should calculate weight within expected range", () => {
        const weight = calculatePipeWeight(110, 17, "PE100");
        expect(weight).toBeGreaterThan(1.9);
        expect(weight).toBeLessThan(2.3);
      });

      it("PE100 SDR 17 DN 315 should calculate weight within expected range", () => {
        const weight = calculatePipeWeight(315, 17, "PE100");
        expect(weight).toBeGreaterThan(15);
        expect(weight).toBeLessThan(19);
      });

      it("PE100 SDR 11 DN 110 should calculate weight within expected range", () => {
        const weight = calculatePipeWeight(110, 11, "PE100");
        expect(weight).toBeGreaterThan(2.8);
        expect(weight).toBeLessThan(3.5);
      });

      it("PE100 SDR 11 DN 315 should calculate weight within expected range", () => {
        const weight = calculatePipeWeight(315, 11, "PE100");
        expect(weight).toBeGreaterThan(23);
        expect(weight).toBeLessThan(28);
      });
    });

    describe("Wall Thickness Calculation: wall = OD / SDR", () => {
      it("DN 110 SDR 17 should have wall thickness 6.47mm", () => {
        const wall = calculateWallThickness(110, 17);
        expect(wall).toBeCloseTo(6.47, 1);
      });

      it("DN 315 SDR 17 should have wall thickness 18.53mm", () => {
        const wall = calculateWallThickness(315, 17);
        expect(wall).toBeCloseTo(18.53, 1);
      });

      it("DN 110 SDR 11 should have wall thickness 10mm", () => {
        const wall = calculateWallThickness(110, 11);
        expect(wall).toBeCloseTo(10, 1);
      });
    });

    describe("Inner Diameter Calculation: ID = OD - 2 × wall", () => {
      it("DN 110 SDR 17 should have ID approximately 97mm", () => {
        const id = calculateInnerDiameter(110, 17);
        expect(id).toBeCloseTo(97, 0);
      });

      it("DN 315 SDR 17 should have ID approximately 278mm", () => {
        const id = calculateInnerDiameter(315, 17);
        expect(id).toBeCloseTo(278, 0);
      });
    });

    describe("Dimension Table Verification", () => {
      it("SDR 17 table should have correct entries for common sizes", () => {
        const sdr17Table = HDPE_DIMENSION_TABLES[17];
        expect(sdr17Table.length).toBeGreaterThan(0);

        const dn110 = sdr17Table.find((d) => d.dnMm === 110);
        expect(dn110).toBeDefined();
        expect(dn110?.wallMm).toBeCloseTo(6.6, 1);
        expect(dn110?.weightKgM).toBeCloseTo(2.18, 1);

        const dn315 = sdr17Table.find((d) => d.dnMm === 315);
        expect(dn315).toBeDefined();
        expect(dn315?.wallMm).toBeCloseTo(18.7, 1);
      });

      it("SDR 11 table should have correct entries for common sizes", () => {
        const sdr11Table = HDPE_DIMENSION_TABLES[11];
        expect(sdr11Table.length).toBeGreaterThan(0);

        const dn110 = sdr11Table.find((d) => d.dnMm === 110);
        expect(dn110).toBeDefined();
        expect(dn110?.wallMm).toBeCloseTo(10, 1);
        expect(dn110?.weightKgM).toBeCloseTo(3.22, 1);
      });
    });

    describe("Pipe Dimensions Function", () => {
      it("should return table data when available", () => {
        const dims = pipeDimensions(110, 17, "PE100");
        expect(dims.source).toBe("table");
        expect(dims.weightKgM).toBeCloseTo(2.18, 1);
      });

      it("should calculate dimensions when not in table", () => {
        const dims = pipeDimensions(710, 17, "PE100");
        expect(dims.source).toBe("table");
        expect(dims.weightKgM).toBeGreaterThan(0);
      });
    });

    describe("Total Pipe Weight Calculation", () => {
      it("should calculate total weight for given length", () => {
        const weight = totalPipeWeight(110, 17, 12, 1, "PE100");
        expect(weight).toBeCloseTo(2.18 * 12, 1);
      });

      it("should calculate total weight for multiple pipes", () => {
        const weight = totalPipeWeight(110, 17, 12, 5, "PE100");
        expect(weight).toBeCloseTo(2.18 * 12 * 5, 0);
      });
    });
  });

  describe("Temperature Derating Tests", () => {
    describe("Derating Factor Lookup", () => {
      it("should return 1.0 at 20°C", () => {
        expect(deratingFactorForTemperature(20)).toBe(1.0);
      });

      it("should return 0.87 at 30°C", () => {
        expect(deratingFactorForTemperature(30)).toBe(0.87);
      });

      it("should return 0.74 at 40°C", () => {
        expect(deratingFactorForTemperature(40)).toBe(0.74);
      });

      it("should return 0.62 at 50°C", () => {
        expect(deratingFactorForTemperature(50)).toBe(0.62);
      });

      it("should return 0.5 at 60°C", () => {
        expect(deratingFactorForTemperature(60)).toBe(0.5);
      });

      it("should return 1.0 for temperatures below 20°C", () => {
        expect(deratingFactorForTemperature(10)).toBe(1.0);
        expect(deratingFactorForTemperature(0)).toBe(1.0);
        expect(deratingFactorForTemperature(-20)).toBe(1.0);
      });

      it("should return 0.5 for temperatures above 60°C", () => {
        expect(deratingFactorForTemperature(65)).toBe(0.5);
        expect(deratingFactorForTemperature(70)).toBe(0.5);
      });
    });

    describe("Derating Factor Interpolation", () => {
      it("should interpolate between table values", () => {
        const factor25 = deratingFactorForTemperature(25);
        expect(factor25).toBeCloseTo(0.935, 2);

        const factor35 = deratingFactorForTemperature(35);
        expect(factor35).toBeCloseTo(0.805, 2);

        const factor45 = deratingFactorForTemperature(45);
        expect(factor45).toBeCloseTo(0.68, 2);
      });

      it("should interpolate linearly between adjacent points", () => {
        const factor27 = deratingFactorForTemperature(27);
        expect(factor27).toBeLessThan(0.935);
        expect(factor27).toBeGreaterThan(0.87);
      });
    });

    describe("Derated Pressure Calculation", () => {
      it("should calculate derated pressure correctly", () => {
        const result = deratedPressure(10, 40);
        expect(result.deratedPnBar).toBeCloseTo(7.4, 1);
        expect(result.factor).toBe(0.74);
      });

      it("should return warning for high temperatures", () => {
        const result = deratedPressure(10, 55);
        expect(result.warning).not.toBeNull();
        expect(result.warning).toContain("55");
      });

      it("should return warning for temperatures above max continuous", () => {
        const result = deratedPressure(10, 65);
        expect(result.warning).toContain("exceeds maximum continuous");
      });
    });

    describe("Temperature Validation", () => {
      it("should validate temperature within limits", () => {
        const result = validateOperatingTemperature(40, 7, 10);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should fail validation when derated pressure is below required", () => {
        const result = validateOperatingTemperature(50, 10, 10);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it("should fail validation for temperature below minimum", () => {
        const result = validateOperatingTemperature(-50, 5, 10);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("brittle"))).toBe(true);
      });

      it("should fail validation for temperature above maximum", () => {
        const result = validateOperatingTemperature(70, 5, 10);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(true);
      });
    });

    describe("Temperature Limits", () => {
      it("should have correct min/max temperature constants", () => {
        expect(HDPE_MIN_OPERATING_TEMP_C).toBe(-40);
        expect(HDPE_MAX_CONTINUOUS_TEMP_C).toBe(60);
      });

      it("derating table should cover 20°C to 60°C range", () => {
        const minTemp = Math.min(...HDPE_TEMPERATURE_DERATING.map((d) => d.temperatureC));
        const maxTemp = Math.max(...HDPE_TEMPERATURE_DERATING.map((d) => d.temperatureC));
        expect(minTemp).toBe(20);
        expect(maxTemp).toBe(60);
      });
    });
  });

  describe("Material Grade Tests", () => {
    describe("Grade Properties", () => {
      it("PE100 should have MRS of 10 MPa", () => {
        const grade = hdpeGradeByCode("PE100");
        expect(grade.mrsMpa).toBe(10);
      });

      it("PE80 should have MRS of 8 MPa", () => {
        const grade = hdpeGradeByCode("PE80");
        expect(grade.mrsMpa).toBe(8);
      });

      it("PE4710 should have MRS of 10 MPa", () => {
        const grade = hdpeGradeByCode("PE4710");
        expect(grade.mrsMpa).toBe(10);
      });

      it("all grades should have density between 930-960 kg/m³", () => {
        Object.values(HDPE_GRADES).forEach((grade) => {
          expect(grade.densityKgM3).toBeGreaterThanOrEqual(930);
          expect(grade.densityKgM3).toBeLessThanOrEqual(960);
        });
      });
    });

    describe("Grade Design Stress", () => {
      it("design stress should be MRS / 1.25", () => {
        const pe100 = hdpeGradeByCode("PE100");
        expect(pe100.designStressMpa).toBeCloseTo(10 / 1.25, 2);

        const pe80 = hdpeGradeByCode("PE80");
        expect(pe80.designStressMpa).toBeCloseTo(8 / 1.25, 2);
      });
    });
  });

  describe("Welding Parameters Tests", () => {
    describe("Butt Fusion Parameters", () => {
      it("should have parameters for DN 110", () => {
        const params = buttFusionParametersForDn(110);
        expect(params).not.toBeNull();
        expect(params?.dnMm).toBe(110);
        expect(params?.heatingTimeSec.min).toBeGreaterThan(100);
        expect(params?.coolingTimeMin).toBeGreaterThan(15);
      });

      it("should have parameters for DN 315", () => {
        const params = buttFusionParametersForDn(315);
        expect(params).not.toBeNull();
        expect(params?.dnMm).toBe(315);
        expect(params?.heatingTimeSec.min).toBeGreaterThan(300);
        expect(params?.coolingTimeMin).toBeGreaterThan(40);
      });

      it("should return closest smaller parameters for intermediate sizes", () => {
        const params = buttFusionParametersForDn(280);
        expect(params).not.toBeNull();
        expect(params?.dnMm).toBeLessThanOrEqual(280);
      });

      it("should return null for sizes below minimum", () => {
        const params = buttFusionParametersForDn(50);
        expect(params).toBeNull();
      });
    });

    describe("Welding Method Suitability", () => {
      it("butt fusion should be suitable for DN >= 63", () => {
        const methods = suitableWeldingMethods(110);
        const buttFusion = methods.find((m) => m.method === "butt_fusion");
        expect(buttFusion?.suitable).toBe(true);
      });

      it("electrofusion should be suitable for DN 20-630", () => {
        const methods63 = suitableWeldingMethods(63);
        const ef63 = methods63.find((m) => m.method === "electrofusion");
        expect(ef63?.suitable).toBe(true);

        const methods700 = suitableWeldingMethods(700);
        const ef700 = methods700.find((m) => m.method === "electrofusion");
        expect(ef700?.suitable).toBe(false);
      });

      it("butt fusion should not be suitable for DN < 63", () => {
        const methods = suitableWeldingMethods(50);
        const buttFusion = methods.find((m) => m.method === "butt_fusion");
        expect(buttFusion?.suitable).toBe(false);
      });
    });

    describe("Recommended Welding Method", () => {
      it("should recommend butt fusion for pressure service >= DN 63", () => {
        expect(recommendedWeldingMethod(110, true)).toBe("butt_fusion");
        expect(recommendedWeldingMethod(315, true)).toBe("butt_fusion");
      });

      it("should recommend electrofusion for small pressure pipe", () => {
        expect(recommendedWeldingMethod(50, true)).toBe("electrofusion");
        expect(recommendedWeldingMethod(40, true)).toBe("electrofusion");
      });
    });

    describe("Heating and Cooling Time Estimates", () => {
      it("should estimate heating time based on wall thickness", () => {
        const time = estimateHeatingTime(10);
        expect(time.min).toBeCloseTo(100, -1);
        expect(time.max).toBeGreaterThan(time.min);
      });

      it("should estimate cooling time based on wall thickness", () => {
        const coolTime = estimateCoolingTime(10);
        expect(coolTime).toBeCloseTo(20, -1);
      });
    });

    describe("Welding Methods Configuration", () => {
      it("should have all required welding methods defined", () => {
        expect(HDPE_WELDING_METHODS.butt_fusion).toBeDefined();
        expect(HDPE_WELDING_METHODS.electrofusion).toBeDefined();
        expect(HDPE_WELDING_METHODS.extrusion).toBeDefined();
        expect(HDPE_WELDING_METHODS.mechanical).toBeDefined();
      });

      it("butt fusion should require fusion machine equipment", () => {
        const bf = HDPE_WELDING_METHODS.butt_fusion;
        expect(bf.equipmentRequired).toContain("Butt fusion machine");
        expect(bf.pressureRated).toBe(true);
      });

      it("electrofusion should have DN range limits", () => {
        const ef = HDPE_WELDING_METHODS.electrofusion;
        expect(ef.minPipeDnMm).toBe(20);
        expect(ef.maxPipeDnMm).toBe(630);
      });
    });

    describe("Butt Fusion Parameters Table", () => {
      it("should have increasing heating times with pipe size", () => {
        const sorted = [...BUTT_FUSION_PARAMETERS].sort((a, b) => a.dnMm - b.dnMm);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].heatingTimeSec.min).toBeGreaterThanOrEqual(
            sorted[i - 1].heatingTimeSec.min,
          );
        }
      });

      it("should have increasing cooling times with pipe size", () => {
        const sorted = [...BUTT_FUSION_PARAMETERS].sort((a, b) => a.dnMm - b.dnMm);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].coolingTimeMin).toBeGreaterThanOrEqual(sorted[i - 1].coolingTimeMin);
        }
      });
    });
  });

  describe("Pricing Calculation Tests", () => {
    describe("Joint Count Calculation", () => {
      it("should calculate joints for pipe length requiring multiple sections", () => {
        const result = calculateJointCount(50, 12);
        expect(result.pipeLengthsNeeded).toBe(5);
        expect(result.jointCount).toBe(4);
      });

      it("should return 0 joints for length within single pipe", () => {
        const result = calculateJointCount(10, 12);
        expect(result.pipeLengthsNeeded).toBe(1);
        expect(result.jointCount).toBe(0);
      });

      it("should calculate waste correctly", () => {
        const result = calculateJointCount(50, 12);
        expect(result.wasteM).toBeCloseTo(10, 1);
      });
    });

    describe("Optimal Pipe Configuration", () => {
      it("should recommend coil for small diameter short runs", () => {
        const config = optimalPipeConfiguration(63, 50);
        expect(config.useCoil).toBe(true);
        expect(config.jointCount).toBe(0);
      });

      it("should recommend straight lengths for large diameter", () => {
        const config = optimalPipeConfiguration(315, 100);
        expect(config.useCoil).toBe(false);
        expect(config.jointCount).toBeGreaterThan(0);
      });
    });

    describe("Butt Fusion Joint Cost", () => {
      it("should calculate cost breakdown for small pipe", () => {
        const cost = buttFusionJointCost(110);
        expect(cost.method).toBe("butt_fusion");
        expect(cost.laborCost).toBeGreaterThan(0);
        expect(cost.consumablesCost).toBeGreaterThan(0);
        expect(cost.totalPerJoint).toBe(cost.laborCost + cost.consumablesCost);
      });

      it("should have higher costs for larger pipe", () => {
        const smallCost = buttFusionJointCost(110);
        const largeCost = buttFusionJointCost(400);
        expect(largeCost.totalPerJoint).toBeGreaterThan(smallCost.totalPerJoint);
      });
    });

    describe("Electrofusion Coupler Costs", () => {
      it("should have costs for common sizes", () => {
        const cost110 = electrofusionCouplerCost(110);
        expect(cost110).not.toBeNull();
        expect(cost110?.couplerPrice).toBeGreaterThan(0);

        const cost315 = electrofusionCouplerCost(315);
        expect(cost315).not.toBeNull();
        expect(cost315?.couplerPrice).toBeGreaterThan(cost110!.couplerPrice);
      });

      it("coupler prices should increase with size", () => {
        const sorted = [...ELECTROFUSION_COUPLER_COSTS].sort((a, b) => a.dnMm - b.dnMm);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].couplerPrice).toBeGreaterThan(sorted[i - 1].couplerPrice);
        }
      });
    });

    describe("Fusion Machine Rental", () => {
      it("should find appropriate machine for pipe size", () => {
        const machine = fusionMachineForSize(110);
        expect(machine).not.toBeNull();
        expect(machine?.minDnMm).toBeLessThanOrEqual(110);
        expect(machine?.maxDnMm).toBeGreaterThanOrEqual(110);
      });

      it("should have increasing rental rates with machine size", () => {
        const sorted = [...FUSION_MACHINE_RENTALS].sort((a, b) => a.minDnMm - b.minDnMm);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].dailyRate).toBeGreaterThan(sorted[i - 1].dailyRate);
        }
      });

      it("should calculate rental cost correctly", () => {
        const result = machineRentalCost(110, 10, 8);
        expect(result.machine).not.toBeNull();
        expect(result.days).toBe(2);
        expect(result.cost).toBeGreaterThan(0);
      });
    });

    describe("Material Cost Calculation", () => {
      it("should calculate material cost based on weight", () => {
        const result = calculateHdpeMaterialCost(110, 17, 12, 25);
        expect(result.totalWeightKg).toBeCloseTo(2.18 * 12, 1);
        expect(result.totalMaterialCost).toBeCloseTo(result.totalWeightKg * 25, 0);
      });
    });

    describe("Complete Pipe Cost Estimate", () => {
      it("should estimate total pipe cost including joints", () => {
        const estimate = estimateHdpePipeCost(110, 17, 100, 25, "butt_fusion", "PE100");
        expect(estimate.material.totalWeightKg).toBeGreaterThan(0);
        expect(estimate.joints.jointCount).toBeGreaterThan(0);
        expect(estimate.joints.totalJointCost).toBeGreaterThan(0);
        expect(estimate.totalCost).toBe(
          estimate.material.totalMaterialCost + estimate.joints.totalJointCost,
        );
      });
    });
  });

  describe("Standards Compliance Validation Tests", () => {
    describe("SDR Pressure Validation", () => {
      it("should validate SDR meets pressure requirement", () => {
        const result = validateSdrForPressure(17, "PE100", 10);
        expect(result.valid).toBe(true);
        expect(result.margin).toBeGreaterThanOrEqual(0);
      });

      it("should fail validation when SDR insufficient", () => {
        const result = validateSdrForPressure(26, "PE100", 10);
        expect(result.valid).toBe(false);
        expect(result.recommendation).not.toBeNull();
      });

      it("should recommend more economical SDR when over-specified", () => {
        const result = validateSdrForPressure(11, "PE100", 6);
        expect(result.valid).toBe(true);
        expect(result.marginPct).toBeGreaterThan(50);
      });
    });

    describe("Grade/SDR Compatibility", () => {
      it("should validate compatible grade/SDR combinations", () => {
        const result = validateGradeSdrCompatibility("PE100", 17);
        expect(result.compatible).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });

      it("should warn about unusual combinations", () => {
        const result = validateGradeSdrCompatibility("PE80", 33);
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it("should return applicable standards", () => {
        const result = validateGradeSdrCompatibility("PE100", 17);
        expect(result.applicableStandards.length).toBeGreaterThan(0);
      });
    });

    describe("Temperature and Pressure Validation", () => {
      it("should validate normal operating conditions", () => {
        const result = validateTemperatureAndPressure(25, 10, 8);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should fail when derated pressure insufficient", () => {
        const result = validateTemperatureAndPressure(50, 10, 8);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("below required"))).toBe(true);
      });

      it("should fail for extreme temperatures", () => {
        const highTemp = validateTemperatureAndPressure(70, 10, 5);
        expect(highTemp.valid).toBe(false);

        const lowTemp = validateTemperatureAndPressure(-50, 10, 5);
        expect(lowTemp.valid).toBe(false);
      });
    });

    describe("Comprehensive Specification Validation", () => {
      it("should validate complete HDPE specification", () => {
        const result = validateHdpeSpecification("PE100", 17, 10, 20, 315);
        expect(result.overall).toBe(true);
        expect(result.allErrors).toHaveLength(0);
        expect(result.applicableStandards.length).toBeGreaterThan(0);
      });

      it("should fail for inadequate SDR at elevated temperature", () => {
        const result = validateHdpeSpecification("PE100", 21, 10, 50, 315);
        expect(result.overall).toBe(false);
        expect(result.allErrors.length).toBeGreaterThan(0);
      });
    });

    describe("Standards Recommendations", () => {
      it("should recommend AWWA standards for US water applications", () => {
        const recs = recommendStandards("water", "US", 315);
        expect(recs.some((r) => r.standard.code === "AWWA_C906")).toBe(true);
      });

      it("should recommend ISO standards for international water", () => {
        const recs = recommendStandards("water", "International", 315);
        expect(recs.some((r) => r.standard.code === "ISO_4427")).toBe(true);
      });

      it("should recommend ISO 4437 for gas applications", () => {
        const recs = recommendStandards("gas", "US", 110);
        expect(recs.some((r) => r.standard.code === "ISO_4437")).toBe(true);
      });

      it("should always include PPI TR-4 as reference", () => {
        const recs = recommendStandards("water", "US", 315);
        expect(recs.some((r) => r.standard.code === "PPI_TR4")).toBe(true);
      });
    });
  });

  describe("SDR Rating Configuration", () => {
    it("should have all SDR values defined", () => {
      SDR_VALUES.forEach((sdr) => {
        expect(SDR_RATINGS[sdr]).toBeDefined();
        expect(SDR_RATINGS[sdr].pnPE100).toBeGreaterThan(0);
      });
    });

    it("PN should decrease as SDR increases", () => {
      const sorted = [...SDR_VALUES].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(SDR_RATINGS[sorted[i]].pnPE100).toBeLessThanOrEqual(
          SDR_RATINGS[sorted[i - 1]].pnPE100,
        );
      }
    });
  });
});
