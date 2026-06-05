import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CompanyRepository } from "../../platform/company.repository";
import { AppRepository, UserAppAccessRepository } from "../../rbac/rbac.repository";
import type { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { AnnixOrbitAuthService } from "./auth.service";

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

  async resendInvite(userId: number): Promise<void> {
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
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
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

    if (changes.tier !== undefined) {
      const profile = await this.profileRepo.findByUserId(userId);
      if (profile) {
        const trimmed = changes.tier ? changes.tier.trim() : "";
        profile.selectedTier = trimmed.length > 0 ? trimmed : null;
        await this.profileRepo.save(profile);
      }
    }
  }

  async deactivate(userId: number): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.status = "deactivated";
    await this.userRepo.save(user);
    this.logger.log(`Orbit user ${userId} deactivated`);
  }

  async reactivate(userId: number): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.status = "active";
    await this.userRepo.save(user);
    this.logger.log(`Orbit user ${userId} reactivated`);
  }

  async remove(userId: number): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const profile = await this.profileRepo.findByUserId(userId);

    if (profile?.userType === AnnixOrbitUserType.INDIVIDUAL) {
      const candidates = await this.candidateRepo.findByEmail(user.email);
      const candidateIds = candidates.map((candidate) => candidate.id);
      if (candidateIds.length > 0) {
        await this.matchRepo.deleteForCandidates(candidateIds);
        await Promise.all(candidates.map((candidate) => this.candidateRepo.remove(candidate)));
      }
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
    this.logger.log(`Orbit user ${userId} permanently deleted`);
  }
}
