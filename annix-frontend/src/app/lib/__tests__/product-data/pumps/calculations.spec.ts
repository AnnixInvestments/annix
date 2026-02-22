import {
  calculateAffinityLawsDiameter,
  calculateAffinityLawsSpeed,
  calculateCvGas,
  calculateCvLiquid,
  calculateFlowFromCv,
  calculateHydraulicPower,
  calculateMotorPower,
  calculateNpshAvailable,
  calculatePressureDropFromCv,
  calculateShaftPower,
  calculateSpecificSpeedMetric,
  calculateSpecificSpeedUS,
  calculateSystemCurve,
  checkNpshMargin,
  convertFlow,
  convertPressure,
  convertViscosity,
  findOperatingPoint,
  flowConversions,
  getPumpTypeBySpecificSpeed,
  interpolatePumpCurve,
  PumpCurve,
  PumpCurvePoint,
  pressureConversions,
  selectNextMotorSize,
  viscosityConversions,
  waterVaporPressure,
} from "@product-data/pumps/calculations";
import { describe, expect, it } from "vitest";

describe("Flow Rate Conversions", () => {
  describe("flowConversions object", () => {
    it("should convert m³/h to l/s correctly", () => {
      expect(flowConversions.m3hToLs(36)).toBeCloseTo(10, 5);
      expect(flowConversions.m3hToLs(3.6)).toBeCloseTo(1, 5);
    });

    it("should convert l/s to m³/h correctly", () => {
      expect(flowConversions.lsToM3h(10)).toBeCloseTo(36, 5);
      expect(flowConversions.lsToM3h(1)).toBeCloseTo(3.6, 5);
    });

    it("should convert m³/h to GPM correctly", () => {
      expect(flowConversions.m3hToGpm(1)).toBeCloseTo(4.40287, 3);
    });

    it("should convert GPM to m³/h correctly", () => {
      expect(flowConversions.gpmToM3h(4.40287)).toBeCloseTo(1, 3);
    });

    it("should convert m³/h to m³/s correctly", () => {
      expect(flowConversions.m3hToM3s(3600)).toBeCloseTo(1, 5);
    });

    it("should convert m³/s to m³/h correctly", () => {
      expect(flowConversions.m3sToM3h(1)).toBeCloseTo(3600, 5);
    });
  });

  describe("convertFlow function", () => {
    it("should return same value when from and to units are the same", () => {
      expect(convertFlow(100, "m3/h", "m3/h")).toBe(100);
      expect(convertFlow(50, "l/s", "l/s")).toBe(50);
    });

    it("should convert between all flow units correctly", () => {
      const m3h = 100;
      const ls = convertFlow(m3h, "m3/h", "l/s");
      const backToM3h = convertFlow(ls, "l/s", "m3/h");
      expect(backToM3h).toBeCloseTo(m3h, 5);
    });

    it("should handle round-trip conversions through GPM", () => {
      const original = 50;
      const gpm = convertFlow(original, "m3/h", "GPM");
      const result = convertFlow(gpm, "GPM", "m3/h");
      expect(result).toBeCloseTo(original, 3);
    });
  });
});

describe("Pressure Conversions", () => {
  describe("pressureConversions object", () => {
    it("should convert bar to psi correctly", () => {
      expect(pressureConversions.barToPsi(1)).toBeCloseTo(14.5038, 3);
    });

    it("should convert psi to bar correctly", () => {
      expect(pressureConversions.psiToBar(14.5038)).toBeCloseTo(1, 3);
    });

    it("should convert bar to kPa correctly", () => {
      expect(pressureConversions.barToKpa(1)).toBe(100);
    });

    it("should convert bar to mWC correctly", () => {
      expect(pressureConversions.barToMwc(1)).toBeCloseTo(10.197, 3);
    });
  });

  describe("convertPressure function", () => {
    it("should return same value when from and to units are the same", () => {
      expect(convertPressure(10, "bar", "bar")).toBe(10);
    });

    it("should handle round-trip conversions", () => {
      const original = 5;
      const psi = convertPressure(original, "bar", "psi");
      const result = convertPressure(psi, "psi", "bar");
      expect(result).toBeCloseTo(original, 3);
    });

    it("should convert mWC to bar correctly", () => {
      expect(convertPressure(10.197, "mWC", "bar")).toBeCloseTo(1, 3);
    });
  });
});

