import { Test, TestingModule } from "@nestjs/testing";
import { ReducerType } from "./dto/calculate-reducer.dto";
import { ReducerCalculatorService } from "./reducer-calculator.service";

describe("ReducerCalculatorService", () => {
  let service: ReducerCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReducerCalculatorService],
    }).compile();

    service = module.get<ReducerCalculatorService>(ReducerCalculatorService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateMass", () => {
    it("should calculate mass for Graham Dell example values", () => {
      const result = service.calculateMass({
        largeDiameterMm: 925,
        smallDiameterMm: 614,
        lengthMm: 980,
        wallThicknessMm: 10,
        densityKgM3: 7850,
      });

      expect(result.largeDiameterMm).toBe(925);
      expect(result.smallDiameterMm).toBe(614);
      expect(result.largeInnerDiameterMm).toBe(905);
      expect(result.smallInnerDiameterMm).toBe(594);
      expect(result.massPerUnitKg).toBeGreaterThan(0);
      expect(result.quantity).toBe(1);
      expect(result.reducerType).toBe(ReducerType.CONCENTRIC);
    });

    it("should calculate correct inner diameters", () => {
      const result = service.calculateMass({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.largeInnerDiameterMm).toBe(384);
      expect(result.smallInnerDiameterMm).toBe(284);
    });

    it("should handle quantity multiplier", () => {
      const singleResult = service.calculateMass({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
        quantity: 1,
      });

      const multiResult = service.calculateMass({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
        quantity: 5,
      });

      expect(multiResult.totalMassKg).toBeCloseTo(singleResult.massPerUnitKg * 5, 1);
      expect(multiResult.quantity).toBe(5);
    });

    it("should use default density when not provided", () => {
      const result = service.calculateMass({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.densityKgM3).toBe(7850);
    });

    it("should verify frustum volume formula (π/12 × h × (D² + Dd + d²))", () => {
      const result = service.calculateMass({
        largeDiameterMm: 100,
        smallDiameterMm: 50,
        lengthMm: 100,
        wallThicknessMm: 5,
        densityKgM3: 7850,
      });

      const D = 100;
      const d = 50;
      const h = 100;
      const expectedOuterVolumeMm3 = (Math.PI / 12) * h * (D * D + D * d + d * d);
      const expectedOuterVolumeM3 = expectedOuterVolumeMm3 / 1e9;

      expect(result.outerVolumeM3).toBeCloseTo(expectedOuterVolumeM3, 6);
    });
  });

  describe("calculateArea", () => {
    it("should calculate slant height correctly", () => {
      const result = service.calculateArea({
        largeDiameterMm: 925,
        smallDiameterMm: 614,
        lengthMm: 980,
        wallThicknessMm: 10,
      });

      const largeR = 925 / 2;
      const smallR = 614 / 2;
      const expectedSlant = Math.sqrt((largeR - smallR) ** 2 + 980 ** 2);

      expect(result.slantHeightMm).toBeCloseTo(expectedSlant, 1);
    });

    it("should calculate cone angle correctly", () => {
      const result = service.calculateArea({
        largeDiameterMm: 400,
        smallDiameterMm: 200,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      const largeR = 400 / 2;
      const smallR = 200 / 2;
      const expectedAngleRad = Math.atan((largeR - smallR) / 280);
      const expectedAngleDeg = (expectedAngleRad * 180) / Math.PI;

      expect(result.coneAngleDegrees).toBeCloseTo(expectedAngleDeg, 1);
    });

    it("should calculate external and internal areas", () => {
      const result = service.calculateArea({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.reducerExternalAreaM2).toBeGreaterThan(0);
      expect(result.reducerInternalAreaM2).toBeGreaterThan(0);
      expect(result.reducerExternalAreaM2).toBeGreaterThan(result.reducerInternalAreaM2);
    });

    it("should handle extension lengths", () => {
      const withoutExtensions = service.calculateArea({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      const withExtensions = service.calculateArea({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
        extensionLargeMm: 100,
        extensionSmallMm: 100,
      });

      expect(withExtensions.extensionLargeExternalAreaM2).toBeGreaterThan(0);
      expect(withExtensions.extensionSmallExternalAreaM2).toBeGreaterThan(0);
      expect(withExtensions.totalExternalAreaM2).toBeGreaterThan(
        withoutExtensions.totalExternalAreaM2,
      );
    });

    it("should verify frustum lateral area formula (π/2 × s × (D + d))", () => {
      const D = 400;
      const d = 300;
      const h = 280;
      const largeR = D / 2;
      const smallR = d / 2;
      const slant = Math.sqrt((largeR - smallR) ** 2 + h ** 2);
      const expectedAreaMm2 = (Math.PI / 2) * slant * (D + d);
      const expectedAreaM2 = expectedAreaMm2 / 1e6;

      const result = service.calculateArea({
        largeDiameterMm: D,
        smallDiameterMm: d,
        lengthMm: h,
        wallThicknessMm: 8,
      });

      expect(result.reducerExternalAreaM2).toBeCloseTo(expectedAreaM2, 3);
    });
  });

  describe("calculateFull", () => {
    it("should return both mass and area results", () => {
      const result = service.calculateFull({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.mass).toBeDefined();
      expect(result.area).toBeDefined();
      expect(result.mass.massPerUnitKg).toBeGreaterThan(0);
      expect(result.area.totalExternalAreaM2).toBeGreaterThan(0);
    });

    it("should calculate coating costs when rate is provided", () => {
      const result = service.calculateFull({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
        coatingRatePerM2: 220,
      });

      expect(result.externalCoatingCost).toBeDefined();
      expect(result.internalCoatingCost).toBeDefined();
      expect(result.totalCoatingCost).toBeDefined();
      expect(result.totalCoatingCost).toBeCloseTo(
        result.externalCoatingCost! + result.internalCoatingCost!,
        1,
      );
    });

    it("should not include coating costs when rate is not provided", () => {
      const result = service.calculateFull({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.externalCoatingCost).toBeUndefined();
      expect(result.internalCoatingCost).toBeUndefined();
      expect(result.totalCoatingCost).toBeUndefined();
    });
  });

  describe("standardReducerLength", () => {
    it("should return standard lengths from table", () => {
      expect(service.standardReducerLength(200, 100)).toBe(180);
      expect(service.standardReducerLength(400, 300)).toBe(280);
      expect(service.standardReducerLength(600, 400)).toBe(380);
      expect(service.standardReducerLength(900, 600)).toBe(535);
    });

    it("should estimate length for non-standard sizes", () => {
      const length = service.standardReducerLength(1000, 800);
      expect(length).toBeGreaterThan(0);
    });
  });
});
