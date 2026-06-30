import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { now } from "../../lib/datetime";
import { UserAppAccessRepository } from "../../rbac/rbac.repository";
import { UserRepository } from "../../user/user.repository";
import { resolveAnnixOrbitJwtSecret } from "../annix-orbit.constants";
import { type AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";

const LAST_ACTIVE_THROTTLE_MS = 60_000;

@Injectable()
export class AnnixOrbitAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepo: UserRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly profileRepo: AnnixOrbitProfileRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    const secret = resolveAnnixOrbitJwtSecret(this.configService);

    try {
      const payload = this.jwtService.verify(token, { secret });

      if (payload.type !== "annix-orbit") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.userRepo.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const userType = payload.userType ?? "company";
      const isSeekerSession = userType === "individual" || userType === "student";
      const profile = isSeekerSession ? null : await this.profileRepo.findByUserId(user.id);
      const role =
        userType === "individual"
          ? AnnixOrbitRole.INDIVIDUAL
          : userType === "student"
            ? AnnixOrbitRole.STUDENT
            : await this.resolveRole(user.id, payload.role, profile);

      // recruiterRole is resolved against the profile at guard time, not from
      // the JWT claim, so an owner's role change takes effect on the
      // teammate's NEXT REQUEST instead of their next login (issue #337).
      let recruiterRole = payload.recruiterRole ?? null;
      if (!isSeekerSession) {
        recruiterRole = profile?.recruiterRole ?? null;
      }

      request.user = {
        id: user.id,
        email: user.email,
        name: payload.name,
        role,
        userType,
        companyId: payload.companyId ?? null,
        recruiterRole,
      };

      if (userType === "individual" && user.email) {
        this.touchLastActive(user.email);
      }

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private touchLastActive(email: string): void {
    const current = now();
    const staleBefore = current.minus({ milliseconds: LAST_ACTIVE_THROTTLE_MS }).toJSDate();
    const dayKey = current.toFormat("yyyy-LL-dd");
    this.candidateRepo
      .touchLastActiveByEmail(email, current.toJSDate(), staleBefore, dayKey)
      .catch(() => {});
  }

  private async resolveRole(
    userId: number,
    fallbackRole: string,
    profile: AnnixOrbitProfile | null,
  ): Promise<string> {
    const access = await this.userAppAccessRepo.findByUserAndAppCodeWithRole(userId, "annix-orbit");

    if (access?.role) {
      const roleMap: Record<string, string> = {
        viewer: AnnixOrbitRole.VIEWER,
        editor: AnnixOrbitRole.RECRUITER,
        administrator: AnnixOrbitRole.ADMIN,
        individual: AnnixOrbitRole.INDIVIDUAL,
        student: AnnixOrbitRole.STUDENT,
      };
      const mapped = roleMap[access.role.code] || fallbackRole;
      return this.upgradeEmployerOwnerRole(userId, mapped, profile);
    }

    return this.upgradeEmployerOwnerRole(userId, fallbackRole || AnnixOrbitRole.VIEWER, profile);
  }

  private async upgradeEmployerOwnerRole(
    userId: number,
    role: string,
    profile: AnnixOrbitProfile | null,
  ): Promise<string> {
    if (
      role === AnnixOrbitRole.ADMIN ||
      role === AnnixOrbitRole.RECRUITER ||
      role === AnnixOrbitRole.INDIVIDUAL ||
      role === AnnixOrbitRole.STUDENT
    ) {
      return role;
    }

    if (profile?.userType === AnnixOrbitUserType.RECRUITER && profile.recruiterRole === "owner") {
      return AnnixOrbitRole.ADMIN;
    }

    if (profile?.userType !== AnnixOrbitUserType.COMPANY || !profile.companyId) {
      return role;
    }

    const members = await this.profileRepo.teamMembers(profile.companyId);
    const owner = members.reduce<AnnixOrbitProfile | null>((current, member) => {
      if (!current) return member;
      return member.id < current.id ? member : current;
    }, null);
    return owner?.userId === userId ? AnnixOrbitRole.ADMIN : role;
  }
}
