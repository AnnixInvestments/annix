import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { FlangeStandard } from "../flange-standard/entities/flange-standard.entity";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassService } from "./flange-pressure-class.service";

describe("FlangePressureClassService", () => {
  let service: FlangePressureClassService;

  const mockPressureRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockStandardRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlangePressureClassService,
        {
          provide: getRepositoryToken(FlangePressureClass),
          useValue: mockPressureRepo,
        },
        {
          provide: getRepositoryToken(FlangeStandard),
          useValue: mockStandardRepo,
        },
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
      mockPressureRepo.find.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockPressureRepo.find).toHaveBeenCalledWith({
        relations: ["standard"],
      });
    });
  });

  describe("findOne", () => {
    it("should return a flange pressure class by id", async () => {
      const result = { id: 1, designation: "150" } as FlangePressureClass;
      mockPressureRepo.findOne.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockPressureRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["standard"],
      });
    });

    it("should throw NotFoundException if flange pressure class not found", async () => {
      mockPressureRepo.findOne.mockResolvedValue(undefined);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a flange pressure class", async () => {
      const entity = { id: 1, designation: "150" } as FlangePressureClass;
      mockPressureRepo.findOne.mockResolvedValue(entity);
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

      mockStandardRepo.findOne.mockResolvedValue(standard);
      mockPressureRepo.find.mockResolvedValue(classes);

      const result = await service.getAllByStandard(1);
      expect(result).toEqual([
        { id: 1, designation: "150" },
        { id: 2, designation: "300" },
        { id: 3, designation: "600" },
      ]);
      expect(mockStandardRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPressureRepo.find).toHaveBeenCalledWith({
        where: { standard: { id: 1 } },
      });
    });

    it("should throw NotFoundException if standard not found", async () => {
      mockStandardRepo.findOne.mockResolvedValue(undefined);

      await expect(service.getAllByStandard(1)).rejects.toThrow(NotFoundException);
    });
  });
});
