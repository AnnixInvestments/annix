import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AnnixSentinelComplianceService } from "../compliance/compliance.service";
import { AnnixSentinelDocumentsService } from "../sentinel-documents/documents.service";
import { AnnixSentinelApiKeyGuard } from "./guards/api-key.guard";

@ApiTags("annix-sentinel/api/v1")
@UseGuards(AnnixSentinelApiKeyGuard)
@Controller("annix-sentinel/api/v1")
export class AnnixSentinelEnterpriseApiController {
  constructor(
    private readonly complianceService: AnnixSentinelComplianceService,
    private readonly documentsService: AnnixSentinelDocumentsService,
  ) {}

  @Get("dashboard")
  async dashboard(@Req() req: { company: { id: number } }) {
    return this.complianceService.companyDashboard(req.company.id);
  }

  @Get("requirements")
  async requirements() {
    return this.complianceService.allRequirements();
  }

  @Get("documents")
  async documents(@Req() req: { company: { id: number } }) {
    return this.documentsService.documentsForCompany(req.company.id);
  }
}
