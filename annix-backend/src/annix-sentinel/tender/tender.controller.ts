import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelTenderService } from "./tender.service";

@ApiTags("annix-sentinel/tender")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/tender")
export class AnnixSentinelTenderController {
  constructor(private readonly tenderService: AnnixSentinelTenderService) {}

  @Get("checklist")
  async checklist(@Req() req: { user: { companyId: number } }) {
    return this.tenderService.requiredDocuments(req.user.companyId);
  }

  @Get("score")
  async score(@Req() req: { user: { companyId: number } }) {
    return this.tenderService.complianceScore(req.user.companyId);
  }
}
