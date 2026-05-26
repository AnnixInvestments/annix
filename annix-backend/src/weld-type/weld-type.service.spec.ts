import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { WeldType } from "./entities/weld-type.entity";
import { WeldTypeRepository } from "./weld-type.repository";
import { WeldTypeService } from "./weld-type.service";

describe("WeldTypeService", () => {
  let service: WeldTypeService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeldTypeService, { provide: WeldTypeRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<WeldTypeService>(WeldTypeService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new weld type", async () => {
      const dto = { weld_code: "BW", weld_name: "Butt Weld", category: "WELD" };
      const entity = { id: 1, ...dto } as WeldType;

      mockRepo.findByCode.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findByCode).toHaveBeenCalledWith(dto.weld_code);
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if weld code already exists", async () => {
      const dto = { weld_code: "BW", weld_name: "Butt Weld", category: "WELD" };
      mockRepo.findByCode.mockResolvedValue({ id: 1, weld_code: "BW" });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findByCode).toHaveBeenCalledWith(dto.weld_code);
    });
  });

  describe("findAll", () => {
    it("should return array of weld types", async () => {
      const result = [{ id: 1, weld_code: "BW" }] as WeldType[];
      mockRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a weld type by id", async () => {
      const result = { id: 1, weld_code: "BW" } as WeldType;
      mockRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findById).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if weld type not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByCode", () => {
    it("should return a weld type by code", async () => {
      const result = { id: 1, weld_code: "BW" } as WeldType;
      mockRepo.findByCode.mockResolvedValue(result);

      expect(await service.findByCode("BW")).toEqual(result);
      expect(mockRepo.findByCode).toHaveBeenCalledWith("BW");
    });

    it("should throw NotFoundException if weld type not found by code", async () => {
      mockRepo.findByCode.mockResolvedValue(null);

      await expect(service.findByCode("UNKNOWN")).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a weld type", async () => {
      const entity = { id: 1, weld_code: "BW" } as WeldType;
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
