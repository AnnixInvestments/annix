import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

@Injectable()
export class QcEnabledGuard implements CanActivate {
  constructor(
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenException("Authentication required");
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });

    if (!company?.qcEnabled) {
      throw new ForbiddenException(
        "Quality Control is not enabled for your company. Contact your administrator to enable this add-on.",
      );
    }

    return true;
  }
}
