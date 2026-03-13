import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ComplySaUser } from "../../companies/entities/user.entity";

@Injectable()
export class ComplySaCompanyScopeGuard implements CanActivate {
  private readonly logger = new Logger(ComplySaCompanyScopeGuard.name);

  constructor(
    @InjectRepository(ComplySaUser)
    private readonly userRepository: Repository<ComplySaUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user;

    if (jwtPayload == null || jwtPayload.userId == null || jwtPayload.companyId == null) {
      throw new ForbiddenException("Authentication required");
    }

    const user = await this.userRepository.findOne({
      where: { id: jwtPayload.userId },
    });

    if (user === null) {
      throw new ForbiddenException("User not found");
    }

    if (user.companyId !== jwtPayload.companyId) {
      this.logger.warn(
        `Company scope mismatch: user ${user.id} belongs to company ${user.companyId} but JWT claims ${jwtPayload.companyId}`,
      );
      throw new ForbiddenException("You do not have access to this company");
    }

    return true;
  }
}
