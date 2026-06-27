import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { CompanyRepository } from "../../platform/company.repository";
import { AppRepository, UserAppAccessRepository } from "../../rbac/rbac.repository";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import type { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { OrbitIdentityWriter } from "../identity/orbit-identity-writer";
import { moduleForScope } from "../identity/orbit-module";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { AnnixOrbitAuthService } from "./auth.service";

export interface OrbitAdminActor {
  id: number;
  email: string;
}

export interface OrbitAdminUserRow {
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  emailVerified: boolean;
  userType: AnnixOrbitUserType;
  tier: string | null;
  companyId: number | null;
  companyName: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface OrbitAdminUserListResult {
  rows: OrbitAdminUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface OrbitSeekerProspect {
  userId: number;
  email: string;
  name: string | null;
  hasLoggedIn: boolean;
  lastLoginAt: string | null;
  invitedAt: string | null;
  hasCandidate: boolean;
  hasCv: boolean;
  // True when the user has a registered individual/student profile (they
  // completed sign-up), independent of whether they've logged in since.
  // Drives the "registered" vs "invited" status badge on the admin pages.
  isRegistered: boolean;
  whatsappOptIn: boolean;
  whatsappConsentRequestedAt: string | null;
  whatsappPhone: string | null;
  contactPhone: string | null;
}

function parseUserType(value?: string | null): AnnixOrbitUserType | null {
  if (value === AnnixOrbitUserType.COMPANY) return AnnixOrbitUserType.COMPANY;
  if (value === AnnixOrbitUserType.RECRUITER) return AnnixOrbitUserType.RECRUITER;
  if (value === AnnixOrbitUserType.INDIVIDUAL) return AnnixOrbitUserType.INDIVIDUAL;
  if (value === AnnixOrbitUserType.STUDENT) return AnnixOrbitUserType.STUDENT;
  return null;
}

@Injectable()
export class AdminOrbitUserService {
  private readonly logger = new Logger(AdminOrbitUserService.name);

  constructor(
    private readonly authService: AnnixOrbitAuthService,
    private readonly userRepo: UserRepository,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly companyRepo: CompanyRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly matchRepo: CandidateJobMatchRepository,
    private readonly appRepo: AppRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly auditService: AuditService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly identityWriter: OrbitIdentityWriter,
  ) {}

  async list(params: {
    userType?: string | null;
    search?: string | null;
    page?: number;
    limit?: number;
  }): Promise<OrbitAdminUserListResult> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const userType = parseUserType(params.userType);
    const search = params.search ? params.search.trim() : "";

    if (search.length > 0) {
      const matchedUsers = await this.userRepo.searchByEmailOrName(search, 100);
      const orbitUsers = matchedUsers.filter((user) => {
        const scope = user.appScope ?? "";
        return scope.startsWith("orbit:");
      });
      const profiles = await this.profileRepo.findByUserIds(orbitUsers.map((user) => user.id));
      const allRows = await this.assembleRows(profiles, orbitUsers);
      const filtered = userType ? allRows.filter((row) => row.userType === userType) : allRows;
      const total = filtered.length;
      const start = (page - 1) * limit;
      return { rows: filtered.slice(start, start + limit), total, page, limit };
    }

    const total = await this.profileRepo.adminCount(userType);
    const profiles = await this.profileRepo.adminPage({
      userType,
      skip: (page - 1) * limit,
      take: limit,
    });
    const users = await this.userRepo.findByIds(profiles.map((profile) => profile.userId));
    const rows = await this.assembleRows(profiles, users);
    return { rows, total, page, limit };
  }

  async seekerProspects(): Promise<OrbitSeekerProspect[]> {
    // Two sources, unioned: users granted annix-orbit app-access (admin-invited
    // prospects who may not have registered yet) AND everyone with a registered
    // individual/student profile (self-registered seekers via the early-access
    // link — these have a profile but no app-access row, so they were invisible
    // here before). Surfacing both keeps every seeker trackable in one place.
    const app = await this.appRepo.findByCode("annix-orbit");
    const accesses = app ? await this.userAppAccessRepo.findManyByAppId(app.id) : [];
    const seekerProfiles = await this.profileRepo.findIndividualSeekers();
    const userIds = [
      ...new Set([
        ...accesses.map((access) => access.userId),
        ...seekerProfiles.map((profile) => profile.userId),
      ]),
    ];
    if (userIds.length === 0) return [];
    const users = await this.userRepo.findByIds(userIds);
    const profiles = await this.profileRepo.findByUserIds(userIds);
    const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
    const seekerUsers = users.filter((user) => {
      if (!user.email) return false;
      const profile = profileByUser.get(user.id);
      if (!profile) return true;
      return (
        profile.userType === AnnixOrbitUserType.INDIVIDUAL ||
        profile.userType === AnnixOrbitUserType.STUDENT
      );
    });
    return Promise.all(
      seekerUsers.map(async (user) => {
        const candidates = await this.candidateRepo.findByEmail(user.email);
        const profile = profileByUser.get(user.id);
        const nameParts = [user.firstName, user.lastName].filter(
          (part): part is string => Boolean(part) && String(part).trim().length > 0,
        );
        const name = nameParts.join(" ");
        return {
          userId: user.id,
          email: user.email,
          name: name.length > 0 ? name : null,
          hasLoggedIn: user.lastLoginAt != null,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          invitedAt: user.createdAt ? user.createdAt.toISOString() : null,
          hasCandidate: candidates.length > 0,
          hasCv: profile ? profile.cvFilePath != null : false,
          isRegistered:
            profile != null &&
            (profile.userType === AnnixOrbitUserType.INDIVIDUAL ||
              profile.userType === AnnixOrbitUserType.STUDENT),
          whatsappOptIn: user.whatsappOptIn === true,
          whatsappConsentRequestedAt: user.whatsappConsentRequestedAt
            ? user.whatsappConsentRequestedAt.toISOString()
            : null,
          whatsappPhone: user.whatsappPhone ?? null,
          contactPhone: profile?.phone ?? null,
        };
      }),
    );
  }

  private async assembleRows(
    profiles: AnnixOrbitProfile[],
    users: User[],
  ): Promise<OrbitAdminUserRow[]> {
    const usersById = new Map(users.map((user) => [user.id, user] as const));
    const companyIds = [
      ...new Set(
        profiles.map((profile) => profile.companyId).filter((id): id is number => id != null),
      ),
    ];
    const companies = companyIds.length > 0 ? await this.companyRepo.findByIds(companyIds) : [];
    const companyNameById = new Map(
      companies.map((company) => [company.id, company.name] as const),
    );

    return profiles
      .filter((profile) => usersById.has(profile.userId))
      .map((profile) => {
        const user = usersById.get(profile.userId) as User;
        const companyName = profile.companyId
          ? (companyNameById.get(profile.companyId) ?? null)
          : null;
        return {
          userId: user.id,
          email: user.email,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          status: user.status,
          emailVerified: user.emailVerified,
          userType: profile.userType,
          tier: profile.selectedTier,
          companyId: profile.companyId,
          companyName,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          createdAt: user.createdAt ? user.createdAt.toISOString() : null,
        };
      });
  }

  async invite(input: {
    email: string;
    firstName: string;
    lastName?: string | null;
    userType: string;
    companyName?: string | null;
    tier?: string | null;
  }): Promise<{ userId: number; email: string }> {
    const userType = parseUserType(input.userType);
    if (!userType) {
      throw new NotFoundException(`Unknown user type '${input.userType}'`);
    }
    return this.authService.adminInviteUser({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      userType,
      companyName: input.companyName ?? null,
      tier: input.tier ?? null,
    });
  }

  async provision(input: {
    email: string;
    firstName: string;
    lastName?: string | null;
    userType: string;
    tier?: string | null;
  }): Promise<{ userId: number; email: string; inviteToken: string }> {
    const userType = parseUserType(input.userType);
    if (!userType) {
      throw new NotFoundException(`Unknown user type '${input.userType}'`);
    }
    const provisioned = await this.authService.provisionInvitedUser({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      userType,
      companyName: null,
      tier: input.tier ?? null,
    });
    return {
      userId: provisioned.userId,
      email: provisioned.email,
      inviteToken: provisioned.inviteToken,
    };
  }

  async resendInvite(userId: number): Promise<void> {
    const user = await this.userRepo.findOrbitUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return this.authService.adminResendInvite(userId);
  }

  async update(
    userId: number,
    changes: {
      firstName?: string | null;
      lastName?: string | null;
      status?: string | null;
      tier?: string | null;
    },
    actor: OrbitAdminActor,
  ): Promise<void> {
    const user = await this.userRepo.findOrbitUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (changes.firstName !== undefined) {
      const trimmed = changes.firstName ? changes.firstName.trim() : "";
      user.firstName = trimmed.length > 0 ? trimmed : undefined;
    }
    if (changes.lastName !== undefined) {
      const trimmed = changes.lastName ? changes.lastName.trim() : "";
      user.lastName = trimmed.length > 0 ? trimmed : undefined;
    }
    if (changes.status) {
      user.status = changes.status;
    }
    await this.userRepo.save(user);

    const updateModule = moduleForScope(user.appScope);
    if (updateModule) {
      await this.identityWriter.applyProfileChanges(userId, updateModule, {
        firstName: changes.firstName !== undefined ? (user.firstName ?? null) : undefined,
        lastName: changes.lastName !== undefined ? (user.lastName ?? null) : undefined,
        status: changes.status ? changes.status : undefined,
      });
    }

    if (changes.tier !== undefined) {
      const profile = await this.profileRepo.findByUserId(userId);
      if (profile) {
        const trimmed = changes.tier ? changes.tier.trim() : "";
        profile.selectedTier = trimmed.length > 0 ? trimmed : null;
        await this.profileRepo.save(profile);
      }
    }

    await this.recordAudit(actor, userId, AuditAction.USER_UPDATED, {
      changed: Object.keys(changes).filter(
        (key) => changes[key as keyof typeof changes] !== undefined,
      ),
    });
  }

  async deactivate(userId: number, actor: OrbitAdminActor): Promise<void> {
    const user = await this.userRepo.findOrbitUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.status = "deactivated";
    await this.userRepo.save(user);
    const deactivateModule = moduleForScope(user.appScope);
    if (deactivateModule) {
      await this.identityWriter.setStatus(userId, deactivateModule, "deactivated");
    }
    await this.recordAudit(actor, userId, AuditAction.USER_DEACTIVATED, {});
    this.logger.log(`Orbit user ${userId} deactivated`);
  }

  async reactivate(userId: number, actor: OrbitAdminActor): Promise<void> {
    const user = await this.userRepo.findOrbitUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.status = "active";
    await this.userRepo.save(user);
    const reactivateModule = moduleForScope(user.appScope);
    if (reactivateModule) {
      await this.identityWriter.setStatus(userId, reactivateModule, "active");
    }
    await this.recordAudit(actor, userId, AuditAction.USER_REACTIVATED, {});
    this.logger.log(`Orbit user ${userId} reactivated`);
  }

  async remove(userId: number, actor: OrbitAdminActor): Promise<void> {
    const user = await this.userRepo.findOrbitUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const profile = await this.profileRepo.findByUserId(userId);

    const candidates = await this.candidateRepo.findByEmail(user.email);
    const candidateIds = candidates.map((candidate) => candidate.id);
    if (candidateIds.length > 0) {
      await this.matchRepo.deleteForCandidates(candidateIds);
      await Promise.all(candidates.map((candidate) => this.candidateRepo.remove(candidate)));
    }

    if (profile) {
      await this.eraseProfileFiles(profile);
    }

    const app = await this.appRepo.findByCode("annix-orbit");
    if (app) {
      const access = await this.userAppAccessRepo.findOneWhere({ userId, appId: app.id });
      if (access) {
        await this.userAppAccessRepo.remove(access);
      }
    }

    if (profile) {
      await this.profileRepo.remove(profile);
    }
    await this.userRepo.deleteById(userId);
    const removeModule = moduleForScope(user.appScope);
    if (removeModule) {
      await this.identityWriter.deleteIdentity(userId, removeModule);
    }
    await this.recordAudit(actor, userId, AuditAction.DELETE, {
      email: user.email,
      erasedCandidates: candidateIds.length,
    });
    this.logger.log(`Orbit user ${userId} permanently deleted`);
  }

  private async eraseProfileFiles(profile: AnnixOrbitProfile): Promise<void> {
    const paths = [
      profile.cvFilePath,
      profile.photoFilePath,
      profile.identityVerification?.documentFilePath ?? null,
    ].filter((path): path is string => path != null && path.length > 0);

    await Promise.all(
      paths.map(async (path) => {
        try {
          await this.storageService.delete(path);
        } catch (error) {
          this.logger.warn(`Failed to erase profile file ${path} from storage: ${error}`);
        }
      }),
    );
  }

  private async recordAudit(
    actor: OrbitAdminActor,
    targetUserId: number,
    action: AuditAction,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService.log({
        entityType: "annix-orbit-user",
        entityId: targetUserId,
        action,
        userId: actor.id,
        metadata: {
          actorId: actor.id,
          actorEmail: actor.email,
          targetUserId,
          ...metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit log for orbit user ${targetUserId}: ${error}`);
    }
  }
}
