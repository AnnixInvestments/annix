import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FittingVariant } from "../fitting-variant/entities/fitting-variant.entity";
import { FittingVariantRepository } from "../fitting-variant/fitting-variant.repository";
import { NominalOutsideDiameterMm } from "../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmRepository } from "../nominal-outside-diameter-mm/nominal-outside-diameter-mm.repository";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreRepository } from "./fitting-bore.repository";
import { FittingBoreService } from "./fitting-bore.service";

describe("FittingBoreService", () => {
  let service: FittingBoreService;

  const mockBoreRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockVariantRepo = {
    findById: jest.fn(),
  };

  const mockNominalRepo = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingBoreService,
        { provide: FittingBoreRepository, useValue: mockBoreRepo },
        { provide: FittingVariantRepository, useValue: mockVariantRepo },
        { provide: NominalOutsideDiameterMmRepository, useValue: mockNominalRepo },
      ],
    }).compile();

    service = module.get<FittingBoreService>(FittingBoreService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new fitting bore", async () => {
      const dto = { variantId: 1, nominalId: 1, borePosition: "center" };
      const variant = { id: 1 } as FittingVariant;
      const nominal = { id: 1 } as NominalOutsideDiameterMm;
      const entity = {
        id: 1,
        variant,
        nominalOutsideDiameter: nominal,
        borePositionName: "center",
      } as FittingBore;

      mockVariantRepo.findById.mockResolvedValue(variant);
      mockNominalRepo.findById.mockResolvedValue(nominal);
      mockBoreRepo.findOneWhere.mockResolvedValue(null);
      mockBoreRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockVariantRepo.findById).toHaveBeenCalledWith(1, undefined);
      expect(mockNominalRepo.findById).toHaveBeenCalledWith(1, undefined);
      expect(mockBoreRepo.create).toHaveBeenCalledWith({
        variant,
        nominalOutsideDiameter: nominal,
        borePositionName: "center",
      });
    });

    it("should throw BadRequestException if bore position already exists for variant", async () => {
      const dto = { variantId: 1, nominalId: 1, borePosition: "center" };
      const variant = { id: 1 } as FittingVariant;
      const nominal = { id: 1 } as NominalOutsideDiameterMm;
      const existing = { id: 2, borePositionName: "center" } as FittingBore;

      mockVariantRepo.findById.mockResolvedValue(variant);
      mockNominalRepo.findById.mockResolvedValue(nominal);
      mockBoreRepo.findOneWhere.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return array of fitting bores", async () => {
      const result = [{ id: 1 }] as FittingBore[];
      mockBoreRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockBoreRepo.findAll).toHaveBeenCalledWith(["variant", "nominalOutsideDiameter"]);
    });
  });

  describe("findOne", () => {
    it("should return a fitting bore by id", async () => {
      const result = { id: 1 } as FittingBore;
      mockBoreRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockBoreRepo.findById).toHaveBeenCalledWith(1, ["variant", "nominalOutsideDiameter"]);
    });

    it("should throw NotFoundException if fitting bore not found", async () => {
      mockBoreRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a fitting bore", async () => {
      const entity = { id: 1 } as FittingBore;
      mockBoreRepo.findById.mockResolvedValue(entity);
      mockBoreRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockBoreRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
