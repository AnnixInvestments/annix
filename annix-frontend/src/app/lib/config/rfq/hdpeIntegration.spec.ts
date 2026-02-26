import { describe, expect, it } from "vitest";
import { type HdpeNominalSize, pipeDimensions, totalPipeWeight } from "./hdpeDimensions";
import type { HdpeGradeCode } from "./hdpeGrades";
import {
  buttFusionJointCost,
  calculateHdpeMaterialCost,
  electrofusionJointCost,
  estimateHdpeFittingCost,
  estimateHdpePipeCost,
  machineRentalCost,
  optimalPipeConfiguration,
} from "./hdpePricing";
import type { SdrValue } from "./hdpeSdrRatings";
import { calculatePnFromSdr, selectSdrForPressure } from "./hdpeSdrRatings";
import { validateHdpeSpecification } from "./hdpeStandards";
import { deratedPressure, deratingFactorForTemperature } from "./hdpeTemperatureDerating";
import type { HdpeWeldingMethod } from "./hdpeWelding";
import {
  buttFusionParametersForDn,
  HDPE_WELDING_METHODS,
  recommendedWeldingMethod,
  suitableWeldingMethods,
} from "./hdpeWelding";
import { standardByCode, WELDING_STANDARDS } from "./hdpeWeldingStandards";

interface MockHdpeRfqItem {
  id: string;
  itemType: "straight_pipe" | "bend" | "fitting";
  materialType: "hdpe";
  description: string;
  specs: {
    nominalDiameterMm: number;
    lengthM?: number;
    quantityValue: number;
  };
  hdpeSpecs: {
    peGrade: HdpeGradeCode;
    sdr: SdrValue;
    pnRating: number;
    colorCode: "black" | "blue" | "yellow";
    operatingTempC: number;
    weldingMethod: HdpeWeldingMethod;
    weldingStandard: string;
    jointCount: number;
  };
}

interface MockSteelRfqItem {
  id: string;
  itemType: "straight_pipe" | "bend" | "fitting";
  materialType: "steel";
  description: string;
  specs: {
    nominalDiameterMm: number;
    scheduleNumber: string;
    lengthM?: number;
    quantityValue: number;
    steelSpecificationId: number;
  };
}

type MockRfqItem = MockHdpeRfqItem | MockSteelRfqItem;

const createHdpeRfqItem = (
  itemType: "straight_pipe" | "bend" | "fitting",
  dnMm: number,
  lengthM: number,
  peGrade: HdpeGradeCode,
  sdr: SdrValue,
  operatingTempC: number = 20,
): MockHdpeRfqItem => {
  const pnRating = calculatePnFromSdr(sdr, peGrade);
  const weldingMethod = recommendedWeldingMethod(dnMm, true);
  const config = optimalPipeConfiguration(dnMm as HdpeNominalSize, lengthM);
  const weldingStandard = weldingMethod === "butt_fusion" ? "ISO_21307" : "DVS_2207_1";
  const colorCode = "blue";

  return {
    id: `hdpe-${itemType}-${Date.now()}`,
    itemType,
    materialType: "hdpe",
    description: `HDPE ${itemType} DN${dnMm} SDR${sdr} ${peGrade}`,
    specs: {
      nominalDiameterMm: dnMm,
      lengthM,
      quantityValue: 1,
    },
    hdpeSpecs: {
      peGrade,
      sdr,
      pnRating,
      colorCode,
      operatingTempC,
      weldingMethod,
      weldingStandard,
      jointCount: config.jointCount,
    },
  };
};

const createSteelRfqItem = (
  itemType: "straight_pipe" | "bend" | "fitting",
  dnMm: number,
  schedule: string,
  lengthM: number,
): MockSteelRfqItem => {
  return {
    id: `steel-${itemType}-${Date.now()}`,
    itemType,
    materialType: "steel",
    description: `Steel ${itemType} DN${dnMm} ${schedule}`,
    specs: {
      nominalDiameterMm: dnMm,
      scheduleNumber: schedule,
      lengthM,
      quantityValue: 1,
      steelSpecificationId: 1,
    },
  };
};

