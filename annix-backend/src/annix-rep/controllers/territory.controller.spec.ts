import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Address } from "../../lib/value-objects";
import { AnnixRepAuthGuard } from "../auth";
import { TeamRoleGuard } from "../auth/guards/team-role.guard";
import { Prospect } from "../entities/prospect.entity";
import { TeamRole } from "../entities/team-member.entity";
import { Territory, TerritoryBounds } from "../entities/territory.entity";
import { TerritoryService } from "../services/territory.service";
import { TerritoryController } from "./territory.controller";

describe("TerritoryController", () => {
  let controller: TerritoryController;
  let service: jest.Mocked<TerritoryService>;

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
    assignedTo: { id: 200, firstName: "John", lastName: "Smith" } as any,
    assignedToId: 200,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    organization: null as any,
  };

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "admin@example.com",
      sessionToken: "test-token",
      organizationId: 10,
      teamRole: TeamRole.ADMIN,
    },
  };

  const mockRequestNoOrg = {
    annixRepUser: {
      userId: 100,
      email: "admin@example.com",
      sessionToken: "test-token",
      organizationId: null,
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assign: jest.fn(),
      prospectsInTerritory: jest.fn(),
      territoriesForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TerritoryController],
      providers: [{ provide: TerritoryService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TerritoryController>(TerritoryController);
    service = module.get(TerritoryService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create territory with org from request", async () => {
      service.create.mockResolvedValue(baseTerritory);

      const result = await controller.create(mockRequest as any, {
        name: "Gauteng Region",
      });

      expect(result).toEqual(baseTerritory);
      expect(service.create).toHaveBeenCalledWith(10, { name: "Gauteng Region" });
    });

    it("should throw ForbiddenException when user has no organization", async () => {
      await expect(controller.create(mockRequestNoOrg as any, { name: "Test" })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("findAll", () => {
    it("should return territories with assignedToName", async () => {
      service.findAll.mockResolvedValue([{ ...baseTerritory, prospectCount: 5 }]);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toHaveLength(1);
      expect(result[0].assignedToName).toBe("John Smith");
      expect(service.findAll).toHaveBeenCalledWith(10);
    });

    it("should set assignedToName to null when no assignee", async () => {
      const unassigned = {
        ...baseTerritory,
        assignedTo: null,
        assignedToId: null,
        prospectCount: 0,
      };
      service.findAll.mockResolvedValue([unassigned]);

      const result = await controller.findAll(mockRequest as any);

      expect(result[0].assignedToName).toBeNull();
    });

    it("should throw ForbiddenException when user has no organization", async () => {
      await expect(controller.findAll(mockRequestNoOrg as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("myTerritories", () => {
    it("should return territories for current user", () => {
      service.territoriesForUser.mockResolvedValue([baseTerritory]);

      controller.myTerritories(mockRequest as any);

      expect(service.territoriesForUser).toHaveBeenCalledWith(100);
    });
  });

  describe("findOne", () => {
    it("should return territory by id", () => {
      service.findOne.mockResolvedValue(baseTerritory);

      controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe("update", () => {
    it("should update territory", () => {
      const updated = { ...baseTerritory, name: "Updated" };
      service.update.mockResolvedValue(updated);

      controller.update(1, { name: "Updated" });

      expect(service.update).toHaveBeenCalledWith(1, { name: "Updated" });
    });
  });

  describe("delete", () => {
    it("should delete territory", () => {
      service.delete.mockResolvedValue(undefined);

      controller.delete(1);

      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });

  describe("assign", () => {
    it("should assign territory to user", () => {
      service.assign.mockResolvedValue({ ...baseTerritory, assignedToId: 300 });

      controller.assign(1, { userId: 300 });

      expect(service.assign).toHaveBeenCalledWith(1, 300);
    });
  });

  describe("prospects", () => {
    const mockOwner = { id: 200, firstName: "Jane", lastName: "Doe" } as any;

    const mockProspect = (overrides: Partial<Prospect> = {}): Prospect =>
      ({
        id: 1,
        owner: mockOwner,
        ownerId: 200,
        companyName: "Acme Inc",
        contactName: "John Smith",
        contactEmail: "john@example.com",
        contactPhone: "0821234567",
        contactTitle: "Buyer",
        address: Address.fromParts({
          streetAddress: "10 Main Rd",
          city: "Johannesburg",
          province: "Gauteng",
          postalCode: "2000",
        }),
        country: "South Africa",
        latitude: null,
        longitude: null,
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
        ...overrides,
      }) as Prospect;

    it("should return prospects in territory", async () => {
      service.prospectsInTerritory.mockResolvedValue([]);

      await controller.prospects(1);

      expect(service.prospectsInTerritory).toHaveBeenCalledWith(1);
    });

    it("should expose address fields flat and preserve the populated owner", async () => {
      service.prospectsInTerritory.mockResolvedValue([mockProspect()]);

      const result = (await controller.prospects(1)) as unknown as Array<Record<string, unknown>>;

      expect(result).toHaveLength(1);
      expect(result[0].streetAddress).toBe("10 Main Rd");
      expect(result[0].city).toBe("Johannesburg");
      expect(result[0].province).toBe("Gauteng");
      expect(result[0].postalCode).toBe("2000");
      expect(result[0]).not.toHaveProperty("address");
      expect(result[0].owner).toBe(mockOwner);
    });

    it("should set owner to null when the relation is absent", async () => {
      service.prospectsInTerritory.mockResolvedValue([mockProspect({ owner: null as any })]);

      const result = (await controller.prospects(1)) as unknown as Array<Record<string, unknown>>;

      expect(result[0].owner).toBeNull();
    });
  });
});
