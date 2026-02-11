import { Test, TestingModule } from "@nestjs/testing";
import { ReducerType } from "./dto/calculate-reducer.dto";
import { ReducerCalculatorController } from "./reducer-calculator.controller";
import { ReducerCalculatorService } from "./reducer-calculator.service";

describe("ReducerCalculatorController", () => {
  let controller: ReducerCalculatorController;
  let service: ReducerCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReducerCalculatorController],
      providers: [ReducerCalculatorService],
    }).compile();

    controller = module.get<ReducerCalculatorController>(ReducerCalculatorController);
    service = module.get<ReducerCalculatorService>(ReducerCalculatorService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("calculateMass", () => {
    it("should return mass calculation result", () => {
      const result = controller.calculateMass({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.massPerUnitKg).toBeGreaterThan(0);
      expect(result.reducerType).toBe(ReducerType.CONCENTRIC);
    });
  });

  describe("calculateArea", () => {
    it("should return area calculation result", () => {
      const result = controller.calculateArea({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
      });

      expect(result.totalExternalAreaM2).toBeGreaterThan(0);
      expect(result.slantHeightMm).toBeGreaterThan(0);
    });
  });

  describe("calculateFull", () => {
    it("should return full calculation result", () => {
      const result = controller.calculateFull({
        largeDiameterMm: 400,
        smallDiameterMm: 300,
        lengthMm: 280,
        wallThicknessMm: 8,
        coatingRatePerM2: 220,
      });

      expect(result.mass).toBeDefined();
      expect(result.area).toBeDefined();
      expect(result.totalCoatingCost).toBeGreaterThan(0);
    });
  });

  describe("standardLength", () => {
    it("should return standard length for given NB sizes", () => {
      const result = controller.standardLength(400, 300);

      expect(result.largeNbMm).toBe(400);
      expect(result.smallNbMm).toBe(300);
      expect(result.standardLengthMm).toBe(280);
    });
  });
});