describe("HDPE Integration Tests", () => {
  describe("HDPE RFQ Item Creation Flow", () => {
    describe("Creating HDPE Straight Pipe Items", () => {
      it("should create valid HDPE straight pipe item with all required fields", () => {
        const item = createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17);

        expect(item.materialType).toBe("hdpe");
        expect(item.itemType).toBe("straight_pipe");
        expect(item.specs.nominalDiameterMm).toBe(110);
        expect(item.hdpeSpecs.peGrade).toBe("PE100");
        expect(item.hdpeSpecs.sdr).toBe(17);
        expect(item.hdpeSpecs.pnRating).toBeGreaterThan(0);
      });

      it("should auto-calculate PN rating based on grade and SDR", () => {
        const item = createHdpeRfqItem("straight_pipe", 315, 50, "PE100", 11);

        expect(item.hdpeSpecs.pnRating).toBeCloseTo(16, 0);
      });

      it("should auto-select appropriate welding method based on diameter", () => {
        const largePipe = createHdpeRfqItem("straight_pipe", 315, 100, "PE100", 17);
        expect(largePipe.hdpeSpecs.weldingMethod).toBe("butt_fusion");

        const smallPipe = createHdpeRfqItem("straight_pipe", 50, 100, "PE100", 11);
        expect(smallPipe.hdpeSpecs.weldingMethod).toBe("electrofusion");
      });

      it("should calculate joint count based on pipe length", () => {
        const item = createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17);

        expect(item.hdpeSpecs.jointCount).toBeGreaterThan(0);
        const expectedConfig = optimalPipeConfiguration(110, 100);
        expect(item.hdpeSpecs.jointCount).toBe(expectedConfig.jointCount);
      });

      it("should handle various PE grades correctly", () => {
        const pe80Item = createHdpeRfqItem("straight_pipe", 110, 50, "PE80", 17);
        const pe100Item = createHdpeRfqItem("straight_pipe", 110, 50, "PE100", 17);
        const pe4710Item = createHdpeRfqItem("straight_pipe", 110, 50, "PE4710", 17);

        expect(pe80Item.hdpeSpecs.pnRating).toBeLessThan(pe100Item.hdpeSpecs.pnRating);
        expect(pe100Item.hdpeSpecs.pnRating).toBeCloseTo(pe4710Item.hdpeSpecs.pnRating, 0);
      });
    });

    describe("Creating HDPE Bend Items", () => {
      it("should create HDPE bend with appropriate specs", () => {
        const bend = createHdpeRfqItem("bend", 160, 2, "PE100", 11);

        expect(bend.itemType).toBe("bend");
        expect(bend.materialType).toBe("hdpe");
        expect(bend.hdpeSpecs.peGrade).toBe("PE100");
      });
    });

    describe("Creating HDPE Fitting Items", () => {
      it("should create HDPE fitting with appropriate specs", () => {
        const fitting = createHdpeRfqItem("fitting", 110, 1, "PE100", 17);

        expect(fitting.itemType).toBe("fitting");
        expect(fitting.materialType).toBe("hdpe");
      });
    });

    describe("Temperature Derating in Item Creation", () => {
      it("should apply temperature derating when operating temp > 20C", () => {
        const item20C = createHdpeRfqItem("straight_pipe", 110, 50, "PE100", 17, 20);
        const item40C = createHdpeRfqItem("straight_pipe", 110, 50, "PE100", 17, 40);

        const basePn = calculatePnFromSdr(17, "PE100");
        const deratedPn40 = deratedPressure(basePn, 40).deratedPnBar;

        expect(item20C.hdpeSpecs.pnRating).toBeCloseTo(basePn, 1);
        expect(deratedPn40).toBeLessThan(item20C.hdpeSpecs.pnRating);
      });

      it("should validate specification against operating conditions", () => {
        const validation20C = validateHdpeSpecification("PE100", 17, 10, 20, 315);
        const validation50C = validateHdpeSpecification("PE100", 17, 10, 50, 315);

        expect(validation20C.overall).toBe(true);
        expect(validation50C.overall).toBe(false);
      });
    });
  });

  describe("Welding Parameter Auto-Population", () => {
    describe("Butt Fusion Parameters", () => {
      it("should auto-populate butt fusion parameters for DN 110", () => {
        const params = buttFusionParametersForDn(110);

        expect(params).not.toBeNull();
        expect(params?.heatingTimeSec.min).toBeGreaterThan(100);
        expect(params?.heatingTimeSec.max).toBeGreaterThan(params?.heatingTimeSec.min ?? 0);
        expect(params?.changeoverTimeSec).toBeGreaterThan(0);
        expect(params?.coolingTimeMin).toBeGreaterThan(15);
        expect(params?.heatPlateTemperatureC.min).toBeGreaterThanOrEqual(200);
        expect(params?.heatPlateTemperatureC.max).toBeLessThanOrEqual(230);
      });

      it("should auto-populate butt fusion parameters for DN 315", () => {
        const params = buttFusionParametersForDn(315);

        expect(params).not.toBeNull();
        expect(params?.heatingTimeSec.min).toBeGreaterThan(300);
        expect(params?.coolingTimeMin).toBeGreaterThan(40);
      });

      it("should auto-populate butt fusion parameters for large pipe DN 630", () => {
        const params = buttFusionParametersForDn(630);

        expect(params).not.toBeNull();
        expect(params?.heatingTimeSec.min).toBeGreaterThan(800);
        expect(params?.coolingTimeMin).toBeGreaterThan(80);
      });

      it("should return closest parameters for intermediate sizes", () => {
        const params200 = buttFusionParametersForDn(200);
        const params250 = buttFusionParametersForDn(250);
        const params220 = buttFusionParametersForDn(220);

        expect(params220).not.toBeNull();
        expect(params220?.coolingTimeMin).toBeGreaterThanOrEqual(params200?.coolingTimeMin ?? 0);
        expect(params220?.coolingTimeMin).toBeLessThanOrEqual(params250?.coolingTimeMin ?? 100);
      });
    });

    describe("Welding Method Suitability", () => {
      it("should determine suitable methods for DN 110", () => {
        const methods = suitableWeldingMethods(110);

        const buttFusion = methods.find((m) => m.method === "butt_fusion");
        const electrofusion = methods.find((m) => m.method === "electrofusion");

        expect(buttFusion?.suitable).toBe(true);
        expect(electrofusion?.suitable).toBe(true);
      });

      it("should limit electrofusion for large diameters", () => {
        const methods = suitableWeldingMethods(700);

        const electrofusion = methods.find((m) => m.method === "electrofusion");
        expect(electrofusion?.suitable).toBe(false);
        expect(electrofusion?.reason).toContain("exceeds maximum");
      });

      it("should limit butt fusion for small diameters", () => {
        const methods = suitableWeldingMethods(50);

        const buttFusion = methods.find((m) => m.method === "butt_fusion");
        expect(buttFusion?.suitable).toBe(false);
        expect(buttFusion?.reason).toContain("below minimum");
      });
    });

    describe("Welding Standard Auto-Selection", () => {
      it("should provide ISO 21307 standard parameters", () => {
        const standard = standardByCode("ISO_21307");

        expect(standard).not.toBeNull();
        expect(standard?.name).toContain("ISO");
        expect(standard?.heatPlateTemperatureC.min).toBeGreaterThanOrEqual(200);
      });

      it("should provide DVS 2207-1 standard parameters", () => {
        const standard = standardByCode("DVS_2207_1");

        expect(standard).not.toBeNull();
        expect(standard?.name).toContain("DVS");
      });

      it("should provide ASTM F2620 standard parameters", () => {
        const standard = standardByCode("ASTM_F2620");

        expect(standard).not.toBeNull();
        expect(standard?.region).toBe("US");
      });

      it("should have all required welding standards defined", () => {
        expect(WELDING_STANDARDS.ISO_21307).toBeDefined();
        expect(WELDING_STANDARDS.DVS_2207_1).toBeDefined();
        expect(WELDING_STANDARDS.ASTM_F2620).toBeDefined();
      });
    });

    describe("Equipment Requirements Auto-Population", () => {
      it("should list required equipment for butt fusion", () => {
        const bf = HDPE_WELDING_METHODS.butt_fusion;

        expect(bf.equipmentRequired).toContain("Butt fusion machine");
        expect(bf.equipmentRequired).toContain("Heater plate");
        expect(bf.equipmentRequired.length).toBeGreaterThan(2);
      });

      it("should list required equipment for electrofusion", () => {
        const ef = HDPE_WELDING_METHODS.electrofusion;

        expect(ef.equipmentRequired).toContain("Electrofusion control unit");
        expect(ef.equipmentRequired).toContain("Pipe scraper");
      });
    });
  });

  describe("Pricing Calculation with HDPE Items", () => {
    describe("Material Cost Calculation", () => {
      it("should calculate material cost based on weight and price per kg", () => {
        const pricePerKg = 25;
        const result = calculateHdpeMaterialCost(110, 17, 100, pricePerKg, "PE100");

        expect(result.totalWeightKg).toBeGreaterThan(0);
        expect(result.totalMaterialCost).toBe(
          Math.round(result.totalWeightKg * pricePerKg * 100) / 100,
        );
      });

      it("should calculate higher cost for thicker wall (lower SDR)", () => {
        const pricePerKg = 25;
        const sdr17 = calculateHdpeMaterialCost(110, 17, 100, pricePerKg, "PE100");
        const sdr11 = calculateHdpeMaterialCost(110, 11, 100, pricePerKg, "PE100");

        expect(sdr11.totalWeightKg).toBeGreaterThan(sdr17.totalWeightKg);
        expect(sdr11.totalMaterialCost).toBeGreaterThan(sdr17.totalMaterialCost);
      });
    });

    describe("Joint Cost Calculation", () => {
      it("should calculate butt fusion joint cost", () => {
        const cost = buttFusionJointCost(110);

        expect(cost.method).toBe("butt_fusion");
        expect(cost.laborCost).toBeGreaterThan(0);
        expect(cost.consumablesCost).toBeGreaterThan(0);
        expect(cost.totalPerJoint).toBe(cost.laborCost + cost.consumablesCost);
      });

      it("should calculate electrofusion joint cost including fitting", () => {
        const cost = electrofusionJointCost(110);

        expect(cost.method).toBe("electrofusion");
        expect(cost.fittingCost).toBeGreaterThan(0);
        expect(cost.totalPerJoint).toBeGreaterThan(cost.laborCost + cost.consumablesCost);
      });

      it("should have higher joint cost for larger diameters", () => {
        const small = buttFusionJointCost(110);
        const large = buttFusionJointCost(400);

        expect(large.totalPerJoint).toBeGreaterThan(small.totalPerJoint);
      });
    });

    describe("Complete Pipe Cost Estimate", () => {
      it("should calculate total cost including material and joints", () => {
        const estimate = estimateHdpePipeCost(110, 17, 100, 25, "butt_fusion", "PE100");

        expect(estimate.material.totalMaterialCost).toBeGreaterThan(0);
        expect(estimate.joints.jointCount).toBeGreaterThan(0);
        expect(estimate.joints.totalJointCost).toBeGreaterThan(0);
        expect(estimate.totalCost).toBe(
          estimate.material.totalMaterialCost + estimate.joints.totalJointCost,
        );
      });

      it("should include machine rental information", () => {
        const estimate = estimateHdpePipeCost(315, 17, 200, 25, "butt_fusion", "PE100");

        expect(estimate.machineRental).not.toBeNull();
        expect(estimate.machineRental?.dailyRate).toBeGreaterThan(0);
      });

      it("should calculate electrofusion cost with fitting costs", () => {
        const estimate = estimateHdpePipeCost(63, 11, 50, 25, "electrofusion", "PE100");

        expect(estimate.joints.method).toBe("electrofusion");
        expect(estimate.joints.costPerJoint.fittingCost).toBeGreaterThan(0);
      });

      it("should use coil configuration for small diameter short runs", () => {
        const estimate = estimateHdpePipeCost(63, 17, 50, 25, "butt_fusion", "PE100");

        expect(estimate.configuration.useCoil).toBe(true);
        expect(estimate.joints.jointCount).toBe(0);
      });
    });

    describe("Fitting Cost Estimate", () => {
      it("should calculate fitting cost with joints", () => {
        const estimate = estimateHdpeFittingCost("tee", 110, 5, 25, 2, "butt_fusion");

        expect(estimate.materialCost).toBe(5 * 25);
        expect(estimate.jointCount).toBe(2);
        expect(estimate.totalJointCost).toBeGreaterThan(0);
        expect(estimate.totalCost).toBeCloseTo(estimate.materialCost + estimate.totalJointCost, 2);
      });
    });

    describe("Machine Rental Cost", () => {
      it("should calculate rental cost for multiple joints", () => {
        const rental = machineRentalCost(315, 20, 8);

        expect(rental.machine).not.toBeNull();
        expect(rental.days).toBe(3);
        expect(rental.cost).toBeGreaterThan(0);
      });

      it("should use weekly rate when more economical", () => {
        const rental = machineRentalCost(315, 50, 8);

        expect(rental.days).toBeGreaterThan(6);
      });
    });
  });

  describe("Mixed Steel/HDPE RFQ Handling", () => {
    describe("Material Type Differentiation", () => {
      it("should correctly identify HDPE items", () => {
        const hdpeItem = createHdpeRfqItem("straight_pipe", 110, 50, "PE100", 17);
        const steelItem = createSteelRfqItem("straight_pipe", 100, "STD", 50);

        expect(hdpeItem.materialType).toBe("hdpe");
        expect(steelItem.materialType).toBe("steel");
      });

      it("should handle mixed item list", () => {
        const items: MockRfqItem[] = [
          createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17),
          createSteelRfqItem("straight_pipe", 100, "STD", 100),
          createHdpeRfqItem("bend", 160, 2, "PE100", 11),
          createSteelRfqItem("fitting", 150, "XS", 1),
        ];

        const hdpeItems = items.filter((i) => i.materialType === "hdpe");
        const steelItems = items.filter((i) => i.materialType === "steel");

        expect(hdpeItems).toHaveLength(2);
        expect(steelItems).toHaveLength(2);
      });
    });

    describe("HDPE-Specific Field Isolation", () => {
      it("should only have HDPE specs on HDPE items", () => {
        const hdpeItem = createHdpeRfqItem("straight_pipe", 110, 50, "PE100", 17);
        const steelItem = createSteelRfqItem("straight_pipe", 100, "STD", 50);

        expect((hdpeItem as MockHdpeRfqItem).hdpeSpecs).toBeDefined();
        expect((steelItem as MockSteelRfqItem).specs.steelSpecificationId).toBeDefined();
        expect((steelItem as unknown as { hdpeSpecs?: unknown }).hdpeSpecs).toBeUndefined();
      });
    });

    describe("Cost Calculation Separation", () => {
      it("should calculate HDPE costs using joint-based pricing", () => {
        const hdpeItem = createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17);
        const estimate = estimateHdpePipeCost(
          hdpeItem.specs.nominalDiameterMm as HdpeNominalSize,
          hdpeItem.hdpeSpecs.sdr,
          hdpeItem.specs.lengthM ?? 0,
          25,
          hdpeItem.hdpeSpecs.weldingMethod,
          hdpeItem.hdpeSpecs.peGrade,
        );

        expect(estimate.joints.jointCount).toBeGreaterThan(0);
        expect(estimate.totalCost).toBeGreaterThan(0);
      });
    });

    describe("Mixed RFQ Summary", () => {
      it("should summarize mixed RFQ with both material types", () => {
        const items: MockRfqItem[] = [
          createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17),
          createSteelRfqItem("straight_pipe", 100, "STD", 100),
          createHdpeRfqItem("straight_pipe", 315, 200, "PE100", 11),
        ];

        const summary = {
          totalItems: items.length,
          hdpeItems: items.filter((i) => i.materialType === "hdpe").length,
          steelItems: items.filter((i) => i.materialType === "steel").length,
          hdpeTotalLength: items
            .filter((i): i is MockHdpeRfqItem => i.materialType === "hdpe")
            .reduce((sum, i) => sum + (i.specs.lengthM ?? 0), 0),
        };

        expect(summary.totalItems).toBe(3);
        expect(summary.hdpeItems).toBe(2);
        expect(summary.steelItems).toBe(1);
        expect(summary.hdpeTotalLength).toBe(300);
      });

      it("should calculate total HDPE weight for RFQ", () => {
        const items: MockHdpeRfqItem[] = [
          createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17),
          createHdpeRfqItem("straight_pipe", 315, 50, "PE100", 17),
        ];

        const totalWeight = items.reduce((sum, item) => {
          const weight = totalPipeWeight(
            item.specs.nominalDiameterMm as 110 | 315,
            item.hdpeSpecs.sdr,
            item.specs.lengthM ?? 0,
            item.specs.quantityValue,
            item.hdpeSpecs.peGrade,
          );
          return sum + weight;
        }, 0);

        expect(totalWeight).toBeGreaterThan(0);
      });

      it("should calculate total HDPE joint count for RFQ", () => {
        const items: MockHdpeRfqItem[] = [
          createHdpeRfqItem("straight_pipe", 110, 100, "PE100", 17),
          createHdpeRfqItem("straight_pipe", 315, 200, "PE100", 11),
        ];

        const totalJoints = items.reduce((sum, item) => sum + item.hdpeSpecs.jointCount, 0);

        expect(totalJoints).toBeGreaterThan(0);
      });
    });

    describe("Validation for Mixed RFQ", () => {
      it("should validate HDPE items independently", () => {
        const hdpeItem = createHdpeRfqItem("straight_pipe", 315, 100, "PE100", 17, 40);

        const validation = validateHdpeSpecification(
          hdpeItem.hdpeSpecs.peGrade,
          hdpeItem.hdpeSpecs.sdr,
          8,
          hdpeItem.hdpeSpecs.operatingTempC,
          hdpeItem.specs.nominalDiameterMm,
        );

        expect(validation.overall).toBeDefined();
        expect(validation.applicableStandards.length).toBeGreaterThan(0);
      });
    });
  });

  describe("End-to-End HDPE RFQ Flow", () => {
    it("should complete full HDPE pipe specification flow", () => {
      const dnMm: HdpeNominalSize = 315;
      const lengthM = 500;
      const requiredPnBar = 10;
      const operatingTempC = 30;
      const pricePerKg = 28;

      const selectedGrade: HdpeGradeCode = "PE100";
      const deratingFactor = deratingFactorForTemperature(operatingTempC);
      const requiredBasePn = Math.ceil(requiredPnBar / deratingFactor);
      const selectedSdr = selectSdrForPressure(requiredBasePn, selectedGrade);
      expect(selectedSdr).not.toBeNull();

      const basePn = calculatePnFromSdr(selectedSdr!, selectedGrade);
      expect(basePn).toBeGreaterThanOrEqual(requiredBasePn);

      const derating = deratedPressure(basePn, operatingTempC);
      expect(derating.deratedPnBar).toBeGreaterThanOrEqual(requiredPnBar);

      const dims = pipeDimensions(dnMm, selectedSdr!, selectedGrade);
      expect(dims.wallMm).toBeGreaterThan(0);
      expect(dims.weightKgM).toBeGreaterThan(0);

      const weldingMethod = recommendedWeldingMethod(dnMm, true);
      expect(weldingMethod).toBe("butt_fusion");

      const weldParams = buttFusionParametersForDn(dnMm);
      expect(weldParams).not.toBeNull();

      const config = optimalPipeConfiguration(dnMm, lengthM);
      expect(config.jointCount).toBeGreaterThan(0);

      const estimate = estimateHdpePipeCost(
        dnMm,
        selectedSdr!,
        lengthM,
        pricePerKg,
        weldingMethod,
        selectedGrade,
      );
      expect(estimate.totalCost).toBeGreaterThan(0);

      const validation = validateHdpeSpecification(
        selectedGrade,
        selectedSdr!,
        requiredPnBar,
        operatingTempC,
        dnMm,
      );
      expect(validation.overall).toBe(true);
    });

    it("should handle elevated temperature application correctly", () => {
      const dnMm: HdpeNominalSize = 160;
      const lengthM = 200;
      const requiredPnBar = 8;
      const operatingTempC = 45;

      const selectedSdr = selectSdrForPressure(
        Math.ceil(requiredPnBar / deratingFactorForTemperature(operatingTempC)),
        "PE100",
      );
      expect(selectedSdr).not.toBeNull();

      const basePn = calculatePnFromSdr(selectedSdr!, "PE100");
      const derating = deratedPressure(basePn, operatingTempC);

      expect(derating.deratedPnBar).toBeGreaterThanOrEqual(requiredPnBar);

      const validation = validateHdpeSpecification(
        "PE100",
        selectedSdr!,
        requiredPnBar,
        operatingTempC,
        dnMm,
      );

      expect(validation.temperatureValidation.valid).toBe(true);
    });
  });
});
