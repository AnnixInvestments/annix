import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { WasherRepository } from "../washer/washer.repository";
import { BoltRepository } from "./bolt.repository";
import { BoltService } from "./bolt.service";
import { Bolt } from "./entities/bolt.entity";
import { PipeClampRepository } from "./pipe-clamp.repository";
import { ThreadedInsertRepository } from "./threaded-insert.repository";
import { UBoltRepository } from "./u-bolt.repository";

describe("BoltService", () => {
  let service: BoltService;

  const mockBoltRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    filteredBolts: jest.fn(),
    boltCategoriesGrouped: jest.fn(),
    fastenerSizesForBolt: jest.fn(),
    fastenerGradesForBolt: jest.fn(),
  };

  const mockUBoltRepo = {
    uBolts: jest.fn().mockResolvedValue([]),
    uBolt: jest.fn().mockResolvedValue(null),
  };

  const mockPipeClampRepo = {
    pipeClamps: jest.fn().mockResolvedValue([]),
    pipeClamp: jest.fn().mockResolvedValue(null),
    pipeClampTypes: jest.fn().mockResolvedValue([]),
  };

  const mockNutMassRepo = {
    typesGrouped: jest.fn().mockResolvedValue([]),
    boltDesignationsForType: jest.fn().mockResolvedValue([]),
    gradesForTypeAndSize: jest.fn().mockResolvedValue([]),
  };

  const mockWasherRepo = {
    typesGrouped: jest.fn().mockResolvedValue([]),
    boltDesignationsForType: jest.fn().mockResolvedValue([]),
  };

  const mockThreadedInsertRepo = {
    insertTypesGrouped: jest.fn().mockResolvedValue([]),
    insertSizesForType: jest.fn().mockResolvedValue([]),
    insertGradesForTypeAndSize: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoltService,
        { provide: BoltRepository, useValue: mockBoltRepo },
        { provide: UBoltRepository, useValue: mockUBoltRepo },
        { provide: PipeClampRepository, useValue: mockPipeClampRepo },
        { provide: NutMassRepository, useValue: mockNutMassRepo },
        { provide: WasherRepository, useValue: mockWasherRepo },
        { provide: ThreadedInsertRepository, useValue: mockThreadedInsertRepo },
      ],
    }).compile();

    service = module.get<BoltService>(BoltService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new bolt", async () => {
      const dto = { designation: "M20" };
      const entity = { id: 1, ...dto } as Bolt;

      mockBoltRepo.findOneWhere.mockResolvedValue(null);
      mockBoltRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockBoltRepo.findOneWhere).toHaveBeenCalledWith({ designation: dto.designation });
      expect(mockBoltRepo.create).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if bolt already exists", async () => {
      const dto = { designation: "M20" };
      mockBoltRepo.findOneWhere.mockResolvedValue({ id: 1, designation: "M20" });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockBoltRepo.findOneWhere).toHaveBeenCalledWith({ designation: dto.designation });
    });
  });

  describe("findAll", () => {
    it("should return array of bolts via filteredBolts", async () => {
      const result = [{ id: 1, designation: "M20" }] as Bolt[];
      mockBoltRepo.filteredBolts.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockBoltRepo.filteredBolts).toHaveBeenCalledWith({});
    });
  });

  describe("findOne", () => {
    it("should return a bolt by id", async () => {
      const result = { id: 1, designation: "M20" } as Bolt;
      mockBoltRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockBoltRepo.findById).toHaveBeenCalledWith(1, []);
    });

    it("should throw NotFoundException if bolt not found", async () => {
      mockBoltRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a bolt", async () => {
      const dto = { designation: "M24" };
      const existing = { id: 1, designation: "M20" } as Bolt;
      const updated = { id: 1, designation: "M24" } as Bolt;

      mockBoltRepo.findById.mockResolvedValue(existing);
      mockBoltRepo.findOneWhere.mockResolvedValue(null);
      mockBoltRepo.save.mockResolvedValue(updated);

      const result = await service.update(1, dto);
      expect(result).toEqual(updated);
      expect(mockBoltRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
    });

    it("should throw BadRequestException if duplicate designation exists", async () => {
      const dto = { designation: "M24" };
      const current = { id: 1, designation: "M20" } as Bolt;
      const existing = { id: 2, designation: "M24" } as Bolt;

      mockBoltRepo.findById.mockResolvedValue(current);
      mockBoltRepo.findOneWhere.mockResolvedValue(existing);

      await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should delete a bolt", async () => {
      const entity = { id: 1, designation: "M20" } as Bolt;
      mockBoltRepo.findById.mockResolvedValue(entity);
      mockBoltRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockBoltRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
