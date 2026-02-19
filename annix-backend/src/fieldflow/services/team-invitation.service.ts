import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { now } from "../../lib/datetime";
import { Organization } from "../entities/organization.entity";
import { TeamInvitation, TeamInvitationStatus } from "../entities/team-invitation.entity";
import { TeamMember, TeamRole } from "../entities/team-member.entity";
import { OrganizationService } from "./organization.service";
import { TeamService } from "./team.service";

export interface CreateInvitationDto {
  email: string;
  inviteeName?: string;
  role?: TeamRole;
  territoryId?: number;
  message?: string;
}

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class TeamInvitationService {
  private readonly logger = new Logger(TeamInvitationService.name);

  constructor(
    @InjectRepository(TeamInvitation)
    private readonly invitationRepo: Repository<TeamInvitation>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
    private readonly organizationService: OrganizationService,
    private readonly teamService: TeamService,
  ) {}

  async create(
    orgId: number,
    invitedById: number,
    dto: CreateInvitationDto,
  ): Promise<TeamInvitation> {
    const canAdd = await this.organizationService.canAddMembers(orgId);
    if (!canAdd) {
      throw new ConflictException("Organization has reached maximum member limit");
    }

    const existingMember = await this.teamMemberRepo.findOne({
      where: { organizationId: orgId },
      relations: ["user"],
    });
    if (existingMember?.user?.email === dto.email) {
      throw new ConflictException("User is already a member of this organization");
    }

    const existingPending = await this.invitationRepo.findOne({
      where: {
        organizationId: orgId,
        email: dto.email,
        status: TeamInvitationStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new ConflictException("An invitation is already pending for this email");
    }

    const token = uuidv4();
    const expiresAt = now().plus({ days: INVITATION_EXPIRY_DAYS }).toJSDate();

    const invitation = this.invitationRepo.create({
      organizationId: orgId,
      invitedById,
      email: dto.email,
      inviteeName: dto.inviteeName ?? null,
      token,
      role: dto.role ?? TeamRole.REP,
      territoryId: dto.territoryId ?? null,
      status: TeamInvitationStatus.PENDING,
      message: dto.message ?? null,
      expiresAt,
    });

    const saved = await this.invitationRepo.save(invitation);
    this.logger.log(`Invitation created for ${dto.email} to org ${orgId}`);

    return saved;
  }

  async findPending(orgId: number): Promise<TeamInvitation[]> {
    return this.invitationRepo.find({
      where: { organizationId: orgId, status: TeamInvitationStatus.PENDING },
      relations: ["invitedBy", "territory"],
      order: { createdAt: "DESC" },
    });
  }

  async findByToken(token: string): Promise<TeamInvitation | null> {
    return this.invitationRepo.findOne({
      where: { token },
      relations: ["organization", "invitedBy", "territory"],
    });
  }

  async findById(id: number): Promise<TeamInvitation | null> {
    return this.invitationRepo.findOne({
      where: { id },
      relations: ["organization", "invitedBy", "territory"],
    });
  }

  async accept(token: string, userId: number): Promise<TeamMember> {
    const invitation = await this.findByToken(token);
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== TeamInvitationStatus.PENDING) {
      throw new ConflictException(`Invitation is ${invitation.status}`);
    }

    if (now().toJSDate() > invitation.expiresAt) {
      invitation.status = TeamInvitationStatus.EXPIRED;
      await this.invitationRepo.save(invitation);
      throw new ConflictException("Invitation has expired");
    }

    const canAdd = await this.organizationService.canAddMembers(invitation.organizationId);
    if (!canAdd) {
      throw new ConflictException("Organization has reached maximum member limit");
    }

    const member = await this.teamService.addMember(
      invitation.organizationId,
      userId,
      invitation.role,
    );

    invitation.status = TeamInvitationStatus.ACCEPTED;
    invitation.acceptedAt = now().toJSDate();
    await this.invitationRepo.save(invitation);

    this.logger.log(
      `Invitation accepted: ${invitation.email} joined org ${invitation.organizationId}`,
    );
    return member;
  }

  async decline(token: string): Promise<void> {
    const invitation = await this.findByToken(token);
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== TeamInvitationStatus.PENDING) {
      throw new ConflictException(`Invitation is already ${invitation.status}`);
    }

    invitation.status = TeamInvitationStatus.DECLINED;
    await this.invitationRepo.save(invitation);
    this.logger.log(`Invitation declined: ${invitation.email}`);
  }

  async cancel(invitationId: number): Promise<void> {
    const invitation = await this.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== TeamInvitationStatus.PENDING) {
      throw new ConflictException(`Cannot cancel ${invitation.status} invitation`);
    }

    invitation.status = TeamInvitationStatus.CANCELLED;
    await this.invitationRepo.save(invitation);
    this.logger.log(`Invitation cancelled: ${invitation.email}`);
  }

  async resend(invitationId: number): Promise<TeamInvitation> {
    const invitation = await this.findById(invitationId);
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== TeamInvitationStatus.PENDING) {
      throw new ConflictException(`Cannot resend ${invitation.status} invitation`);
    }

    invitation.token = uuidv4();
    invitation.expiresAt = now().plus({ days: INVITATION_EXPIRY_DAYS }).toJSDate();

    const saved = await this.invitationRepo.save(invitation);
    this.logger.log(`Invitation resent: ${invitation.email}`);

    return saved;
  }

  async expireOldInvitations(): Promise<number> {
    const result = await this.invitationRepo.update(
      {
        status: TeamInvitationStatus.PENDING,
        expiresAt: LessThan(now().toJSDate()),
      },
      { status: TeamInvitationStatus.EXPIRED },
    );

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Expired ${affected} old invitations`);
    }
    return affected;
  }
}