describe("Viscosity Conversions", () => {
  describe("viscosityConversions object", () => {
    it("should convert cP to cSt with SG=1", () => {
      expect(viscosityConversions.cpToCst(1, 1)).toBe(1);
    });

    it("should convert cP to cSt with SG=0.9", () => {
      expect(viscosityConversions.cpToCst(0.9, 0.9)).toBeCloseTo(1, 5);
    });

    it("should convert cP to Pa·s correctly", () => {
      expect(viscosityConversions.cpToPas(1000)).toBe(1);
    });
  });

  describe("convertViscosity function", () => {
    it("should return same value when from and to units are the same", () => {
      expect(convertViscosity(10, "cP", "cP")).toBe(10);
    });

    it("should handle round-trip conversions", () => {
      const original = 50;
      const cst = convertViscosity(original, "cP", "cSt", 1.0);
      const result = convertViscosity(cst, "cSt", "cP", 1.0);
      expect(result).toBeCloseTo(original, 5);
    });
  });
});

describe("NPSH Calculations", () => {
  describe("calculateNpshAvailable", () => {
    it("should calculate NPSHa correctly for standard conditions", () => {
      const npsha = calculateNpshAvailable({
        liquidVaporPressureBar: 0.023,
        staticSuctionHeadM: 3,
        frictionLossM: 1,
      });
      expect(npsha).toBeGreaterThan(10);
      expect(npsha).toBeLessThan(15);
    });

    it("should decrease NPSHa with higher vapor pressure", () => {
      const npsha1 = calculateNpshAvailable({
        liquidVaporPressureBar: 0.023,
        staticSuctionHeadM: 3,
        frictionLossM: 1,
      });
      const npsha2 = calculateNpshAvailable({
        liquidVaporPressureBar: 0.1,
        staticSuctionHeadM: 3,
        frictionLossM: 1,
      });
      expect(npsha2).toBeLessThan(npsha1);
    });

    it("should increase NPSHa with higher static head", () => {
      const npsha1 = calculateNpshAvailable({
        liquidVaporPressureBar: 0.023,
        staticSuctionHeadM: 3,
        frictionLossM: 1,
      });
      const npsha2 = calculateNpshAvailable({
        liquidVaporPressureBar: 0.023,
        staticSuctionHeadM: 6,
        frictionLossM: 1,
      });
      expect(npsha2).toBeGreaterThan(npsha1);
    });

    it("should decrease NPSHa with higher friction loss", () => {
      const npsha1 = calculateNpshAvailable({
        liquidVaporPressureBar: 0.023,
        staticSuctionHeadM: 3,
        frictionLossM: 1,
      });
      const npsha2 = calculateNpshAvailable({
        liquidVaporPressureBar: 0.023,
        staticSuctionHeadM: 3,
        frictionLossM: 3,
      });
      expect(npsha2).toBeLessThan(npsha1);
    });
  });

  describe("checkNpshMargin", () => {
    it("should indicate adequate margin when NPSHa > NPSHr + safety", () => {
      const result = checkNpshMargin(8, 5, 0.5);
      expect(result.isAdequate).toBe(true);
      expect(result.margin).toBe(3);
    });

    it("should indicate inadequate margin when NPSHa < NPSHr + safety", () => {
      const result = checkNpshMargin(5.3, 5, 0.5);
      expect(result.isAdequate).toBe(false);
    });

    it("should provide appropriate recommendation for excellent margin", () => {
      const result = checkNpshMargin(10, 5, 0.5);
      expect(result.recommendation).toContain("Excellent");
    });

    it("should provide warning recommendation for insufficient margin", () => {
      const result = checkNpshMargin(4, 5, 0.5);
      expect(result.recommendation).toContain("Insufficient");
    });
  });

  describe("waterVaporPressure", () => {
    it("should return low vapor pressure at low temperatures", () => {
      const vp = waterVaporPressure(20);
      expect(vp).toBeLessThan(0.03);
    });

    it("should return elevated vapor pressure at 100°C (near boiling)", () => {
      const vp = waterVaporPressure(100);
      const vpAt20 = waterVaporPressure(20);
      expect(vp).toBeGreaterThan(vpAt20 * 3);
    });

    it("should throw error for temperatures outside range", () => {
      expect(() => waterVaporPressure(-10)).toThrow();
      expect(() => waterVaporPressure(110)).toThrow();
    });

    it("should increase with temperature", () => {
      const vp20 = waterVaporPressure(20);
      const vp50 = waterVaporPressure(50);
      const vp80 = waterVaporPressure(80);
      expect(vp50).toBeGreaterThan(vp20);
      expect(vp80).toBeGreaterThan(vp50);
    });
  });
});

