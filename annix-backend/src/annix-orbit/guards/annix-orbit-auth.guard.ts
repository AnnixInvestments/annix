import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { now } from "../../lib/datetime";
import { UserAppAccessRepository } from "../../rbac/rbac.repository";
import { UserRepository } from "../../user/user.repository";
import { resolveAnnixOrbitJwtSecret } from "../annix-orbit.constants";
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
      const role =
        userType === "individual"
          ? AnnixOrbitRole.INDIVIDUAL
          : await this.resolveRole(user.id, payload.role);

      // recruiterRole is resolved against the profile at guard time, not from
      // the JWT claim, so an owner's role change takes effect on the
      // teammate's NEXT REQUEST instead of their next login (issue #337).
      let recruiterRole = payload.recruiterRole ?? null;
      if (userType !== "individual") {
        const profile = await this.profileRepo.findByUserId(user.id);
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

  private async resolveRole(userId: number, fallbackRole: string): Promise<string> {
    const access = await this.userAppAccessRepo.findByUserAndAppCodeWithRole(userId, "annix-orbit");

    if (access?.role) {
      const roleMap: Record<string, string> = {
        viewer: AnnixOrbitRole.VIEWER,
        editor: AnnixOrbitRole.RECRUITER,
        administrator: AnnixOrbitRole.ADMIN,
        individual: AnnixOrbitRole.INDIVIDUAL,
        student: AnnixOrbitRole.STUDENT,
      };
      return roleMap[access.role.code] || fallbackRole;
    }

    return fallbackRole || AnnixOrbitRole.VIEWER;
  }
}
