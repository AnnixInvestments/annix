import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { StockControlCompanyRepository } from "../../repositories/stock-control-company.repository";

@Injectable()
export class QcEnabledGuard implements CanActivate {
  constructor(private readonly companyRepo: StockControlCompanyRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenException("Authentication required");
    }

    const company = await this.companyRepo.findById(companyId);

    if (!company?.qcEnabled) {
      throw new ForbiddenException(
        "Quality Control is not enabled for your company. Contact your administrator to enable this add-on.",
      );
    }

    return true;
  }
}
