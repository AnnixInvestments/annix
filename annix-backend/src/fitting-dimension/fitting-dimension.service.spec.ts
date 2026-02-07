import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AngleRange } from "../angle-range/entities/angle-range.entity";
import { FittingVariant } from "../fitting-variant/entities/fitting-variant.entity";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionService } from "./fitting-dimension.service";

describe("FittingDimensionService", () => {
  let service: FittingDimensionService;

  const mockDimRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockVariantRepo = {
    findOne: jest.fn(),
  };

  const mockAngleRangeRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingDimensionService,
        {
          provide: getRepositoryToken(FittingDimension),
          useValue: mockDimRepo,
        },
        {
          provide: getRepositoryToken(FittingVariant),
          useValue: mockVariantRepo,
        },
        {
          provide: getRepositoryToken(AngleRange),
          useValue: mockAngleRangeRepo,
        },
      ],
    }).compile();

    service = module.get<FittingDimensionService>(FittingDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of fitting dimensions", async () => {
      const result = [{ id: 1 }] as FittingDimension[];
      mockDimRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockDimRepo.find).toHaveBeenCalledWith({
        relations: ["variant", "angleRange"],
      });
    });
  });

  describe("findOne", () => {
    it("should return a fitting dimension by id", async () => {
      const result = { id: 1 } as FittingDimension;
      mockDimRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockDimRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["variant", "angleRange"],
      });
    });

    it("should throw NotFoundException if fitting dimension not found", async () => {
      mockDimRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a fitting dimension", async () => {
      const entity = { id: 1 } as FittingDimension;
      mockDimRepo.findOne.mockResolvedValue(entity);
      mockDimRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockDimRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
