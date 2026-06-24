import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminInboundEmailService } from "./admin-inbound-email.service";
import { AdminInboundConfigGroupDto, SetInboundEnabledDto } from "./dto/admin-inbound-email.dto";
import { InboundEmailMonitorService } from "./inbound-email-monitor.service";

@ApiTags("Admin Inbound Email")
@Controller("admin/inbound-emails")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class AdminInboundEmailController {
  constructor(
    private readonly adminInboundEmailService: AdminInboundEmailService,
    private readonly inboundEmailMonitor: InboundEmailMonitorService,
  ) {}

  @Post("poll")
  @ApiOperation({ summary: "Trigger an immediate poll of all enabled inbound mailboxes" })
  async pollNow(): Promise<{ message: string }> {
    await this.inboundEmailMonitor.pollAllConfigs();
    return { message: "Inbound mailbox poll triggered" };
  }

  @Get("configs")
  @ApiOperation({ summary: "List inbound email configs grouped by app" })
  @ApiResponse({ status: 200, type: [AdminInboundConfigGroupDto] })
  async listConfigs(): Promise<AdminInboundConfigGroupDto[]> {
    return this.adminInboundEmailService.listGroupedByApp();
  }

  @Patch("configs/:app/enabled")
  @ApiOperation({ summary: "Enable or disable an inbound email config" })
  async setEnabled(
    @Param("app") app: string,
    @Body() dto: SetInboundEnabledDto,
  ): Promise<{ message: string }> {
    return this.adminInboundEmailService.setEnabled(app, dto.companyId, dto.enabled);
  }
}
