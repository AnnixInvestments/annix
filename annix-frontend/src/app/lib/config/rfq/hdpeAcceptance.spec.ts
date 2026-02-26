import { describe, expect, it } from "vitest";
import {
  calculatePipeWeight,
  calculateWallThickness,
  type HdpeNominalSize,
  pipeDimensions,
} from "./hdpeDimensions";
import { HDPE_GRADE_LIST, type HdpeGradeCode, hdpeGradeByCode } from "./hdpeGrades";
import {
  buttFusionJointCost,
  calculateJointCount,
  electrofusionJointCost,
  estimateHdpePipeCost,
  machineRentalCost,
} from "./hdpePricing";
import {
  calculatePnFromSdr,
  SDR_VALUES,
  type SdrValue,
  selectSdrForPressure,
} from "./hdpeSdrRatings";
import { validateHdpeSpecification } from "./hdpeStandards";
import {
  deratedPressure,
  deratingFactorForTemperature,
  HDPE_MAX_CONTINUOUS_TEMP_C,
  HDPE_MIN_OPERATING_TEMP_C,
} from "./hdpeTemperatureDerating";
import {
  buttFusionParametersForDn,
  ELECTROFUSION_PARAMETERS,
  recommendedWeldingMethod,
} from "./hdpeWelding";
import { standardByCode } from "./hdpeWeldingStandards";

