import { Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaIntegrationsService } from "./integrations.service";
import { SageService } from "./sage/sage.service";

@ApiTags("comply-sa/integrations")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/integrations")
export class ComplySaIntegrationsController {
  constructor(
    private readonly integrationsService: ComplySaIntegrationsService,
    private readonly sageService: SageService,
  ) {}

  @Get()
  available() {
    return this.integrationsService.availableIntegrations();
  }

  @Get(":id/status")
  status(@Req() req: { user: { companyId: number } }, @Param("id") id: string) {
    return this.integrationsService.connectionStatus(req.user.companyId, id);
  }

  @Post("sage/connect")
  sageConnect(@Req() req: { user: { companyId: number } }) {
    const authUrl = this.sageService.authorizationUrl(req.user.companyId);
    return { authUrl };
  }

  @Get("sage/callback")
  sageCallback(@Query("code") code: string, @Query("state") state: string) {
    const companyId = Number.parseInt(state, 10);
    return this.sageService.handleCallback(companyId, code);
  }

  @Post("sage/sync")
  sageSync(@Req() req: { user: { companyId: number } }) {
    return this.sageService.fullSync(req.user.companyId);
  }

  @Post("sage/rotate-keys")
  rotateKeys() {
    return this.sageService.rotateEncryptionKeys();
  }

  @Delete("sage/disconnect")
  sageDisconnect(@Req() req: { user: { companyId: number } }) {
    return this.sageService.disconnect(req.user.companyId);
  }
}
