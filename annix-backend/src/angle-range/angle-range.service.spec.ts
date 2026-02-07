import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AngleRangeService } from "./angle-range.service";
import { AngleRange } from "./entities/angle-range.entity";

describe("AngleRangeService", () => {
  let service: AngleRangeService;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AngleRangeService,
        { provide: getRepositoryToken(AngleRange), useValue: mockRepo },
      ],
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

      mockRepo.findOne.mockResolvedValue(undefined);
      mockRepo.create.mockReturnValue(dto);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { angle_min: dto.angle_min, angle_max: dto.angle_max },
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if angle range already exists", async () => {
      const dto = { angle_min: 0, angle_max: 90 };
      mockRepo.findOne.mockResolvedValue({
        id: 1,
        angle_min: 0,
        angle_max: 90,
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { angle_min: dto.angle_min, angle_max: dto.angle_max },
      });
    });
  });

  describe("findAll", () => {
    it("should return array of angle ranges", async () => {
      const result = [{ id: 1, angle_min: 0, angle_max: 90 }] as AngleRange[];
      mockRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.find).toHaveBeenCalledWith({
        relations: ["fittingDimensions"],
      });
    });
  });

  describe("findOne", () => {
    it("should return an angle range by id", async () => {
      const result = { id: 1, angle_min: 0, angle_max: 90 } as AngleRange;
      mockRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["fittingDimensions"],
      });
    });

    it("should throw NotFoundException if angle range not found", async () => {
      mockRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update an angle range", async () => {
      const dto = { angle_max: 45 };
      const existing = { id: 1, angle_min: 0, angle_max: 90 } as AngleRange;
      const updated = { id: 1, angle_min: 0, angle_max: 45 } as AngleRange;

      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });
  });

  describe("remove", () => {
    it("should delete an angle range", async () => {
      const entity = { id: 1, angle_min: 0, angle_max: 90 } as AngleRange;
      mockRepo.findOne.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