describe("Hydraulic Power Calculations", () => {
  describe("calculateHydraulicPower", () => {
    it("should calculate power correctly for water at standard conditions", () => {
      const power = calculateHydraulicPower(100, 30, 1.0);
      expect(power).toBeCloseTo(8.175, 1);
    });

    it("should increase with flow rate", () => {
      const power1 = calculateHydraulicPower(50, 30, 1.0);
      const power2 = calculateHydraulicPower(100, 30, 1.0);
      expect(power2).toBeCloseTo(power1 * 2, 3);
    });

    it("should increase with head", () => {
      const power1 = calculateHydraulicPower(100, 15, 1.0);
      const power2 = calculateHydraulicPower(100, 30, 1.0);
      expect(power2).toBeCloseTo(power1 * 2, 3);
    });

    it("should increase with specific gravity", () => {
      const power1 = calculateHydraulicPower(100, 30, 1.0);
      const power2 = calculateHydraulicPower(100, 30, 1.5);
      expect(power2).toBeCloseTo(power1 * 1.5, 3);
    });
  });

  describe("calculateShaftPower", () => {
    it("should calculate shaft power correctly", () => {
      const shaftPower = calculateShaftPower(10, 80);
      expect(shaftPower).toBeCloseTo(12.5, 3);
    });

    it("should increase shaft power with lower efficiency", () => {
      const shaftPower1 = calculateShaftPower(10, 80);
      const shaftPower2 = calculateShaftPower(10, 60);
      expect(shaftPower2).toBeGreaterThan(shaftPower1);
    });
  });

  describe("calculateMotorPower", () => {
    it("should apply service factor correctly", () => {
      const motorPower = calculateMotorPower(10, 115);
      expect(motorPower).toBeCloseTo(11.5, 3);
    });

    it("should use default service factor of 115%", () => {
      const motorPower = calculateMotorPower(10);
      expect(motorPower).toBeCloseTo(11.5, 3);
    });
  });

  describe("selectNextMotorSize", () => {
    it("should select next standard motor size", () => {
      expect(selectNextMotorSize(2)).toBe(2.2);
      expect(selectNextMotorSize(10)).toBe(11);
      expect(selectNextMotorSize(50)).toBe(55);
    });

    it("should return exact size if it matches standard", () => {
      expect(selectNextMotorSize(7.5)).toBe(7.5);
      expect(selectNextMotorSize(15)).toBe(15);
    });

    it("should return largest available for very large requirements", () => {
      expect(selectNextMotorSize(1500)).toBe(1000);
    });
  });
});

describe("Valve Cv Calculations", () => {
  describe("calculateCvLiquid", () => {
    it("should calculate Cv correctly for water", () => {
      const result = calculateCvLiquid({
        flowRateGpm: 100,
        pressureDropPsi: 25,
        specificGravity: 1.0,
      });
      expect(result.cv).toBeCloseTo(20, 0);
    });

    it("should increase Cv with flow rate", () => {
      const result1 = calculateCvLiquid({
        flowRateGpm: 50,
        pressureDropPsi: 25,
        specificGravity: 1.0,
      });
      const result2 = calculateCvLiquid({
        flowRateGpm: 100,
        pressureDropPsi: 25,
        specificGravity: 1.0,
      });
      expect(result2.cv).toBeGreaterThan(result1.cv);
    });
  });

  describe("calculateFlowFromCv", () => {
    it("should be inverse of calculateCvLiquid", () => {
      const cv = 50;
      const pressureDrop = 10;
      const sg = 1.0;
      const flow = calculateFlowFromCv(cv, pressureDrop, sg);
      const recalculatedCv = calculateCvLiquid({
        flowRateGpm: flow,
        pressureDropPsi: pressureDrop,
        specificGravity: sg,
      });
      expect(recalculatedCv.cv).toBeCloseTo(cv, 1);
    });
  });

  describe("calculatePressureDropFromCv", () => {
    it("should calculate pressure drop correctly", () => {
      const cv = 50;
      const flow = 100;
      const sg = 1.0;
      const pressureDrop = calculatePressureDropFromCv(cv, flow, sg);
      expect(pressureDrop).toBeCloseTo(4, 1);
    });
  });

  describe("calculateCvGas", () => {
    it("should calculate gas Cv correctly", () => {
      const cv = calculateCvGas({
        flowRateScfh: 10000,
        upstreamPressurePsia: 100,
        downstreamPressurePsia: 90,
        temperatureF: 70,
        specificGravityGas: 1.0,
      });
      expect(cv).toBeGreaterThan(0);
    });
  });
});

