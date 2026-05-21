import { Body, Controller, Get, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { InboundEmailMonitorService } from "../../inbound-email/inbound-email-monitor.service";
import { UpdateCompanyDto, UpdateImapSettingsDto } from "../dto/settings.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { SettingsService } from "../services/settings.service";

const CV_APP_NAME = "annix-orbit";

@Controller("annix-orbit/settings")
@UseGuards(AnnixOrbitAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly inboundEmailMonitorService: InboundEmailMonitorService,
  ) {}

  @Get()
  async settings(@Request() req: { user: { companyId: number } }) {
    return this.settingsService.companySettings(req.user.companyId);
  }

  @Patch("company")
  async updateCompany(
    @Request() req: { user: { companyId: number } },
    @Body() dto: UpdateCompanyDto,
  ) {
    await this.settingsService.updateCompany(req.user.companyId, dto);
    return { message: "Company settings updated" };
  }

  @Patch("imap")
  async updateImap(
    @Request() req: { user: { companyId: number } },
    @Body() dto: UpdateImapSettingsDto,
  ) {
    return this.settingsService.updateImapSettings(req.user.companyId, dto);
  }

  @Post("test-imap")
  async testImap(@Request() req: { user: { companyId: number } }) {
    return this.inboundEmailMonitorService.testConnection(CV_APP_NAME, req.user.companyId);
  }
}
