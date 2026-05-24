import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelTemplatesService } from "./templates.service";

@ApiTags("annix-sentinel/templates")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/templates")
export class AnnixSentinelTemplatesController {
  constructor(private readonly templatesService: AnnixSentinelTemplatesService) {}

  @Get()
  available() {
    return this.templatesService.availableTemplates();
  }

  @Post("generate")
  generate(@Body() body: { templateId: string; data: Record<string, string> }) {
    return this.templatesService.generateTemplate(body.templateId, body.data);
  }

  @Get("health-report")
  async healthReport(@Req() req: { user: { companyId: number } }) {
    return this.templatesService.generateHealthReport(req.user.companyId);
  }
}
