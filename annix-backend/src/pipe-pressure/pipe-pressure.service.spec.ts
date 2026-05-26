import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { PipePressure } from "./entities/pipe-pressure.entity";
import { PipePressureRepository } from "./pipe-pressure.repository";
import { PipePressureService } from "./pipe-pressure.service";

describe("PipePressureService", () => {
  let service: PipePressureService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    deleteById: jest.fn(),
    findDuplicateForCreate: jest.fn(),
    findDuplicateForUpdate: jest.fn(),
  };

  const mockDimensionRepo = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipePressureService,
        { provide: PipePressureRepository, useValue: mockPressureRepo },
        { provide: PipeDimensionRepository, useValue: mockDimensionRepo },
      ],
    }).compile();

    service = module.get<PipePressureService>(PipePressureService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of pipe pressures", async () => {
      const result = [{ id: 1 }] as PipePressure[];
      mockPressureRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockPressureRepo.findAll).toHaveBeenCalledWith(["pipeDimension"]);
    });
  });

  describe("findOne", () => {
    it("should return a pipe pressure by id", async () => {
      const result = { id: 1 } as PipePressure;
      mockPressureRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockPressureRepo.findById).toHaveBeenCalledWith(1, ["pipeDimension"]);
    });

    it("should throw NotFoundException if pipe pressure not found", async () => {
      mockPressureRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a pipe pressure", async () => {
      mockPressureRepo.deleteById.mockResolvedValue(1);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockPressureRepo.deleteById).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if pipe pressure not found", async () => {
      mockPressureRepo.deleteById.mockResolvedValue(0);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