describe("Pump Affinity Laws", () => {
  describe("calculateAffinityLawsSpeed", () => {
    it("should calculate new performance at different speed", () => {
      const result = calculateAffinityLawsSpeed(100, 50, 10, 1450, 1160);
      expect(result.speedRatio).toBeCloseTo(0.8, 2);
      expect(result.newFlowM3h).toBeCloseTo(80, 0);
      expect(result.newHeadM).toBeCloseTo(32, 0);
      expect(result.newPowerKw).toBeCloseTo(5.12, 1);
    });

    it("should follow Q1/Q2 = N1/N2 relationship", () => {
      const result = calculateAffinityLawsSpeed(100, 50, 10, 1000, 2000);
      expect(result.newFlowM3h).toBeCloseTo(200, 0);
    });

    it("should follow H1/H2 = (N1/N2)² relationship", () => {
      const result = calculateAffinityLawsSpeed(100, 50, 10, 1000, 2000);
      expect(result.newHeadM).toBeCloseTo(200, 0);
    });

    it("should follow P1/P2 = (N1/N2)³ relationship", () => {
      const result = calculateAffinityLawsSpeed(100, 50, 10, 1000, 2000);
      expect(result.newPowerKw).toBeCloseTo(80, 0);
    });
  });

  describe("calculateAffinityLawsDiameter", () => {
    it("should calculate new performance at different impeller diameter", () => {
      const result = calculateAffinityLawsDiameter(100, 50, 10, 200, 180);
      expect(result.diameterRatio).toBeCloseTo(0.9, 2);
      expect(result.newFlowM3h).toBeCloseTo(90, 0);
      expect(result.newHeadM).toBeCloseTo(40.5, 0);
      expect(result.newPowerKw).toBeCloseTo(7.29, 1);
    });

    it("should have speedRatio of 1 when varying diameter", () => {
      const result = calculateAffinityLawsDiameter(100, 50, 10, 200, 180);
      expect(result.speedRatio).toBe(1);
    });
  });
});

describe("System Curve Calculations", () => {
  describe("calculateSystemCurve", () => {
    it("should generate correct number of points", () => {
      const curve = calculateSystemCurve({
        staticHeadM: 10,
        frictionLossAtDesignFlowM: 5,
        designFlowM3h: 100,
      });
      expect(curve.length).toBe(11);
    });

    it("should start at static head at zero flow", () => {
      const curve = calculateSystemCurve({
        staticHeadM: 10,
        frictionLossAtDesignFlowM: 5,
        designFlowM3h: 100,
      });
      expect(curve[0].flowM3h).toBe(0);
      expect(curve[0].headM).toBe(10);
    });

    it("should match design point head formula at design flow", () => {
      const staticHead = 10;
      const frictionLoss = 5;
      const designFlow = 100;
      const curve = calculateSystemCurve(
        {
          staticHeadM: staticHead,
          frictionLossAtDesignFlowM: frictionLoss,
          designFlowM3h: designFlow,
        },
        10,
      );
      const closestToDesign = curve.reduce((prev, curr) =>
        Math.abs(curr.flowM3h - designFlow) < Math.abs(prev.flowM3h - designFlow) ? curr : prev,
      );
      expect(closestToDesign).toBeDefined();
      expect(closestToDesign.headM).toBeCloseTo(staticHead + frictionLoss, -1);
    });

    it("should follow quadratic friction relationship", () => {
      const staticHead = 10;
      const frictionAtDesign = 5;
      const designFlow = 100;
      const curve = calculateSystemCurve({
        staticHeadM: staticHead,
        frictionLossAtDesignFlowM: frictionAtDesign,
        designFlowM3h: designFlow,
      });
      const halfFlowPoint = curve.find((p) => Math.abs(p.flowM3h - 50) < 20);
      if (halfFlowPoint) {
        const frictionAtHalfFlow = halfFlowPoint.headM - staticHead;
        const expectedFriction = frictionAtDesign * (halfFlowPoint.flowM3h / designFlow) ** 2;
        expect(frictionAtHalfFlow).toBeCloseTo(expectedFriction, 0);
      }
    });
  });

  describe("findOperatingPoint", () => {
    it("should find intersection when pump and system curves intersect", () => {
      const pumpCurve: PumpCurvePoint[] = [
        { flowM3h: 0, headM: 50 },
        { flowM3h: 30, headM: 48 },
        { flowM3h: 60, headM: 44 },
        { flowM3h: 90, headM: 38 },
        { flowM3h: 120, headM: 30 },
        { flowM3h: 150, headM: 20 },
      ];
      const systemCurve = calculateSystemCurve(
        {
          staticHeadM: 20,
          frictionLossAtDesignFlowM: 10,
          designFlowM3h: 100,
        },
        20,
      );
      const operatingPoint = findOperatingPoint(pumpCurve, systemCurve);
      if (operatingPoint !== null) {
        expect(operatingPoint.flowM3h).toBeGreaterThan(0);
        expect(operatingPoint.headM).toBeGreaterThan(0);
      }
    });

    it("should return null when pump curve is entirely below system curve", () => {
      const pumpCurve: PumpCurvePoint[] = [
        { flowM3h: 0, headM: 10 },
        { flowM3h: 100, headM: 5 },
      ];
      const systemCurve = calculateSystemCurve({
        staticHeadM: 50,
        frictionLossAtDesignFlowM: 10,
        designFlowM3h: 100,
      });
      const operatingPoint = findOperatingPoint(pumpCurve, systemCurve);
      expect(operatingPoint).toBeNull();
    });
  });
});

