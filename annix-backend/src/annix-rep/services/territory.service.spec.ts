import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Prospect } from "../entities/prospect.entity";
import { Territory, TerritoryBounds } from "../entities/territory.entity";
import { TerritoryService } from "./territory.service";

describe("TerritoryService", () => {
  let service: TerritoryService;
  let mockTerritoryRepo: Partial<Repository<Territory>>;
  let mockProspectRepo: Partial<Repository<Prospect>>;

  const bounds: TerritoryBounds = {
    north: -25.0,
    south: -27.0,
    east: 29.0,
    west: 27.0,
  };

  const baseTerritory: Territory = {
    id: 1,
    organizationId: 10,
    name: "Gauteng Region",
    description: "Greater Johannesburg area",
    provinces: ["Gauteng"],
    cities: ["Johannesburg", "Pretoria"],
    bounds,
    assignedTo: null,
    assignedToId: null,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    organization: null as any,
  };

  const baseProspect: Prospect = {
    id: 1,
    ownerId: 100,
    companyName: "Acme Inc",
    contactName: "John Smith",
    contactEmail: "john@acme.com",
    contactPhone: null,
    contactTitle: null,
    streetAddress: null,
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: null,
    country: "South Africa",
    latitude: -26.2041,
    longitude: 28.0473,
    googlePlaceId: null,
    discoverySource: null,
    discoveredAt: null,
    externalId: null,
    status: "new" as any,
    priority: "medium" as any,
    notes: null,
    tags: null,
    estimatedValue: null,
    crmExternalId: null,
    crmSyncStatus: null,
    crmLastSyncedAt: null,
    lastContactedAt: null,
    nextFollowUpAt: null,
    followUpRecurrence: "none" as any,
    customFields: null,
    score: 0,
    scoreUpdatedAt: null,
    assignedToId: null,
    organization: null,
    organizationId: null,
    territory: null,
    territoryId: 1,
    isSharedWithTeam: false,
    sharedNotesVisible: true,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    owner: null as any,
  };

  beforeEach(async () => {
    mockTerritoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    mockProspectRepo = {
      count: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TerritoryService,
        {
          provide: getRepositoryToken(Territory),
          useValue: mockTerritoryRepo,
        },
        {
          provide: getRepositoryToken(Prospect),
          useValue: mockProspectRepo,
        },
      ],
    }).compile();

    service = module.get<TerritoryService>(TerritoryService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and save a territory", async () => {
      (mockTerritoryRepo.create as jest.Mock).mockReturnValue(baseTerritory);
      (mockTerritoryRepo.save as jest.Mock).mockResolvedValue(baseTerritory);

      const result = await service.create(10, {
        name: "Gauteng Region",
        description: "Greater Johannesburg area",
        provinces: ["Gauteng"],
        cities: ["Johannesburg", "Pretoria"],
        bounds,
      });

      expect(result).toEqual(baseTerritory);
      expect(mockTerritoryRepo.create).toHaveBeenCalledWith({
        organizationId: 10,
        name: "Gauteng Region",
        description: "Greater Johannesburg area",
        provinces: ["Gauteng"],
        cities: ["Johannesburg", "Pretoria"],
        bounds,
        isActive: true,
      });
    });

    it("should default optional fields to null", async () => {
      (mockTerritoryRepo.create as jest.Mock).mockReturnValue(baseTerritory);
      (mockTerritoryRepo.save as jest.Mock).mockResolvedValue(baseTerritory);

      await service.create(10, { name: "Minimal Territory" });

      expect(mockTerritoryRepo.create).toHaveBeenCalledWith({
        organizationId: 10,
        name: "Minimal Territory",
        description: null,
        provinces: null,
        cities: null,
        bounds: null,
        isActive: true,
      });
    });
  });

  describe("findAll", () => {
    it("should return territories with prospect counts", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([baseTerritory]);
      (mockProspectRepo.count as jest.Mock).mockResolvedValue(5);

      const result = await service.findAll(10);

      expect(result).toHaveLength(1);
      expect(result[0].prospectCount).toBe(5);
      expect(mockTerritoryRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 10 },
        relations: ["assignedTo"],
        order: { name: "ASC" },
      });
    });

    it("should return empty array for org with no territories", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(10);

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return territory when found", async () => {
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(baseTerritory);

      const result = await service.findOne(1);

      expect(result).toEqual(baseTerritory);
      expect(mockTerritoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["assignedTo", "organization"],
      });
    });

    it("should return null when not found", async () => {
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update territory fields", async () => {
      const territory = { ...baseTerritory };
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(territory);
      (mockTerritoryRepo.save as jest.Mock).mockImplementation((t) => Promise.resolve(t));

      const result = await service.update(1, { name: "Updated Region" });

      expect(result.name).toBe("Updated Region");
    });

    it("should throw NotFoundException when territory not found", async () => {
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("should only update provided fields", async () => {
      const territory = { ...baseTerritory };
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(territory);
      (mockTerritoryRepo.save as jest.Mock).mockImplementation((t) => Promise.resolve(t));

      await service.update(1, { description: "New desc" });

      expect(territory.description).toBe("New desc");
      expect(territory.name).toBe("Gauteng Region");
      expect(territory.provinces).toEqual(["Gauteng"]);
    });

    it("should update all fields when all provided", async () => {
      const territory = { ...baseTerritory };
      const newBounds: TerritoryBounds = { north: -24.0, south: -28.0, east: 30.0, west: 26.0 };
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(territory);
      (mockTerritoryRepo.save as jest.Mock).mockImplementation((t) => Promise.resolve(t));

      await service.update(1, {
        name: "New Name",
        description: "New desc",
        provinces: ["Western Cape"],
        cities: ["Cape Town"],
        bounds: newBounds,
        isActive: false,
      });

      expect(territory.name).toBe("New Name");
      expect(territory.description).toBe("New desc");
      expect(territory.provinces).toEqual(["Western Cape"]);
      expect(territory.cities).toEqual(["Cape Town"]);
      expect(territory.bounds).toEqual(newBounds);
      expect(territory.isActive).toBe(false);
    });
  });

  describe("delete", () => {
    it("should remove the territory", async () => {
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(baseTerritory);
      (mockTerritoryRepo.remove as jest.Mock).mockResolvedValue(baseTerritory);

      await service.delete(1);

      expect(mockTerritoryRepo.remove).toHaveBeenCalledWith(baseTerritory);
    });

    it("should throw NotFoundException when territory not found", async () => {
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("assign", () => {
    it("should assign territory to a user", async () => {
      const territory = { ...baseTerritory };
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(territory);
      (mockTerritoryRepo.save as jest.Mock).mockImplementation((t) => Promise.resolve(t));

      const result = await service.assign(1, 200);

      expect(result.assignedToId).toBe(200);
    });

    it("should unassign territory when userId is null", async () => {
      const territory = { ...baseTerritory, assignedToId: 200 };
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(territory);
      (mockTerritoryRepo.save as jest.Mock).mockImplementation((t) => Promise.resolve(t));

      const result = await service.assign(1, null);

      expect(result.assignedToId).toBeNull();
    });

    it("should throw NotFoundException when territory not found", async () => {
      (mockTerritoryRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.assign(999, 200)).rejects.toThrow(NotFoundException);
    });
  });

  describe("prospectsInTerritory", () => {
    it("should return prospects for a territory", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([baseProspect]);

      const result = await service.prospectsInTerritory(1);

      expect(result).toEqual([baseProspect]);
      expect(mockProspectRepo.find).toHaveBeenCalledWith({
        where: { territoryId: 1 },
        relations: ["owner"],
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when no prospects", async () => {
      (mockProspectRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.prospectsInTerritory(999);

      expect(result).toEqual([]);
    });
  });

  describe("findTerritoryForLocation", () => {
    it("should return territory when location is within bounds", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([baseTerritory]);

      const result = await service.findTerritoryForLocation(10, -26.2, 28.0);

      expect(result).toEqual(baseTerritory);
    });

    it("should return null when location is outside all bounds", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([baseTerritory]);

      const result = await service.findTerritoryForLocation(10, -30.0, 28.0);

      expect(result).toBeNull();
    });

    it("should return null when no territories exist", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findTerritoryForLocation(10, -26.2, 28.0);

      expect(result).toBeNull();
    });

    it("should skip territories without bounds", async () => {
      const noBounds = { ...baseTerritory, bounds: null };
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([noBounds]);

      const result = await service.findTerritoryForLocation(10, -26.2, 28.0);

      expect(result).toBeNull();
    });

    it("should return first matching territory when multiple match", async () => {
      const territory2 = { ...baseTerritory, id: 2, name: "Overlap Region" };
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([baseTerritory, territory2]);

      const result = await service.findTerritoryForLocation(10, -26.2, 28.0);

      expect(result?.id).toBe(1);
    });
  });

  describe("territoriesForUser", () => {
    it("should return active territories assigned to user", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([baseTerritory]);

      const result = await service.territoriesForUser(200);

      expect(result).toEqual([baseTerritory]);
      expect(mockTerritoryRepo.find).toHaveBeenCalledWith({
        where: { assignedToId: 200, isActive: true },
        order: { name: "ASC" },
      });
    });

    it("should return empty array when user has no territories", async () => {
      (mockTerritoryRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.territoriesForUser(999);

      expect(result).toEqual([]);
    });
  });
});
