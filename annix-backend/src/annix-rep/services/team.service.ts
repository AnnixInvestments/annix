import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { TeamMember, TeamMemberStatus, TeamRole } from "../entities/team-member.entity";

export interface TeamHierarchyNode {
  member: TeamMember;
  directReports: TeamHierarchyNode[];
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async members(orgId: number): Promise<TeamMember[]> {
    return this.teamMemberRepo.find({
      where: { organizationId: orgId },
      relations: ["user", "reportsTo"],
      order: { joinedAt: "ASC" },
    });
  }

  async activeMembers(orgId: number): Promise<TeamMember[]> {
    return this.teamMemberRepo.find({
      where: { organizationId: orgId, status: TeamMemberStatus.ACTIVE },
      relations: ["user", "reportsTo"],
      order: { joinedAt: "ASC" },
    });
  }

  async memberById(memberId: number): Promise<TeamMember | null> {
    return this.teamMemberRepo.findOne({
      where: { id: memberId },
      relations: ["user", "reportsTo", "organization"],
    });
  }

  async memberByUser(orgId: number, userId: number): Promise<TeamMember | null> {
    return this.teamMemberRepo.findOne({
      where: { organizationId: orgId, userId },
      relations: ["user", "reportsTo", "organization"],
    });
  }

  async memberByUserAnyOrg(userId: number): Promise<TeamMember | null> {
    return this.teamMemberRepo.findOne({
      where: { userId },
      relations: ["user", "reportsTo", "organization"],
    });
  }

  async addMember(
    orgId: number,
    userId: number,
    role: TeamRole,
    reportsToId?: number,
  ): Promise<TeamMember> {
    const existingMember = await this.memberByUser(orgId, userId);
    if (existingMember) {
      throw new ConflictException("User is already a member of this organization");
    }

    const member = this.teamMemberRepo.create({
      organizationId: orgId,
      userId,
      role,
      status: TeamMemberStatus.ACTIVE,
      reportsToId: reportsToId ?? null,
    });

    const saved = await this.teamMemberRepo.save(member);
    this.logger.log(`Member added to org ${orgId}: user ${userId} as ${role}`);
    return saved;
  }

  async updateMemberRole(memberId: number, role: TeamRole): Promise<TeamMember> {
    const member = await this.memberById(memberId);
    if (!member) {
      throw new NotFoundException("Team member not found");
    }

    member.role = role;
    const saved = await this.teamMemberRepo.save(member);
    this.logger.log(`Member ${memberId} role updated to ${role}`);
    return saved;
  }

  async updateMemberStatus(memberId: number, status: TeamMemberStatus): Promise<TeamMember> {
    const member = await this.memberById(memberId);
    if (!member) {
      throw new NotFoundException("Team member not found");
    }

    member.status = status;
    return this.teamMemberRepo.save(member);
  }

  async removeMember(memberId: number): Promise<void> {
    const member = await this.memberById(memberId);
    if (!member) {
      throw new NotFoundException("Team member not found");
    }

    await this.teamMemberRepo.remove(member);
    this.logger.log(`Member ${memberId} removed from organization`);
  }

  async setReportsTo(memberId: number, reportsToId: number | null): Promise<TeamMember> {
    const member = await this.memberById(memberId);
    if (!member) {
      throw new NotFoundException("Team member not found");
    }

    if (reportsToId !== null) {
      const manager = await this.memberByUser(member.organizationId, reportsToId);
      if (!manager) {
        throw new NotFoundException("Manager not found in organization");
      }
      if (manager.userId === member.userId) {
        throw new ConflictException("Member cannot report to themselves");
      }
    }

    member.reportsToId = reportsToId;
    return this.teamMemberRepo.save(member);
  }

  async teamHierarchy(orgId: number): Promise<TeamHierarchyNode[]> {
    const allMembers = await this.members(orgId);
    const memberMap = new Map<number, TeamMember>();
    const childrenMap = new Map<number, TeamMember[]>();

    allMembers.forEach((m) => {
      memberMap.set(m.userId, m);
      if (m.reportsToId !== null) {
        const existing = childrenMap.get(m.reportsToId) ?? [];
        existing.push(m);
        childrenMap.set(m.reportsToId, existing);
      }
    });

    const buildNode = (member: TeamMember): TeamHierarchyNode => {
      const children = childrenMap.get(member.userId) ?? [];
      return {
        member,
        directReports: children.map(buildNode),
      };
    };

    const topLevel = allMembers.filter((m) => m.reportsToId === null);
    return topLevel.map(buildNode);
  }

  async directReports(orgId: number, managerId: number): Promise<TeamMember[]> {
    return this.teamMemberRepo.find({
      where: { organizationId: orgId, reportsToId: managerId },
      relations: ["user"],
    });
  }

  async isUserInOrganization(userId: number, orgId: number): Promise<boolean> {
    const member = await this.memberByUser(orgId, userId);
    return member !== null && member.status === TeamMemberStatus.ACTIVE;
  }

  async userRole(userId: number, orgId: number): Promise<TeamRole | null> {
    const member = await this.memberByUser(orgId, userId);
    return member?.role ?? null;
  }
}
