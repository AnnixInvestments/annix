import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository";
import { NominalOutsideDiameterMmService } from "./nominal-outside-diameter-mm.service";

describe("NominalOutsideDiameterMmService", () => {
  let service: NominalOutsideDiameterMmService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NominalOutsideDiameterMmService,
        { provide: NominalOutsideDiameterMmRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NominalOutsideDiameterMmService>(NominalOutsideDiameterMmService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new entity", async () => {
      const dto = { nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      const savedEntity: NominalOutsideDiameterMm = {
        id: 1,
        nominal_diameter_mm: dto.nominal_diameter_mm,
        outside_diameter_mm: dto.outside_diameter_mm,
        pipeDimensions: [],
        fittingBores: [],
        flangeDimensions: [],
      };

      mockRepo.findOneWhere.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(savedEntity);

      const result = await service.create(dto);
      expect(result).toEqual(savedEntity);
      expect(mockRepo.findOneWhere).toHaveBeenCalledWith({
        nominal_diameter_mm: dto.nominal_diameter_mm,
        outside_diameter_mm: dto.outside_diameter_mm,
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if duplicate exists", async () => {
      const dto = { nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      mockRepo.findOneWhere.mockResolvedValue({ id: 1, ...dto });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return all entities", async () => {
      const entities = [{ id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 }];
      mockRepo.findAll.mockResolvedValue(entities);

      const result = await service.findAll();
      expect(result).toEqual(entities);
      expect(mockRepo.findAll).toHaveBeenCalledWith(["pipeDimensions", "fittingBores"]);
    });
  });

  describe("findOne", () => {
    it("should return one entity", async () => {
      const entity = { id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      mockRepo.findById.mockResolvedValue(entity);

      const result = await service.findOne(1);
      expect(result).toEqual(entity);
      expect(mockRepo.findById).toHaveBeenCalledWith(1, ["pipeDimensions", "fittingBores"]);
    });

    it("should throw NotFoundException if entity not found", async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update an entity", async () => {
      const existing = { id: 1, nominal_diameter_mm: 65, outside_diameter_mm: 76.2 };
      const dto = { nominal_diameter_mm: 70, outside_diameter_mm: 80 };
      const updated = { ...existing, ...dto };

      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });
  });

  describe("remove", () => {
    it("should delete an entity", async () => {
      const entity = {
        id: 1,
        nominal_diameter_mm: 65,
        outside_diameter_mm: 76.2,
      } as NominalOutsideDiameterMm;
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
