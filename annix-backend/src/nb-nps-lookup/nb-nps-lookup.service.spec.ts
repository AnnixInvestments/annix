import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { NbNpsLookup } from "./entities/nb-nps-lookup.entity";
import { NbNpsLookupRepository } from "./nb-nps-lookup.repository";
import { NbNpsLookupService } from "./nb-nps-lookup.service";

describe("NbNpsLookupService", () => {
  let service: NbNpsLookupService;

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
      providers: [NbNpsLookupService, { provide: NbNpsLookupRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<NbNpsLookupService>(NbNpsLookupService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a new NB NPS lookup", async () => {
      const dto = { nb_mm: 50, nps_inch: 2, outside_diameter_mm: 60.3 };
      const entity = { id: 1, ...dto } as NbNpsLookup;

      mockRepo.findOneWhere.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(entity);

      const result = await service.create(dto);
      expect(result).toEqual(entity);
      expect(mockRepo.findOneWhere).toHaveBeenCalledWith({
        nb_mm: 50,
        nps_inch: 2,
        outside_diameter_mm: 60.3,
      });
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
    });

    it("should throw BadRequestException if NB NPS lookup already exists", async () => {
      const dto = { nb_mm: 50, nps_inch: 2, outside_diameter_mm: 60.3 };
      mockRepo.findOneWhere.mockResolvedValue({ id: 1, ...dto });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe("findAll", () => {
    it("should return array of NB NPS lookups", async () => {
      const result = [{ id: 1, nb_mm: 50 }] as NbNpsLookup[];
      mockRepo.findAll.mockResolvedValue(result);

      expect(await service.findAll()).toEqual(result);
      expect(mockRepo.findAll).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return an NB NPS lookup by id", async () => {
      const result = { id: 1, nb_mm: 50 } as NbNpsLookup;
      mockRepo.findById.mockResolvedValue(result);

      expect(await service.findOne(1)).toEqual(result);
      expect(mockRepo.findById).toHaveBeenCalledWith(1, []);
    });

    it("should throw NotFoundException if NB NPS lookup not found", async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete an NB NPS lookup", async () => {
      const entity = { id: 1, nb_mm: 50 } as NbNpsLookup;
      mockRepo.findById.mockResolvedValue(entity);
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(entity);
    });
  });
});
