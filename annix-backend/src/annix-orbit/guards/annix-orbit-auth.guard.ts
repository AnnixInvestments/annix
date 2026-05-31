import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { now } from "../../lib/datetime";
import { UserAppAccessRepository } from "../../rbac/rbac.repository";
import { UserRepository } from "../../user/user.repository";
import { ANNIX_ORBIT_JWT_SECRET_DEFAULT } from "../annix-orbit.constants";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    const secret = this.configService.get<string>(
      "ANNIX_ORBIT_JWT_SECRET",
      ANNIX_ORBIT_JWT_SECRET_DEFAULT,
    );

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

      request.user = {
        id: user.id,
        email: user.email,
        name: payload.name,
        role,
        userType,
        companyId: payload.companyId ?? null,
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
      };
      return roleMap[access.role.code] || fallbackRole;
    }

    return fallbackRole || AnnixOrbitRole.VIEWER;
  }
}