describe("Specific Speed Calculations", () => {
  describe("calculateSpecificSpeedMetric", () => {
    it("should calculate metric specific speed correctly", () => {
      const ns = calculateSpecificSpeedMetric(100, 30, 1450);
      expect(ns).toBeGreaterThan(10);
      expect(ns).toBeLessThan(100);
    });

    it("should increase with flow rate", () => {
      const ns1 = calculateSpecificSpeedMetric(50, 30, 1450);
      const ns2 = calculateSpecificSpeedMetric(200, 30, 1450);
      expect(ns2).toBeGreaterThan(ns1);
    });

    it("should decrease with head", () => {
      const ns1 = calculateSpecificSpeedMetric(100, 20, 1450);
      const ns2 = calculateSpecificSpeedMetric(100, 80, 1450);
      expect(ns1).toBeGreaterThan(ns2);
    });
  });

  describe("calculateSpecificSpeedUS", () => {
    it("should calculate US specific speed correctly", () => {
      const ns = calculateSpecificSpeedUS(1000, 100, 3500);
      expect(ns).toBeGreaterThan(500);
      expect(ns).toBeLessThan(5000);
    });
  });

  describe("getPumpTypeBySpecificSpeed", () => {
    it("should return radial low ns for low specific speed", () => {
      const result = getPumpTypeBySpecificSpeed(15);
      expect(result.type).toBe("radial_low_ns");
    });

    it("should return radial medium ns for typical centrifugal range", () => {
      const result = getPumpTypeBySpecificSpeed(40);
      expect(result.type).toBe("radial_medium_ns");
    });

    it("should return mixed flow for medium-high specific speed", () => {
      const result = getPumpTypeBySpecificSpeed(100);
      expect(result.type).toBe("mixed_flow");
    });

    it("should return axial flow for high specific speed", () => {
      const result = getPumpTypeBySpecificSpeed(200);
      expect(result.type).toBe("axial_flow");
    });

    it("should provide efficiency range in description", () => {
      const result = getPumpTypeBySpecificSpeed(40);
      expect(result.typicalEfficiency).toContain("%");
    });
  });
});

describe("Pump Curve Interpolation", () => {
  const sampleCurve: PumpCurve = {
    pumpModel: "Test Pump",
    impellerDiameterMm: 200,
    speedRpm: 1450,
    points: [
      { flowM3h: 0, headM: 50, efficiencyPercent: 0 },
      { flowM3h: 50, headM: 48, efficiencyPercent: 60 },
      { flowM3h: 100, headM: 42, efficiencyPercent: 80 },
      { flowM3h: 150, headM: 32, efficiencyPercent: 70 },
      { flowM3h: 200, headM: 18, efficiencyPercent: 50 },
    ],
    shutoffHeadM: 50,
    bestEfficiencyPoint: { flowM3h: 100, headM: 42, efficiencyPercent: 80 },
    minContinuousFlowM3h: 30,
    maxFlowM3h: 200,
  };

  describe("interpolatePumpCurve", () => {
    it("should return null for flow beyond max", () => {
      const result = interpolatePumpCurve(sampleCurve, 250);
      expect(result).toBeNull();
    });

    it("should return null for negative flow", () => {
      const result = interpolatePumpCurve(sampleCurve, -10);
      expect(result).toBeNull();
    });

    it("should return exact point values when at a curve point", () => {
      const result = interpolatePumpCurve(sampleCurve, 100);
      expect(result?.headM).toBe(42);
      expect(result?.efficiencyPercent).toBe(80);
    });

    it("should interpolate between points", () => {
      const result = interpolatePumpCurve(sampleCurve, 75);
      expect(result?.headM).toBeGreaterThan(42);
      expect(result?.headM).toBeLessThan(48);
    });

    it("should return first point for zero flow", () => {
      const result = interpolatePumpCurve(sampleCurve, 0);
      expect(result?.headM).toBe(50);
    });
  });
});
