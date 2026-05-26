import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Bolt } from "../bolt/entities/bolt.entity";
import { NutMass } from "./entities/nut-mass.entity";
import { NutMassRepository } from "./nut-mass.repository";
import { NutMassService } from "./nut-mass.service";

describe("NutMassService", () => {
  let service: NutMassService;

  const mockRepository: jest.Mocked<NutMassRepository> = {
    findAllWithBolt: jest.fn(),
    findOneWithBolt: jest.fn(),
    findExisting: jest.fn(),
    findByBoltId: jest.fn(),
    findBolt: jest.fn(),
    createNut: jest.fn(),
    saveNut: jest.fn(),
    removeNut: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    typesGrouped: jest.fn(),
    boltDesignationsForType: jest.fn(),
    gradesForTypeAndSize: jest.fn(),
  } as jest.Mocked<NutMassRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NutMassService, { provide: NutMassRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<NutMassService>(NutMassService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new nut mass", async () => {
      const dto = { boltId: 1, mass_kg: 0.1 };
      const bolt = { id: 1 } as Bolt;
      const entity = { id: 1, bolt, mass_kg: 0.1 } as NutMass;

      mockRepository.findBolt.mockResolvedValue(bolt);
      mockRepository.findExisting.mockResolvedValue(null);
      mockRepository.createNut.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepository.findBolt).toHaveBeenCalledWith(1);
      expect(mockRepository.findExisting).toHaveBeenCalledWith(1, 0.1);
      expect(mockRepository.createNut).toHaveBeenCalledWith({ bolt, mass_kg: 0.1 });
    });

    it("should throw NotFoundException if bolt not found", async () => {
      const dto = { boltId: 1, mass_kg: 0.1 };
      mockRepository.findBolt.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if nut mass already exists", async () => {
      const dto = { boltId: 1, mass_kg: 0.1 };
      const bolt = { id: 1 } as Bolt;
      const existing = { id: 2 } as NutMass;

      mockRepository.findBolt.mockResolvedValue(bolt);
      mockRepository.findExisting.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return array of nut masses", async () => {
      const result = [{ id: 1 }] as NutMass[];
      mockRepository.findAllWithBolt.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepository.findAllWithBolt).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a nut mass by id", async () => {
      const result = { id: 1 } as NutMass;
      mockRepository.findOneWithBolt.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepository.findOneWithBolt).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if nut mass not found", async () => {
      mockRepository.findOneWithBolt.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a nut mass", async () => {
      const entity = { id: 1 } as NutMass;
      mockRepository.findOneWithBolt.mockResolvedValue(entity);
      mockRepository.removeNut.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepository.removeNut).toHaveBeenCalledWith(entity);
    });
  });
});