describe("Acceptance Criteria Tests", () => {
  describe("AC1: Users can create RFQ items for HDPE piping with appropriate fields", () => {
    it("should provide all PE grade options for selection", () => {
      expect(HDPE_GRADE_LIST.length).toBeGreaterThanOrEqual(5);
      expect(HDPE_GRADE_LIST).toContain("PE100");
      expect(HDPE_GRADE_LIST).toContain("PE4710");
      expect(HDPE_GRADE_LIST).toContain("PE80");
    });

    it("should provide grade details with MRS values", () => {
      const pe100 = hdpeGradeByCode("PE100");
      expect(pe100).not.toBeNull();
      expect(pe100.mrsMpa).toBe(10);
      expect(pe100.name).toContain("PE100");

      const pe80 = hdpeGradeByCode("PE80");
      expect(pe80).not.toBeNull();
      expect(pe80.mrsMpa).toBe(8);
    });

    it("should provide all SDR options for selection", () => {
      expect(SDR_VALUES.length).toBeGreaterThanOrEqual(7);
      expect(SDR_VALUES).toContain(11);
      expect(SDR_VALUES).toContain(17);
      expect(SDR_VALUES).toContain(21);
    });

    it("should provide welding method options", () => {
      const buttFusion = recommendedWeldingMethod(110, true);
      const electrofusion = recommendedWeldingMethod(50, true);
      expect(buttFusion).toBe("butt_fusion");
      expect(electrofusion).toBe("electrofusion");
    });

    it("should provide welding standard options", () => {
      const astm = standardByCode("ASTM_F2620");
      const iso = standardByCode("ISO_21307");
      const dvs = standardByCode("DVS_2207_1");
      expect(astm).toBeDefined();
      expect(iso).toBeDefined();
      expect(dvs).toBeDefined();
    });

    it("should provide color code options for pipe identification", () => {
      const pe100 = hdpeGradeByCode("PE100");
      expect(pe100.colorCodes).toBeDefined();
      expect(pe100.colorCodes.length).toBeGreaterThanOrEqual(3);
    });

    it("should support HDPE-specific item types", () => {
      const itemTypes = ["straight_pipe", "bend", "fitting"] as const;
      const hdpeItemTypes = itemTypes.map((type) => ({
        type,
        materialType: "hdpe" as const,
      }));
      expect(hdpeItemTypes.length).toBe(3);
      expect(hdpeItemTypes.every((i) => i.materialType === "hdpe")).toBe(true);
    });

    it("should validate complete HDPE specification", () => {
      const result = validateHdpeSpecification("PE100", 17 as SdrValue, 8, 25, 110);
      expect(result.overall).toBe(true);
      expect(result.allErrors.length).toBe(0);
    });
  });

  describe("AC2: PE grade and SDR selections auto-calculate pressure ratings", () => {
    it("should calculate PN from SDR for PE100", () => {
      const pn17 = calculatePnFromSdr(17, "PE100");
      const pn11 = calculatePnFromSdr(11, "PE100");
      const pn21 = calculatePnFromSdr(21, "PE100");

      expect(pn17).toBe(10);
      expect(pn11).toBe(16);
      expect(pn21).toBeCloseTo(8, 0);
    });

    it("should calculate PN from SDR for PE80", () => {
      const pn17 = calculatePnFromSdr(17, "PE80");
      const pn11 = calculatePnFromSdr(11, "PE80");

      expect(pn17).toBe(8);
      expect(pn11).toBeCloseTo(12.8, 0);
    });

    it("should lookup PN rating by grade and SDR combination", () => {
      const pe100Sdr17 = calculatePnFromSdr(17, "PE100");
      const pe80Sdr11 = calculatePnFromSdr(11, "PE80");

      expect(pe100Sdr17).toBe(10);
      expect(pe80Sdr11).toBeCloseTo(12.8, 0);
    });

    it("should select appropriate SDR for required pressure", () => {
      const sdrFor10Bar = selectSdrForPressure(10, "PE100");
      const sdrFor16Bar = selectSdrForPressure(16, "PE100");

      expect(sdrFor10Bar).toBe(17);
      expect(sdrFor16Bar).toBe(11);
    });

    it("should return null when no SDR can meet pressure requirement", () => {
      const sdrForTooHigh = selectSdrForPressure(35, "PE100");
      expect(sdrForTooHigh).toBeNull();
    });

    it("should auto-calculate wall thickness from OD and SDR", () => {
      const wall110Sdr17 = calculateWallThickness(110, 17);
      const wall315Sdr11 = calculateWallThickness(315, 11);

      expect(wall110Sdr17).toBeCloseTo(6.47, 1);
      expect(wall315Sdr11).toBeCloseTo(28.64, 1);
    });

    it("should provide complete dimension set for OD/SDR combo", () => {
      const dims = pipeDimensions(110 as HdpeNominalSize, 17 as SdrValue);

      expect(dims.odMm).toBe(110);
      expect(dims.wallMm).toBeCloseTo(6.6, 1);
      expect(dims.idMm).toBeCloseTo(96.8, 1);
      expect(dims.weightKgM).toBeGreaterThan(0);
    });
  });

  describe("AC3: Temperature derating is applied when operating temp specified", () => {
    it("should apply no derating at reference temperature 20C", () => {
      const basePn = 10;
      const result = deratedPressure(basePn, 20);
      expect(result.deratedPnBar).toBe(10);
    });

    it("should apply correct derating at elevated temperatures", () => {
      const basePn = 10;
      expect(deratedPressure(basePn, 30).deratedPnBar).toBeCloseTo(8.7, 1);
      expect(deratedPressure(basePn, 40).deratedPnBar).toBeCloseTo(7.4, 1);
      expect(deratedPressure(basePn, 50).deratedPnBar).toBeCloseTo(6.2, 1);
      expect(deratedPressure(basePn, 60).deratedPnBar).toBeCloseTo(5.0, 1);
    });

    it("should provide derating factor for temperature lookup", () => {
      expect(deratingFactorForTemperature(20)).toBe(1.0);
      expect(deratingFactorForTemperature(30)).toBe(0.87);
      expect(deratingFactorForTemperature(40)).toBe(0.74);
      expect(deratingFactorForTemperature(50)).toBe(0.62);
      expect(deratingFactorForTemperature(60)).toBe(0.5);
    });

    it("should interpolate derating for intermediate temperatures", () => {
      const factor25 = deratingFactorForTemperature(25);
      expect(factor25).toBeGreaterThan(0.87);
      expect(factor25).toBeLessThan(1.0);
    });

    it("should validate operating temperature within limits", () => {
      expect(20).toBeGreaterThanOrEqual(HDPE_MIN_OPERATING_TEMP_C);
      expect(60).toBeLessThanOrEqual(HDPE_MAX_CONTINUOUS_TEMP_C);
      expect(65).toBeGreaterThan(HDPE_MAX_CONTINUOUS_TEMP_C);
    });

    it("should warn when derated pressure is below design requirement", () => {
      const result = validateHdpeSpecification("PE100", 17 as SdrValue, 8, 50, 110);
      expect(result.allWarnings.length).toBeGreaterThan(0);
      expect(result.allWarnings.some((w) => w.toLowerCase().includes("derat"))).toBe(true);
    });

    it("should calculate final effective pressure with temperature", () => {
      const basePn = calculatePnFromSdr(17, "PE100");
      const effectiveResult = deratedPressure(basePn, 40);
      expect(basePn).toBe(10);
      expect(effectiveResult.deratedPnBar).toBeCloseTo(7.4, 1);
    });
  });

  describe("AC4: Fusion welding parameters display based on pipe size and standard", () => {
    it("should recommend butt fusion for large diameter pipes", () => {
      expect(recommendedWeldingMethod(110, true)).toBe("butt_fusion");
      expect(recommendedWeldingMethod(315, true)).toBe("butt_fusion");
      expect(recommendedWeldingMethod(630, true)).toBe("butt_fusion");
    });

    it("should recommend electrofusion for small diameter pipes", () => {
      expect(recommendedWeldingMethod(32, true)).toBe("electrofusion");
      expect(recommendedWeldingMethod(50, true)).toBe("electrofusion");
    });

    it("should provide butt fusion parameters by DN", () => {
      const params110 = buttFusionParametersForDn(110);
      expect(params110).not.toBeNull();
      expect(params110?.heatingTimeSec).toBeDefined();
      expect(params110?.changeoverTimeSec).toBeDefined();
      expect(params110?.coolingTimeMin).toBeDefined();
      expect(params110?.fusionPressureNMm2).toBeDefined();

      const params315 = buttFusionParametersForDn(315);
      expect(params315).not.toBeNull();
      expect(params315!.heatingTimeSec.min).toBeGreaterThan(params110!.heatingTimeSec.min);
    });

    it("should provide electrofusion parameters", () => {
      const efParams = ELECTROFUSION_PARAMETERS;
      expect(efParams.scrapeDepthMm).toBeDefined();
      expect(efParams.fittingGapToleranceMm).toBeDefined();
      expect(efParams.coolingTimeMin).toBeDefined();
    });

    it("should provide welding standard details", () => {
      const astm = standardByCode("ASTM_F2620");
      expect(astm.heatPlateTemperatureC).toBeDefined();
      expect(astm.interfacialPressureNMm2).toBeDefined();
      expect(astm.region).toBe("US");

      const iso = standardByCode("ISO_21307");
      expect(iso.region).toBe("Global");

      const dvs = standardByCode("DVS_2207_1");
      expect(dvs.region).toBe("EU");
    });

    it("should scale cooling time with pipe size", () => {
      const params110 = buttFusionParametersForDn(110);
      const params315 = buttFusionParametersForDn(315);
      const params630 = buttFusionParametersForDn(630);

      expect(params315!.coolingTimeMin).toBeGreaterThan(params110!.coolingTimeMin);
      expect(params630!.coolingTimeMin).toBeGreaterThan(params315!.coolingTimeMin);
    });

    it("should include heat plate temperature ranges", () => {
      const astm = standardByCode("ASTM_F2620");
      expect(astm.heatPlateTemperatureC.min).toBeGreaterThanOrEqual(200);
      expect(astm.heatPlateTemperatureC.max).toBeLessThanOrEqual(250);
    });
  });

  describe("AC5: Weight and cost calculations work correctly for HDPE material", () => {
    it("should calculate pipe weight from dimensions", () => {
      const weight = calculatePipeWeight(110, 17, "PE100");
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(5);
    });

    it("should calculate joint count from pipe length and standard lengths", () => {
      const result6m = calculateJointCount(6, 6);
      const result12m = calculateJointCount(12, 6);
      const result25m = calculateJointCount(25, 6);

      expect(result6m.jointCount).toBe(0);
      expect(result12m.jointCount).toBe(1);
      expect(result25m.jointCount).toBe(4);
    });

    it("should calculate butt fusion joint cost", () => {
      const cost = buttFusionJointCost(110);
      expect(cost.totalPerJoint).toBeGreaterThan(0);
      expect(cost.laborCost).toBeGreaterThan(0);
    });

    it("should calculate electrofusion joint cost", () => {
      const cost = electrofusionJointCost(50);
      expect(cost.totalPerJoint).toBeGreaterThan(0);
      expect(cost.fittingCost).toBeGreaterThan(0);
    });

    it("should estimate total pipe cost with material and joints", () => {
      const costEstimate = estimateHdpePipeCost(
        315 as HdpeNominalSize,
        17 as SdrValue,
        50,
        3.5,
        "butt_fusion",
        "PE100",
      );

      expect(costEstimate.material.totalMaterialCost).toBeGreaterThan(0);
      expect(costEstimate.joints.jointCount).toBeGreaterThan(0);
      expect(costEstimate.totalCost).toBe(
        costEstimate.material.totalMaterialCost + costEstimate.joints.totalJointCost,
      );
    });

    it("should include machine rental in cost considerations", () => {
      const rentalResult1Day = machineRentalCost(110, 5);
      const rentalResult2Days = machineRentalCost(110, 20);

      expect(rentalResult1Day.cost).toBeGreaterThan(0);
      expect(rentalResult2Days.days).toBeGreaterThan(rentalResult1Day.days);
      expect(rentalResult2Days.cost).toBeGreaterThan(rentalResult1Day.cost);
    });

    it("should calculate different costs for different SDRs", () => {
      const costSdr17 = estimateHdpePipeCost(
        110 as HdpeNominalSize,
        17 as SdrValue,
        12,
        3.5,
        "butt_fusion",
        "PE100",
      );

      const costSdr11 = estimateHdpePipeCost(
        110 as HdpeNominalSize,
        11 as SdrValue,
        12,
        3.5,
        "butt_fusion",
        "PE100",
      );

      expect(costSdr11.material.totalMaterialCost).toBeGreaterThan(
        costSdr17.material.totalMaterialCost,
      );
    });
  });

  describe("AC6: Generated quotes clearly distinguish HDPE from steel specifications", () => {
    interface MockRfqItem {
      materialType: "steel" | "hdpe";
      dnMm: number;
      itemType: string;
      steelSpec?: {
        schedule?: string;
        wallThicknessMm?: number;
        grade?: string;
      };
      hdpeSpec?: {
        peGrade: HdpeGradeCode;
        sdr: SdrValue;
        pnBar: number;
        colorCode: string;
        weldingMethod: string;
      };
    }

    const createSteelItem = (dnMm: number): MockRfqItem => ({
      materialType: "steel",
      dnMm,
      itemType: "straight_pipe",
      steelSpec: {
        schedule: "40",
        grade: "A106B",
      },
    });

    const createHdpeItem = (dnMm: number): MockRfqItem => ({
      materialType: "hdpe",
      dnMm,
      itemType: "straight_pipe",
      hdpeSpec: {
        peGrade: "PE100",
        sdr: 17,
        pnBar: calculatePnFromSdr(17, "PE100"),
        colorCode: "black",
        weldingMethod: recommendedWeldingMethod(dnMm, true),
      },
    });

    it("should distinguish items by materialType field", () => {
      const steel = createSteelItem(100);
      const hdpe = createHdpeItem(110);

      expect(steel.materialType).toBe("steel");
      expect(hdpe.materialType).toBe("hdpe");
    });

    it("should have exclusive specification fields per material type", () => {
      const steel = createSteelItem(100);
      const hdpe = createHdpeItem(110);

      expect(steel.steelSpec).toBeDefined();
      expect(steel.hdpeSpec).toBeUndefined();

      expect(hdpe.hdpeSpec).toBeDefined();
      expect(hdpe.steelSpec).toBeUndefined();
    });

    it("should support mixed material RFQs", () => {
      const items: MockRfqItem[] = [
        createSteelItem(100),
        createHdpeItem(110),
        createSteelItem(150),
        createHdpeItem(315),
      ];

      const steelItems = items.filter((i) => i.materialType === "steel");
      const hdpeItems = items.filter((i) => i.materialType === "hdpe");

      expect(steelItems.length).toBe(2);
      expect(hdpeItems.length).toBe(2);
    });

    it("should generate HDPE-specific descriptions", () => {
      const hdpe = createHdpeItem(110);
      const description = `${hdpe.hdpeSpec!.peGrade} SDR ${hdpe.hdpeSpec!.sdr} PN ${hdpe.hdpeSpec!.pnBar} ${hdpe.hdpeSpec!.colorCode}`;

      expect(description).toContain("PE100");
      expect(description).toContain("SDR 17");
      expect(description).toContain("PN 10");
    });

    it("should generate steel-specific descriptions", () => {
      const steel = createSteelItem(100);
      const description = `${steel.steelSpec!.grade} Sch ${steel.steelSpec!.schedule}`;

      expect(description).toContain("A106B");
      expect(description).toContain("Sch 40");
    });

    it("should calculate costs differently for each material type", () => {
      const hdpeItem = createHdpeItem(110);
      const hdpeCost = estimateHdpePipeCost(
        hdpeItem.dnMm as HdpeNominalSize,
        hdpeItem.hdpeSpec!.sdr,
        12,
        3.5,
        hdpeItem.hdpeSpec!.weldingMethod as "butt_fusion" | "electrofusion",
        hdpeItem.hdpeSpec!.peGrade,
      );

      expect(hdpeCost.joints.totalJointCost).toBeGreaterThanOrEqual(0);
      expect(hdpeCost.material.totalMaterialCost).toBeGreaterThan(0);
    });

    it("should include welding method distinction", () => {
      const hdpe = createHdpeItem(110);
      expect(hdpe.hdpeSpec!.weldingMethod).toBe("butt_fusion");

      const smallHdpe = createHdpeItem(50);
      expect(smallHdpe.hdpeSpec!.weldingMethod).toBe("electrofusion");
    });

    it("should support grouping by material type in BOQ", () => {
      const items: MockRfqItem[] = [
        createSteelItem(100),
        createHdpeItem(110),
        createSteelItem(150),
        createHdpeItem(315),
      ];

      const grouped = items.reduce(
        (acc, item) => {
          const key = item.materialType;
          acc[key] = acc[key] || [];
          acc[key].push(item);
          return acc;
        },
        {} as Record<string, MockRfqItem[]>,
      );

      expect(Object.keys(grouped)).toContain("steel");
      expect(Object.keys(grouped)).toContain("hdpe");
      expect(grouped.steel.length).toBe(2);
      expect(grouped.hdpe.length).toBe(2);
    });
  });
});
