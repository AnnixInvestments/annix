import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaIntegrationsService } from "./integrations.service";

@ApiTags("comply-sa/integrations")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/integrations")
export class ComplySaIntegrationsController {
  constructor(private readonly integrationsService: ComplySaIntegrationsService) {}

  @Get()
  available() {
    return this.integrationsService.availableIntegrations();
  }

  @Get(":id/status")
  status(@Req() req: { user: { companyId: number } }, @Param("id") id: string) {
    return this.integrationsService.connectionStatus(req.user.companyId, id);
  }
}
