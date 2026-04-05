import { Test, type TestingModule } from "@nestjs/testing";
import { ReferencePipeController } from "./reference-pipe.controller";

describe("ReferencePipeController", () => {
  let controller: ReferencePipeController;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ReferencePipeController],
    }).compile();

    controller = moduleRef.get<ReferencePipeController>(ReferencePipeController);
  });

  describe("pipeSpecs", () => {
    it("returns all expected top-level keys", () => {
      const result = controller.pipeSpecs();
      expect(result).toHaveProperty("nominalBores");
      expect(result).toHaveProperty("schedules");
      expect(result).toHaveProperty("endTypes");
      expect(result).toHaveProperty("tolerances");
      expect(result).toHaveProperty("materialGroups");
      expect(result).toHaveProperty("flangeOd");
      expect(result).toHaveProperty("workingPressureBar");
      expect(result).toHaveProperty("workingTemperatureCelsius");
      expect(result).toHaveProperty("ansiPressureClasses");
    });

    it("populates tolerances and material groups from shared package", () => {
      const result = controller.pipeSpecs();
      expect(Array.isArray(result.tolerances)).toBe(true);
      expect(result.tolerances.length).toBeGreaterThan(0);
      expect(result.materialGroups.length).toBeGreaterThan(0);
      expect(result.flangeOd[100]).toBe(220);
    });
  });

  describe("b16Rating", () => {
    it("returns a rated pressure for a valid sample input", () => {
      const result = controller.b16Rating({
        materialGroup: "1.1",
        pressureClass: "150",
        temperatureC: 38,
      });
      expect(result.ratedPressureBar).toBe(19.6);
      expect(result.classSelection).toBeNull();
    });

    it("computes classSelection when design pressure supplied", () => {
      const result = controller.b16Rating({
        materialGroup: "1.1",
        pressureClass: "150",
        temperatureC: 100,
        pressureBar: 10,
      });
      expect(result.ratedPressureBar).toBe(17.7);
      expect(result.margin).not.toBeNull();
      expect(result.classSelection).not.toBeNull();
      expect(result.classSelection?.requiredClass).toBe("150");
    });

    it("returns null ratedPressureBar for unknown material group", () => {
      const result = controller.b16Rating({
        materialGroup: "99.99",
        pressureClass: "150",
        temperatureC: 38,
      });
      expect(result.ratedPressureBar).toBeNull();
    });
  });
});
