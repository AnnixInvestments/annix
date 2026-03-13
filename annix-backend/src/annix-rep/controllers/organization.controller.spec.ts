import { Test, TestingModule } from "@nestjs/testing";
import { AnnixRepAuthGuard } from "../auth";
import { TeamRoleGuard } from "../auth/guards/team-role.guard";
import { Organization, OrganizationPlan } from "../entities/organization.entity";
import { TeamRole } from "../entities/team-member.entity";
import { OrganizationService } from "../services/organization.service";
import { OrganizationController } from "./organization.controller";

describe("OrganizationController", () => {
  let controller: OrganizationController;
  let service: jest.Mocked<OrganizationService>;

  const baseOrg: Organization = {
    id: 1,
    name: "Test Corp",
    slug: "test-corp-ab12",
    ownerId: 100,
    owner: { id: 100, firstName: "Jane", lastName: "Doe" } as any,
    plan: OrganizationPlan.FREE,
    maxMembers: 5,
    industry: "manufacturing",
    logoUrl: null,
    isActive: true,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
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

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findByUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      stats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [{ provide: OrganizationService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationController>(OrganizationController);
    service = module.get(OrganizationService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create organization with current user as owner", () => {
      service.create.mockResolvedValue(baseOrg);

      controller.create(mockRequest as any, { name: "Test Corp" });

      expect(service.create).toHaveBeenCalledWith(100, { name: "Test Corp" });
    });
  });

  describe("current", () => {
    it("should return organization for current user", () => {
      service.findByUser.mockResolvedValue(baseOrg);

      controller.current(mockRequest as any);

      expect(service.findByUser).toHaveBeenCalledWith(100);
    });

    it("should return null when user has no organization", async () => {
      service.findByUser.mockResolvedValue(null);

      const result = await controller.current(mockRequest as any);

      expect(result).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should return organization by id", () => {
      service.findOne.mockResolvedValue(baseOrg);

      controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe("update", () => {
    it("should update organization", () => {
      const updated = { ...baseOrg, name: "Updated Corp" };
      service.update.mockResolvedValue(updated);

      controller.update(1, { name: "Updated Corp" });

      expect(service.update).toHaveBeenCalledWith(1, { name: "Updated Corp" });
    });
  });

  describe("delete", () => {
    it("should delete organization using current user id", () => {
      service.delete.mockResolvedValue(undefined);

      controller.delete(mockRequest as any, 1);

      expect(service.delete).toHaveBeenCalledWith(1, 100);
    });
  });

  describe("stats", () => {
    it("should return organization stats", async () => {
      const stats = {
        memberCount: 5,
        activeMembers: 4,
        territoryCount: 3,
        prospectCount: 10,
        meetingsThisMonth: 2,
      };
      service.stats.mockResolvedValue(stats);

      const result = await controller.stats(1);

      expect(result).toEqual(stats);
      expect(service.stats).toHaveBeenCalledWith(1);
    });
  });
});
