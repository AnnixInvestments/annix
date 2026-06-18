import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PipeDimension } from "./entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "./pipe-dimension.repository";
import { PipeDimensionService } from "./pipe-dimension.service";

describe("PipeDimensionService", () => {
  let service: PipeDimensionService;

  const mockRepository: jest.Mocked<PipeDimensionRepository> = {
    findAllWithRelations: jest.fn(),
    findAllWithDiameterAndSpec: jest.fn(),
    findOneWithRelations: jest.fn(),
    findNominalByDiameter: jest.fn(),
    findNominalById: jest.fn(),
    findSteelById: jest.fn(),
    createPipe: jest.fn(),
    savePipe: jest.fn(),
    removePipe: jest.fn(),
    findBySpecAndNominal: jest.fn(),
    recommendedSpecs: jest.fn(),
    higherSchedules: jest.fn(),
    findByNominalDiameterScheduleAndSteel: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    findPage: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  } as jest.Mocked<PipeDimensionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipeDimensionService,
        { provide: PipeDimensionRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PipeDimensionService>(PipeDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return array of pipe dimensions", async () => {
      const result = [{ id: 1 }] as PipeDimension[];
      mockRepository.findAllWithRelations.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepository.findAllWithRelations).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a pipe dimension by id", async () => {
      const result = { id: 1 } as PipeDimension;
      mockRepository.findOneWithRelations.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepository.findOneWithRelations).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if pipe dimension not found", async () => {
      mockRepository.findOneWithRelations.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a pipe dimension", async () => {
      const entity = { id: 1 } as PipeDimension;
      mockRepository.findOneWithRelations.mockResolvedValue(entity);
      mockRepository.removePipe.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepository.removePipe).toHaveBeenCalledWith(entity);
    });
  });

  describe("findAllBySpecAndNominal", () => {
    it("should return pipe dimensions by spec and nominal", async () => {
      const result = [{ id: 1 }] as PipeDimension[];
      mockRepository.findBySpecAndNominal.mockResolvedValue(result);

      expect(await service.findAllBySpecAndNominal(1, 1)).toEqual(result);
      expect(mockRepository.findBySpecAndNominal).toHaveBeenCalledWith(1, 1);
    });
  });
});
