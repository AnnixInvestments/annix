import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import {
  CreateAnnixOrbitTeamInviteDto,
  UpdateAnnixOrbitMemberRoleDto,
} from "../dto/annix-orbit-team.dto";
import type { AnnixOrbitRecruiterRole } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { AnnixOrbitTeamInviteRepository } from "../repositories/annix-orbit-team-invite.repository";

const MANAGE_ROLES: AnnixOrbitRecruiterRole[] = ["owner", "manager"];

export interface AnnixOrbitTeamActor {
  id: number;
  recruiterRole: AnnixOrbitRecruiterRole | null;
}

@Injectable()
export class AnnixOrbitTeamService {
  constructor(
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly inviteRepo: AnnixOrbitTeamInviteRepository,
    private readonly cvCompanyRepo: AnnixOrbitCompanyRepository,
    private readonly emailService: EmailService,
  ) {}

  private assertCanManage(actor: AnnixOrbitTeamActor): void {
    if (!actor.recruiterRole || !MANAGE_ROLES.includes(actor.recruiterRole)) {
      throw new ForbiddenException("Only an agency owner or manager can manage the team.");
    }
  }

  async listTeam(companyId: number) {
    const profiles = await this.profileRepo.teamMembers(companyId);
    const members = profiles.map((p) => ({
      userId: p.userId,
      name: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(" ") || p.user?.email || "",
      email: p.user?.email ?? "",
      recruiterRole: p.recruiterRole ?? null,
    }));
    const invites = (await this.inviteRepo.findByCompany(companyId))
      .filter((i) => i.status === "pending")
      .map((i) => ({
        id: i.id,
        email: i.email,
        recruiterRole: i.recruiterRole,
        createdAt: i.createdAt,
      }));
    return { members, invites };
  }

  async createInvite(
    companyId: number,
    actor: AnnixOrbitTeamActor,
    dto: CreateAnnixOrbitTeamInviteDto,
  ) {
    this.assertCanManage(actor);
    const token = uuidv4();
    const expiresAt = now().plus({ days: 7 }).toISO();
    await this.inviteRepo.create({
      companyId,
      email: dto.email,
      recruiterRole: dto.recruiterRole as AnnixOrbitRecruiterRole,
      token,
      invitedByUserId: actor.id,
      status: "pending",
      expiresAt,
    });

    const agency = await this.cvCompanyRepo.findById(companyId);
    const agencyName = agency?.name ?? "your agency";
    await this.emailService.sendAnnixOrbitTeamInviteEmail(dto.email, token, agencyName);
    return { success: true };
  }

  async updateMemberRole(
    companyId: number,
    actor: AnnixOrbitTeamActor,
    targetUserId: number,
    dto: UpdateAnnixOrbitMemberRoleDto,
  ) {
    this.assertCanManage(actor);
    const profile = await this.profileRepo.findByUserId(targetUserId);
    if (!profile || profile.companyId !== companyId) {
      throw new BadRequestException("That teammate is not part of your agency.");
    }
    profile.recruiterRole = dto.recruiterRole as AnnixOrbitRecruiterRole;
    await this.profileRepo.save(profile);
    return { success: true };
  }

  // Hard removal of an active teammate (issue #337): detaches the profile
  // from the agency and clears the recruiter role, so their very next request
  // loses agency access (recruiterRole resolves at guard time). Their user
  // account and any personal data survive - this is an detachment, not a
  // deletion.
  async removeMember(companyId: number, actor: AnnixOrbitTeamActor, targetUserId: number) {
    this.assertCanManage(actor);
    if (targetUserId === actor.id) {
      throw new BadRequestException(
        "You can't remove yourself. Ask another owner or manager to remove you.",
      );
    }
    const profile = await this.profileRepo.findByUserId(targetUserId);
    if (!profile || profile.companyId !== companyId) {
      throw new BadRequestException("That teammate is not part of your agency.");
    }
    if (profile.recruiterRole === "owner") {
      const team = await this.profileRepo.teamMembers(companyId);
      const owners = team.filter((member) => member.recruiterRole === "owner");
      if (owners.length <= 1) {
        throw new BadRequestException(
          "You can't remove the agency's last owner. Promote someone else to owner first.",
        );
      }
    }
    profile.companyId = null;
    profile.recruiterRole = null;
    await this.profileRepo.save(profile);
    return { success: true };
  }

  async cancelInvite(companyId: number, actor: AnnixOrbitTeamActor, inviteId: number) {
    this.assertCanManage(actor);
    const invite = await this.inviteRepo.findByIdForCompany(inviteId, companyId);
    if (!invite) {
      throw new BadRequestException("Invite not found.");
    }
    invite.status = "cancelled";
    await this.inviteRepo.save(invite);
    return { success: true };
  }
}
