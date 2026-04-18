import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaProfile } from "../../companies/entities/comply-sa-profile.entity";

@Injectable()
export class ComplySaCompanyScopeGuard implements CanActivate {
  private readonly logger = new Logger(ComplySaCompanyScopeGuard.name);

  constructor(
    @InjectRepository(ComplySaProfile)
    private readonly profileRepository: Repository<ComplySaProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user;

    if (jwtPayload == null || jwtPayload.userId == null || jwtPayload.companyId == null) {
      throw new ForbiddenException("Authentication required");
    }

    const profile = await this.profileRepository.findOne({
      where: { userId: jwtPayload.userId },
    });

    if (profile === null) {
      throw new ForbiddenException("User not found");
    }

    if (profile.companyId !== jwtPayload.companyId) {
      this.logger.warn(
        `Company scope mismatch: user ${jwtPayload.userId} belongs to company ${profile.companyId} but JWT claims ${jwtPayload.companyId}`,
      );
      throw new ForbiddenException("You do not have access to this company");
    }

    return true;
  }
}
