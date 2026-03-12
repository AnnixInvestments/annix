import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaTemplatesService } from "./templates.service";

@ApiTags("comply-sa/templates")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard)
@Controller("comply-sa/templates")
export class ComplySaTemplatesController {
  constructor(private readonly templatesService: ComplySaTemplatesService) {}

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
