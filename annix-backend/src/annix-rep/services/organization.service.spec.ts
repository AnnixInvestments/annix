import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Organization, OrganizationPlan } from "../entities/organization.entity";
import { TeamMember, TeamMemberStatus, TeamRole } from "../entities/team-member.entity";
import { OrganizationRepository } from "../organization.repository";
import { TeamMemberRepository } from "../team-member.repository";
import { OrganizationService } from "./organization.service";

describe("OrganizationService", () => {
  let service: OrganizationService;
  let mockOrgRepo: Partial<OrganizationRepository>;
  let mockTeamMemberRepo: Partial<TeamMemberRepository>;

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

  const baseMember: TeamMember = {
    id: 1,
    organizationId: 1,
    userId: 100,
    role: TeamRole.ADMIN,
    status: TeamMemberStatus.ACTIVE,
    reportsTo: null,
    reportsToId: null,
    joinedAt: new Date("2026-01-15T10:00:00Z"),
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    organization: baseOrg as any,
    user: null as any,
  };

  beforeEach(async () => {
    mockOrgRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findWithOwner: jest.fn(),
      findBySlug: jest.fn(),
      findBySlugWithOwner: jest.fn(),
      remove: jest.fn(),
    };

    mockTeamMemberRepo = {
      create: jest.fn(),
      findByOrganizationAndUser: jest.fn(),
      findByUserWithOrganization: jest.fn(),
      countByOrganization: jest.fn(),
      countActiveByOrganization: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: OrganizationRepository,
          useValue: mockOrgRepo,
        },
        {
          provide: TeamMemberRepository,
          useValue: mockTeamMemberRepo,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create organization and add owner as admin member", async () => {
      (mockTeamMemberRepo.findByOrganizationAndUser as jest.Mock).mockResolvedValue(null);
      (mockTeamMemberRepo.findByUserWithOrganization as jest.Mock).mockResolvedValue(null);
      (mockOrgRepo.findBySlug as jest.Mock).mockResolvedValue(null);
      (mockOrgRepo.create as jest.Mock).mockResolvedValue(baseOrg);
      (mockTeamMemberRepo.create as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.create(100, { name: "Test Corp" });

      expect(result).toEqual(baseOrg);
      expect(mockOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Corp",
          ownerId: 100,
          plan: OrganizationPlan.FREE,
          maxMembers: 5,
          isActive: true,
        }),
      );
      expect(mockTeamMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: baseOrg.id,
          userId: 100,
          role: TeamRole.ADMIN,
          status: TeamMemberStatus.ACTIVE,
        }),
      );
    });

    it("should throw ConflictException when user already in an org", async () => {
      (mockTeamMemberRepo.findByUserWithOrganization as jest.Mock).mockResolvedValue(baseMember);

      await expect(service.create(100, { name: "New Corp" })).rejects.toThrow(ConflictException);
    });

    it("should throw ConflictException when slug already taken", async () => {
      (mockTeamMemberRepo.findByUserWithOrganization as jest.Mock).mockResolvedValue(null);
      (mockOrgRepo.findBySlug as jest.Mock).mockResolvedValue(baseOrg);

      await expect(service.create(100, { name: "Test Corp" })).rejects.toThrow(ConflictException);
    });

    it("should pass optional industry and logoUrl", async () => {
      (mockTeamMemberRepo.findByUserWithOrganization as jest.Mock).mockResolvedValue(null);
      (mockOrgRepo.findBySlug as jest.Mock).mockResolvedValue(null);
      (mockOrgRepo.create as jest.Mock).mockResolvedValue(baseOrg);
      (mockTeamMemberRepo.create as jest.Mock).mockResolvedValue(baseMember);

      await service.create(100, {
        name: "Test Corp",
        industry: "tech",
        logoUrl: "https://example.com/logo.png",
      });

      expect(mockOrgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: "tech",
          logoUrl: "https://example.com/logo.png",
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return organization when found", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(baseOrg);

      const result = await service.findOne(1);

      expect(result).toEqual(baseOrg);
      expect(mockOrgRepo.findWithOwner).toHaveBeenCalledWith(1);
    });

    it("should return null when not found", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  describe("findBySlug", () => {
    it("should return organization by slug", async () => {
      (mockOrgRepo.findBySlugWithOwner as jest.Mock).mockResolvedValue(baseOrg);

      const result = await service.findBySlug("test-corp-ab12");

      expect(result).toEqual(baseOrg);
      expect(mockOrgRepo.findBySlugWithOwner).toHaveBeenCalledWith("test-corp-ab12");
    });
  });

  describe("findByUser", () => {
    it("should return organization for user", async () => {
      (mockTeamMemberRepo.findByUserWithOrganization as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.findByUser(100);

      expect(result).toEqual(baseOrg);
    });

    it("should return null when user has no org", async () => {
      (mockTeamMemberRepo.findByUserWithOrganization as jest.Mock).mockResolvedValue(null);

      const result = await service.findByUser(999);

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update organization fields", async () => {
      const updated = { ...baseOrg, name: "Updated Corp" };
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue({ ...baseOrg });
      (mockOrgRepo.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(1, { name: "Updated Corp" });

      expect(result.name).toBe("Updated Corp");
    });

    it("should throw NotFoundException when org not found", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("should only update provided fields", async () => {
      const org = { ...baseOrg };
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(org);
      (mockOrgRepo.save as jest.Mock).mockImplementation((o) => Promise.resolve(o));

      await service.update(1, { industry: "tech" });

      expect(org.industry).toBe("tech");
      expect(org.name).toBe("Test Corp");
    });

    it("should update plan and maxMembers", async () => {
      const org = { ...baseOrg };
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(org);
      (mockOrgRepo.save as jest.Mock).mockImplementation((o) => Promise.resolve(o));

      await service.update(1, { plan: OrganizationPlan.TEAM, maxMembers: 20 });

      expect(org.plan).toBe(OrganizationPlan.TEAM);
      expect(org.maxMembers).toBe(20);
    });
  });

  describe("delete", () => {
    it("should delete organization when requested by owner", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(baseOrg);
      (mockOrgRepo.remove as jest.Mock).mockResolvedValue(undefined);

      await service.delete(1, 100);

      expect(mockOrgRepo.remove).toHaveBeenCalledWith(baseOrg);
    });

    it("should throw NotFoundException when org not found", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(null);

      await expect(service.delete(999, 100)).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when non-owner tries to delete", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(baseOrg);

      await expect(service.delete(1, 999)).rejects.toThrow(ConflictException);
    });
  });

  describe("memberCount", () => {
    it("should return count of active members", async () => {
      (mockTeamMemberRepo.countActiveByOrganization as jest.Mock).mockResolvedValue(3);

      const result = await service.memberCount(1);

      expect(result).toBe(3);
      expect(mockTeamMemberRepo.countActiveByOrganization).toHaveBeenCalledWith(1);
    });
  });

  describe("canAddMembers", () => {
    it("should return true when under max members", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(baseOrg);
      (mockTeamMemberRepo.countActiveByOrganization as jest.Mock).mockResolvedValue(3);

      const result = await service.canAddMembers(1);

      expect(result).toBe(true);
    });

    it("should return false when at max members", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(baseOrg);
      (mockTeamMemberRepo.countActiveByOrganization as jest.Mock).mockResolvedValue(5);

      const result = await service.canAddMembers(1);

      expect(result).toBe(false);
    });

    it("should return false when org not found", async () => {
      (mockOrgRepo.findWithOwner as jest.Mock).mockResolvedValue(null);

      const result = await service.canAddMembers(999);

      expect(result).toBe(false);
    });
  });

  describe("stats", () => {
    it("should return organization statistics", async () => {
      (mockTeamMemberRepo.countByOrganization as jest.Mock).mockResolvedValue(5);
      (mockTeamMemberRepo.countActiveByOrganization as jest.Mock).mockResolvedValue(4);

      const result = await service.stats(1);

      expect(result).toEqual({
        memberCount: 5,
        activeMembers: 4,
        territoryCount: 0,
        prospectCount: 0,
        meetingsThisMonth: 0,
      });
    });
  });
});
