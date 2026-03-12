import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ComplySaComplianceService } from "../compliance/compliance.service";
import { ComplySaDocumentsService } from "../comply-documents/documents.service";
import { ComplySaApiKeyGuard } from "./guards/api-key.guard";

@ApiTags("comply-sa/api/v1")
@UseGuards(ComplySaApiKeyGuard)
@Controller("comply-sa/api/v1")
export class ComplySaEnterpriseApiController {
  constructor(
    private readonly complianceService: ComplySaComplianceService,
    private readonly documentsService: ComplySaDocumentsService,
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
