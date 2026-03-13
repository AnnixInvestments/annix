import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AnnixRepAuthGuard } from "../auth";
import { TeamRoleGuard } from "../auth/guards/team-role.guard";
import { TeamMember, TeamMemberStatus, TeamRole } from "../entities/team-member.entity";
import { TeamService } from "../services/team.service";
import { TeamController } from "./team.controller";

describe("TeamController", () => {
  let controller: TeamController;
  let service: jest.Mocked<TeamService>;

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

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
      organizationId: 10,
      teamRole: TeamRole.ADMIN,
    },
  };

  const mockRequestNoOrg = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
      organizationId: null,
    },
  };

  beforeEach(async () => {
    const mockService = {
      members: jest.fn(),
      memberById: jest.fn(),
      updateMemberRole: jest.fn(),
      removeMember: jest.fn(),
      setReportsTo: jest.fn(),
      teamHierarchy: jest.fn(),
      directReports: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [{ provide: TeamService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeamRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeamController>(TeamController);
    service = module.get(TeamService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("members", () => {
    it("should return members with userName and userEmail", async () => {
      service.members.mockResolvedValue([baseMember]);

      const result = await controller.members(mockRequest as any);

      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe("Jane Doe");
      expect(result[0].userEmail).toBe("jane@example.com");
      expect(service.members).toHaveBeenCalledWith(10);
    });

    it("should throw ForbiddenException when user has no organization", async () => {
      await expect(controller.members(mockRequestNoOrg as any)).rejects.toThrow(ForbiddenException);
    });

    it("should handle member with no user relation", async () => {
      const memberNoUser = { ...baseMember, user: null as any };
      service.members.mockResolvedValue([memberNoUser]);

      const result = await controller.members(mockRequest as any);

      expect(result[0].userName).toBeUndefined();
      expect(result[0].userEmail).toBeUndefined();
    });
  });

  describe("memberById", () => {
    it("should delegate to service.memberById", () => {
      service.memberById.mockResolvedValue(baseMember);

      const result = controller.memberById(1);

      expect(service.memberById).toHaveBeenCalledWith(1);
    });
  });

  describe("updateRole", () => {
    it("should delegate to service.updateMemberRole", () => {
      service.updateMemberRole.mockResolvedValue({
        ...baseMember,
        role: TeamRole.MANAGER,
      });

      controller.updateRole(1, { role: TeamRole.MANAGER });

      expect(service.updateMemberRole).toHaveBeenCalledWith(1, TeamRole.MANAGER);
    });
  });

  describe("removeMember", () => {
    it("should delegate to service.removeMember", () => {
      service.removeMember.mockResolvedValue(undefined);

      controller.removeMember(1);

      expect(service.removeMember).toHaveBeenCalledWith(1);
    });
  });

  describe("setReportsTo", () => {
    it("should delegate to service.setReportsTo", () => {
      service.setReportsTo.mockResolvedValue({ ...baseMember, reportsToId: 200 });

      controller.setReportsTo(1, { reportsToId: 200 });

      expect(service.setReportsTo).toHaveBeenCalledWith(1, 200);
    });
  });

  describe("hierarchy", () => {
    it("should return team hierarchy for the org", async () => {
      const hierarchy = [{ member: baseMember, directReports: [] }];
      service.teamHierarchy.mockResolvedValue(hierarchy);

      const result = await controller.hierarchy(mockRequest as any);

      expect(result).toEqual(hierarchy);
      expect(service.teamHierarchy).toHaveBeenCalledWith(10);
    });

    it("should throw ForbiddenException when user has no organization", async () => {
      await expect(controller.hierarchy(mockRequestNoOrg as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("myTeam", () => {
    it("should return direct reports for current user", async () => {
      const reports = [{ ...baseMember, reportsToId: 100 }];
      service.directReports.mockResolvedValue(reports);

      const result = await controller.myTeam(mockRequest as any);

      expect(result).toEqual(reports);
      expect(service.directReports).toHaveBeenCalledWith(10, 100);
    });

    it("should throw ForbiddenException when user has no organization", async () => {
      await expect(controller.myTeam(mockRequestNoOrg as any)).rejects.toThrow(ForbiddenException);
    });
  });
});
