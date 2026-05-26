import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { BoltRepository } from "../bolt/bolt.repository";
import { Bolt } from "../bolt/entities/bolt.entity";
import { BoltMassRepository } from "./bolt-mass.repository";
import { BoltMassService } from "./bolt-mass.service";
import { BoltMass } from "./entities/bolt-mass.entity";

describe("BoltMassService", () => {
  let service: BoltMassService;

  const mockBoltMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockBoltRepo = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoltMassService,
        { provide: BoltMassRepository, useValue: mockBoltMassRepo },
        { provide: BoltRepository, useValue: mockBoltRepo },
      ],
    }).compile();

    service = module.get<BoltMassService>(BoltMassService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new bolt mass", async () => {
      const dto = { boltId: 1, length_mm: 100, mass_kg: 0.5 };
      const bolt = { id: 1 } as Bolt;
      const entity = { id: 1, bolt, ...dto } as BoltMass;

      mockBoltRepo.findById.mockResolvedValue(bolt);
      mockBoltMassRepo.findOneWhere.mockResolvedValue(null);
      mockBoltMassRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockBoltRepo.findById).toHaveBeenCalledWith(1, undefined);
      expect(mockBoltMassRepo.findOneWhere).toHaveBeenCalledWith({
        bolt: { id: 1 },
        length_mm: 100,
      });
      expect(mockBoltMassRepo.create).toHaveBeenCalledWith({ bolt, ...dto });
    });

    it("should throw NotFoundException if bolt not found", async () => {
      const dto = { boltId: 1, length_mm: 100, mass_kg: 0.5 };
      mockBoltRepo.findById.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if bolt mass already exists", async () => {
      const dto = { boltId: 1, length_mm: 100, mass_kg: 0.5 };
      const bolt = { id: 1 } as Bolt;
      const existing = { id: 2 } as BoltMass;

      mockBoltRepo.findById.mockResolvedValue(bolt);
      mockBoltMassRepo.findOneWhere.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return array of bolt masses", async () => {
      const result = [{ id: 1 }] as BoltMass[];
      mockBoltMassRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockBoltMassRepo.findAll).toHaveBeenCalledWith(["bolt"]);
    });
  });

  describe("findOne", () => {
    it("should return a bolt mass by id", async () => {
      const result = { id: 1 } as BoltMass;
      mockBoltMassRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockBoltMassRepo.findById).toHaveBeenCalledWith(1, ["bolt"]);
    });

    it("should throw NotFoundException if bolt mass not found", async () => {
      mockBoltMassRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a bolt mass", async () => {
      const entity = { id: 1 } as BoltMass;
      mockBoltMassRepo.findById.mockResolvedValue(entity);
      mockBoltMassRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockBoltMassRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
