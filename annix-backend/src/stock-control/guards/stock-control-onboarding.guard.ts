import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../../platform/entities/company.entity";

export const SKIP_ONBOARDING_CHECK = "skipOnboardingCheck";
export const SkipOnboardingCheck = () => SetMetadata(SKIP_ONBOARDING_CHECK, true);

@Injectable()
export class StockControlOnboardingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ONBOARDING_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const method = (request.method || "").toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

    const companyId = request.user?.companyId;
    if (!companyId) return true;

    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      select: { id: true, onboardingComplete: true },
    });
    if (company?.onboardingComplete === false) {
      throw new ForbiddenException({
        code: "ONBOARDING_REQUIRED",
        message:
          "Company onboarding is incomplete. Submit the onboarding form before performing this action.",
      });
    }
    return true;
  }
}
