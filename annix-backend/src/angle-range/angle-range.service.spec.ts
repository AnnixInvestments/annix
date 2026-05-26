import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AngleRangeRepository } from "./angle-range.repository";
import { AngleRangeService } from "./angle-range.service";
import { AngleRange } from "./entities/angle-range.entity";

describe("AngleRangeService", () => {
  let service: AngleRangeService;

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
      providers: [AngleRangeService, { provide: AngleRangeRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<AngleRangeService>(AngleRangeService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new angle range", async () => {
      const dto = { angle_min: 0, angle_max: 90 };
      const entity = { id: 1, ...dto } as AngleRange;

      mockRepo.findOneWhere.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOneWhere).toHaveBeenCalledWith({
        angle_min: dto.angle_min,
        angle_max: dto.angle_max,
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if angle range already exists", async () => {
      const dto = { angle_min: 0, angle_max: 90 };
      mockRepo.findOneWhere.mockResolvedValue({ id: 1, angle_min: 0, angle_max: 90 });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findOneWhere).toHaveBeenCalledWith({
        angle_min: dto.angle_min,
        angle_max: dto.angle_max,
      });
    });
  });

  describe("findAll", () => {
    it("should return array of angle ranges", async () => {
      const result = [{ id: 1, angle_min: 0, angle_max: 90 }] as AngleRange[];
      mockRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.findAll).toHaveBeenCalledWith(["fittingDimensions"]);
    });
  });

  describe("findOne", () => {
    it("should return an angle range by id", async () => {
      const result = { id: 1, angle_min: 0, angle_max: 90 } as AngleRange;
      mockRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findById).toHaveBeenCalledWith(1, ["fittingDimensions"]);
    });

    it("should throw NotFoundException if angle range not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update an angle range", async () => {
      const dto = { angle_max: 45 };
      const existing = { id: 1, angle_min: 0, angle_max: 90 } as AngleRange;
      const updated = { id: 1, angle_min: 0, angle_max: 45 } as AngleRange;

      mockRepo.findById.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });
  });

  describe("remove", () => {
    it("should delete an angle range", async () => {
      const entity = { id: 1, angle_min: 0, angle_max: 90 } as AngleRange;
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
