import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { TeamMember, TeamMemberStatus, TeamRole } from "../entities/team-member.entity";
import { TeamService } from "./team.service";

describe("TeamService", () => {
  let service: TeamService;
  let mockTeamMemberRepo: Partial<Repository<TeamMember>>;
  let mockUserRepo: Partial<Repository<User>>;

  const baseMember: TeamMember = {
    id: 1,
    organizationId: 10,
    userId: 100,
    role: TeamRole.REP,
    status: TeamMemberStatus.ACTIVE,
    reportsTo: null,
    reportsToId: null,
    joinedAt: new Date("2026-01-15T10:00:00Z"),
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
    organization: null as any,
    user: { id: 100, firstName: "Jane", lastName: "Doe", email: "jane@example.com" } as any,
  };

  beforeEach(async () => {
    mockTeamMemberRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: getRepositoryToken(TeamMember),
          useValue: mockTeamMemberRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("members", () => {
    it("should return all members for an organization", async () => {
      const members = [baseMember, { ...baseMember, id: 2, userId: 101 }];
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue(members);

      const result = await service.members(10);

      expect(result).toEqual(members);
      expect(mockTeamMemberRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 10 },
        relations: ["user", "reportsTo"],
        order: { joinedAt: "ASC" },
      });
    });

    it("should return empty array when no members exist", async () => {
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.members(999);

      expect(result).toEqual([]);
    });
  });

  describe("activeMembers", () => {
    it("should return only active members", async () => {
      const activeMembers = [baseMember];
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue(activeMembers);

      const result = await service.activeMembers(10);

      expect(result).toEqual(activeMembers);
      expect(mockTeamMemberRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 10, status: TeamMemberStatus.ACTIVE },
        relations: ["user", "reportsTo"],
        order: { joinedAt: "ASC" },
      });
    });
  });

  describe("memberById", () => {
    it("should return member when found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.memberById(1);

      expect(result).toEqual(baseMember);
      expect(mockTeamMemberRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ["user", "reportsTo", "organization"],
      });
    });

    it("should return null when member not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.memberById(999);

      expect(result).toBeNull();
    });
  });

  describe("memberByUser", () => {
    it("should return member for given org and user", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.memberByUser(10, 100);

      expect(result).toEqual(baseMember);
      expect(mockTeamMemberRepo.findOne).toHaveBeenCalledWith({
        where: { organizationId: 10, userId: 100 },
        relations: ["user", "reportsTo", "organization"],
      });
    });

    it("should return null when user is not in org", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.memberByUser(10, 999);

      expect(result).toBeNull();
    });
  });

  describe("memberByUserAnyOrg", () => {
    it("should return member across any organization", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.memberByUserAnyOrg(100);

      expect(result).toEqual(baseMember);
      expect(mockTeamMemberRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 100 },
        relations: ["user", "reportsTo", "organization"],
      });
    });
  });

  describe("addMember", () => {
    it("should create and save a new member", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);
      const created = { ...baseMember, role: TeamRole.REP };
      (mockTeamMemberRepo.create as jest.Mock).mockReturnValue(created);
      (mockTeamMemberRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.addMember(10, 100, TeamRole.REP);

      expect(result).toEqual(created);
      expect(mockTeamMemberRepo.create).toHaveBeenCalledWith({
        organizationId: 10,
        userId: 100,
        role: TeamRole.REP,
        status: TeamMemberStatus.ACTIVE,
        reportsToId: null,
      });
    });

    it("should pass reportsToId when provided", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);
      const created = { ...baseMember, reportsToId: 200 };
      (mockTeamMemberRepo.create as jest.Mock).mockReturnValue(created);
      (mockTeamMemberRepo.save as jest.Mock).mockResolvedValue(created);

      await service.addMember(10, 100, TeamRole.REP, 200);

      expect(mockTeamMemberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reportsToId: 200 }),
      );
    });

    it("should throw ConflictException when user already in org", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);

      await expect(service.addMember(10, 100, TeamRole.REP)).rejects.toThrow(ConflictException);
    });
  });

  describe("updateMemberRole", () => {
    it("should update and return member with new role", async () => {
      const updated = { ...baseMember, role: TeamRole.MANAGER };
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue({ ...baseMember });
      (mockTeamMemberRepo.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateMemberRole(1, TeamRole.MANAGER);

      expect(result).toEqual(updated);
      expect(mockTeamMemberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: TeamRole.MANAGER }),
      );
    });

    it("should throw NotFoundException when member not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateMemberRole(999, TeamRole.MANAGER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateMemberStatus", () => {
    it("should update and return member with new status", async () => {
      const updated = { ...baseMember, status: TeamMemberStatus.INACTIVE };
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue({ ...baseMember });
      (mockTeamMemberRepo.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateMemberStatus(1, TeamMemberStatus.INACTIVE);

      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when member not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateMemberStatus(999, TeamMemberStatus.INACTIVE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("removeMember", () => {
    it("should remove the member", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);
      (mockTeamMemberRepo.remove as jest.Mock).mockResolvedValue(baseMember);

      await service.removeMember(1);

      expect(mockTeamMemberRepo.remove).toHaveBeenCalledWith(baseMember);
    });

    it("should throw NotFoundException when member not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.removeMember(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("setReportsTo", () => {
    it("should set reportsToId and save", async () => {
      const manager = { ...baseMember, id: 2, userId: 200, role: TeamRole.MANAGER };
      const member = { ...baseMember, organizationId: 10 };
      (mockTeamMemberRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(manager);
      const saved = { ...member, reportsToId: 200 };
      (mockTeamMemberRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.setReportsTo(1, 200);

      expect(result.reportsToId).toBe(200);
    });

    it("should allow setting reportsTo to null", async () => {
      const member = { ...baseMember, reportsToId: 200 };
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValueOnce(member);
      const saved = { ...member, reportsToId: null };
      (mockTeamMemberRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.setReportsTo(1, null);

      expect(result.reportsToId).toBeNull();
    });

    it("should throw NotFoundException when member not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.setReportsTo(999, 200)).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when manager not found", async () => {
      const member = { ...baseMember, organizationId: 10 };
      (mockTeamMemberRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(null);

      await expect(service.setReportsTo(1, 200)).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when member reports to themselves", async () => {
      const member = { ...baseMember, organizationId: 10, userId: 100 };
      const selfManager = { ...baseMember, id: 2, userId: 100 };
      (mockTeamMemberRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(member)
        .mockResolvedValueOnce(selfManager);

      await expect(service.setReportsTo(1, 100)).rejects.toThrow(ConflictException);
    });
  });

  describe("teamHierarchy", () => {
    it("should build hierarchy tree from flat members", async () => {
      const admin = { ...baseMember, id: 1, userId: 100, reportsToId: null, role: TeamRole.ADMIN };
      const rep = { ...baseMember, id: 2, userId: 200, reportsToId: 100, role: TeamRole.REP };
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue([admin, rep]);

      const result = await service.teamHierarchy(10);

      expect(result).toHaveLength(1);
      expect(result[0].member.userId).toBe(100);
      expect(result[0].directReports).toHaveLength(1);
      expect(result[0].directReports[0].member.userId).toBe(200);
    });

    it("should return multiple top-level nodes when no reports-to", async () => {
      const memberA = { ...baseMember, id: 1, userId: 100, reportsToId: null };
      const memberB = { ...baseMember, id: 2, userId: 200, reportsToId: null };
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue([memberA, memberB]);

      const result = await service.teamHierarchy(10);

      expect(result).toHaveLength(2);
    });

    it("should return empty array for org with no members", async () => {
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.teamHierarchy(10);

      expect(result).toEqual([]);
    });
  });

  describe("directReports", () => {
    it("should return direct reports for a manager", async () => {
      const reports = [{ ...baseMember, reportsToId: 100 }];
      (mockTeamMemberRepo.find as jest.Mock).mockResolvedValue(reports);

      const result = await service.directReports(10, 100);

      expect(result).toEqual(reports);
      expect(mockTeamMemberRepo.find).toHaveBeenCalledWith({
        where: { organizationId: 10, reportsToId: 100 },
        relations: ["user"],
      });
    });
  });

  describe("isUserInOrganization", () => {
    it("should return true when user is active member", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.isUserInOrganization(100, 10);

      expect(result).toBe(true);
    });

    it("should return false when user not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.isUserInOrganization(999, 10);

      expect(result).toBe(false);
    });

    it("should return false when user is inactive", async () => {
      const inactive = { ...baseMember, status: TeamMemberStatus.INACTIVE };
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(inactive);

      const result = await service.isUserInOrganization(100, 10);

      expect(result).toBe(false);
    });
  });

  describe("userRole", () => {
    it("should return role when member exists", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(baseMember);

      const result = await service.userRole(100, 10);

      expect(result).toBe(TeamRole.REP);
    });

    it("should return null when member not found", async () => {
      (mockTeamMemberRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.userRole(999, 10);

      expect(result).toBeNull();
    });
  });
});
