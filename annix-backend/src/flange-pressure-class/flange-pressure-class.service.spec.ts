import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { FlangeStandardRepository } from "../flange-standard/flange-standard.repository";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";
import { FlangePressureClassService } from "./flange-pressure-class.service";

describe("FlangePressureClassService", () => {
  let service: FlangePressureClassService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    findByStandardId: jest.fn(),
  };

  const mockStandardRepo = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlangePressureClassService,
        { provide: FlangePressureClassRepository, useValue: mockPressureRepo },
        { provide: FlangeStandardRepository, useValue: mockStandardRepo },
      ],
    }).compile();

    service = module.get<FlangePressureClassService>(FlangePressureClassService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of flange pressure classes", async () => {
      const result = [{ id: 1, designation: "150" }] as FlangePressureClass[];
      mockPressureRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockPressureRepo.findAll).toHaveBeenCalledWith(["standard"]);
    });
  });

  describe("findOne", () => {
    it("should return a flange pressure class by id", async () => {
      const result = { id: 1, designation: "150" } as FlangePressureClass;
      mockPressureRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockPressureRepo.findById).toHaveBeenCalledWith(1, ["standard"]);
    });

    it("should throw NotFoundException if flange pressure class not found", async () => {
      mockPressureRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a flange pressure class", async () => {
      const entity = { id: 1, designation: "150" } as FlangePressureClass;
      mockPressureRepo.findById.mockResolvedValue(entity);
      mockPressureRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockPressureRepo.remove).toHaveBeenCalledWith(entity);
    });
  });

  describe("getAllByStandard", () => {
    it("should return sorted pressure classes for a standard", async () => {
      const standard = { id: 1 } as FlangeStandard;
      const classes = [
        { id: 2, designation: "300" },
        { id: 1, designation: "150" },
        { id: 3, designation: "600" },
      ] as FlangePressureClass[];

      mockStandardRepo.findById.mockResolvedValue(standard);
      mockPressureRepo.findByStandardId.mockResolvedValue(classes);

      const result = await service.getAllByStandard(1);
      expect(result).toEqual([
        { id: 1, designation: "150" },
        { id: 2, designation: "300" },
        { id: 3, designation: "600" },
      ]);
      expect(mockStandardRepo.findById).toHaveBeenCalledWith(1);
      expect(mockPressureRepo.findByStandardId).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if standard not found", async () => {
      mockStandardRepo.findById.mockResolvedValue(null);

      await expect(service.getAllByStandard(1)).rejects.toThrow(NotFoundException);
    });
  });
});
