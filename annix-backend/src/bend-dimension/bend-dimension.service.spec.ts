import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { BendDimensionService } from "./bend-dimension.service";

describe("BendDimensionService", () => {
  let service: BendDimensionService;

  const mockLookupRepo = {
    findOneWhere: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BendDimensionService,
        { provide: NbNpsLookupRepository, useValue: mockLookupRepo },
      ],
    }).compile();

    service = module.get<BendDimensionService>(BendDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculate", () => {
    it("should calculate bend center-to-face dimension", async () => {
      const lookup = { id: 1, nb_mm: 50, nps_inch: 2 };
      mockLookupRepo.findOneWhere.mockResolvedValue(lookup);

      const result = await service.calculate(50, 90, 1.5);

      expect(result).toBe(76.2);
      expect(mockLookupRepo.findOneWhere).toHaveBeenCalledWith({ nb_mm: 50 });
    });

    it("should throw NotFoundException if NB not found", async () => {
      mockLookupRepo.findOneWhere.mockResolvedValue(null);

      await expect(service.calculate(999, 90, 1.5)).rejects.toThrow(NotFoundException);
    });

    it("should round result to 1 decimal place", async () => {
      const lookup = { id: 1, nb_mm: 50, nps_inch: 2 };
      mockLookupRepo.findOneWhere.mockResolvedValue(lookup);

      const result = await service.calculate(50, 45, 1.5);

      // Should be rounded to 1 decimal place
      expect(typeof result).toBe("number");
      expect((result * 10) % 1).toBeCloseTo(0, 1);
    });
  });
});
