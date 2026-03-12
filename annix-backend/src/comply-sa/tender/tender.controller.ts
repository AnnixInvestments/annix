import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaTenderService } from "./tender.service";

@ApiTags("comply-sa/tender")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/tender")
export class ComplySaTenderController {
  constructor(private readonly tenderService: ComplySaTenderService) {}

  @Get("checklist")
  async checklist(@Req() req: { user: { companyId: number } }) {
    return this.tenderService.requiredDocuments(req.user.companyId);
  }

  @Get("score")
  async score(@Req() req: { user: { companyId: number } }) {
    return this.tenderService.complianceScore(req.user.companyId);
  }
}
