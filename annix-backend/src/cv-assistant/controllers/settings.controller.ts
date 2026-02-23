import { Body, Controller, Get, Patch, Post, Request, UseGuards } from "@nestjs/common";
import { UpdateCompanyDto, UpdateImapSettingsDto } from "../dto/settings.dto";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { EmailMonitorService } from "../services/email-monitor.service";
import { SettingsService } from "../services/settings.service";

@Controller("cv-assistant/settings")
@UseGuards(CvAssistantAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailMonitorService: EmailMonitorService,
  ) {}

  @Get()
  async settings(@Request() req: { user: { companyId: number } }) {
    const company = await this.settingsService.companySettings(req.user.companyId);
    return {
      id: company.id,
      name: company.name,
      imapHost: company.imapHost,
      imapPort: company.imapPort,
      imapUser: company.imapUser,
      imapConfigured: Boolean(company.imapHost && company.imapUser),
      monitoringEnabled: company.monitoringEnabled,
      emailFromAddress: company.emailFromAddress,
    };
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
    await this.settingsService.updateImapSettings(req.user.companyId, dto);
    return { message: "IMAP settings updated" };
  }

  @Post("test-imap")
  async testImap(@Body() dto: { host: string; port: number; user: string; password: string }) {
    const result = await this.emailMonitorService.testImapConnection(
      dto.host,
      dto.port,
      dto.user,
      dto.password,
    );
    return result;
  }
}
