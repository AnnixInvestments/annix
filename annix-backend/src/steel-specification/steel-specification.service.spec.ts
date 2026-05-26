import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SteelSpecification } from "./entities/steel-specification.entity";
import { SteelSpecificationRepository } from "./steel-specification.repository";
import { SteelSpecificationService } from "./steel-specification.service";

describe("SteelSpecificationService", () => {
  let service: SteelSpecificationService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAllWithRelations: jest.fn(),
    findByIdWithRelations: jest.fn(),
    findByName: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteelSpecificationService,
        { provide: SteelSpecificationRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SteelSpecificationService>(SteelSpecificationService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new steel specification", async () => {
      const dto = { steelSpecName: "S355" };
      const entity = { id: 1, ...dto } as SteelSpecification;

      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findByName).toHaveBeenCalledWith(dto.steelSpecName);
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if steel spec already exists", async () => {
      const dto = { steelSpecName: "S355" };
      mockRepo.findByName.mockResolvedValue({ id: 1, steelSpecName: "S355" });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findByName).toHaveBeenCalledWith(dto.steelSpecName);
    });
  });

  describe("findAll", () => {
    it("should return array of steel specifications", async () => {
      const result = [{ id: 1, steelSpecName: "S355" }] as SteelSpecification[];
      mockRepo.findAllWithRelations.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.findAllWithRelations).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a steel specification by id", async () => {
      const result = { id: 1, steelSpecName: "S355" } as SteelSpecification;
      mockRepo.findByIdWithRelations.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findByIdWithRelations).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if steel spec not found", async () => {
      mockRepo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a steel specification", async () => {
      const dto = { steelSpecName: "S275" };
      const existing = { id: 1, steelSpecName: "S355" } as SteelSpecification;
      const updated = { id: 1, steelSpecName: "S275" } as SteelSpecification;

      mockRepo.findByIdWithRelations.mockResolvedValue(existing);
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });

    it("should throw BadRequestException if duplicate name exists", async () => {
      const dto = { steelSpecName: "S275" };
      const current = { id: 1, steelSpecName: "S355" } as SteelSpecification;
      const existing = { id: 2, steelSpecName: "S275" } as SteelSpecification;

      mockRepo.findByIdWithRelations.mockResolvedValue(current);
      mockRepo.findByName.mockResolvedValue(existing);

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should delete a steel specification", async () => {
      const entity = { id: 1, steelSpecName: "S355" } as SteelSpecification;
      mockRepo.findByIdWithRelations.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });

    it("should throw NotFoundException if steel spec not found", async () => {
      mockRepo.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });
});
