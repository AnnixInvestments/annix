import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FittingVariant } from "../fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreService } from "./fitting-bore.service";

describe("FittingBoreService", () => {
  let service: FittingBoreService;

  const mockBoreRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockVariantRepo = {
    findOne: jest.fn(),
  };

  const mockNominalRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingBoreService,
        { provide: getRepositoryToken(FittingBore), useValue: mockBoreRepo },
        {
          provide: getRepositoryToken(FittingVariant),
          useValue: mockVariantRepo,
        },
        {
          provide: getRepositoryToken(NominalOutsideDiameterMm),
          useValue: mockNominalRepo,
        },
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

      mockVariantRepo.findOne.mockResolvedValue(variant);
      mockNominalRepo.findOne.mockResolvedValue(nominal);
      mockBoreRepo.findOne.mockResolvedValue(undefined);
      mockBoreRepo.create.mockReturnValue({
        variant,
        nominalOutsideDiameter: nominal,
        borePositionName: "center",
      });
      mockBoreRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockVariantRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockNominalRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
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

      mockVariantRepo.findOne.mockResolvedValue(variant);
      mockNominalRepo.findOne.mockResolvedValue(nominal);
      mockBoreRepo.findOne.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return array of fitting bores", async () => {
      const result = [{ id: 1 }] as FittingBore[];
      mockBoreRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockBoreRepo.find).toHaveBeenCalledWith({
        relations: ["variant", "nominalOutsideDiameter"],
      });
    });
  });

  describe("findOne", () => {
    it("should return a fitting bore by id", async () => {
      const result = { id: 1 } as FittingBore;
      mockBoreRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockBoreRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["variant", "nominalOutsideDiameter"],
      });
    });

    it("should throw NotFoundException if fitting bore not found", async () => {
      mockBoreRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a fitting bore", async () => {
      const entity = { id: 1 } as FittingBore;
      mockBoreRepo.findOne.mockResolvedValue(entity);
      mockBoreRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockBoreRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
