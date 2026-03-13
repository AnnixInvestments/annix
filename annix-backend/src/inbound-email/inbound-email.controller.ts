import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type InboundEmailConfigDto,
  type InboundEmailListFilters,
  InboundEmailService,
} from "./inbound-email.service";
import { InboundEmailMonitorService } from "./inbound-email-monitor.service";

@ApiTags("Inbound Email")
@Controller("inbound-email")
export class InboundEmailController {
  constructor(
    private readonly inboundEmailService: InboundEmailService,
    private readonly monitorService: InboundEmailMonitorService,
  ) {}

  @Get(":app/:companyId/config")
  @ApiOperation({ summary: "Inbound email configuration for app/company" })
  async emailConfig(@Param("app") app: string, @Param("companyId") companyId: string) {
    return this.inboundEmailService.emailConfig(app, parseInt(companyId, 10));
  }

  @Patch(":app/:companyId/config")
  @ApiOperation({ summary: "Update inbound email configuration" })
  async updateEmailConfig(
    @Param("app") app: string,
    @Param("companyId") companyId: string,
    @Body() dto: InboundEmailConfigDto,
  ) {
    return this.inboundEmailService.updateEmailConfig(app, parseInt(companyId, 10), dto);
  }

  @Post(":app/:companyId/test-connection")
  @ApiOperation({ summary: "Test IMAP connection" })
  async testConnection(@Param("app") app: string, @Param("companyId") companyId: string) {
    return this.monitorService.testConnection(app, parseInt(companyId, 10));
  }

  @Get(":app/:companyId/emails")
  @ApiOperation({ summary: "List inbound emails for app/company" })
  async listEmails(
    @Param("app") app: string,
    @Param("companyId") companyId: string,
    @Query() filters: InboundEmailListFilters,
  ) {
    return this.inboundEmailService.listEmails(app, parseInt(companyId, 10), filters);
  }

  @Get(":app/:companyId/emails/:emailId")
  @ApiOperation({ summary: "Inbound email detail" })
  async emailDetail(
    @Param("app") app: string,
    @Param("companyId") companyId: string,
    @Param("emailId") emailId: string,
  ) {
    return this.inboundEmailService.emailDetail(
      app,
      parseInt(companyId, 10),
      parseInt(emailId, 10),
    );
  }

  @Patch("attachments/:attachmentId/reclassify")
  @ApiOperation({ summary: "Manually reclassify attachment" })
  async reclassifyAttachment(
    @Param("attachmentId") attachmentId: string,
    @Body() body: { documentType: string },
  ) {
    return this.inboundEmailService.reclassifyAttachment(
      parseInt(attachmentId, 10),
      body.documentType,
    );
  }

  @Get(":app/:companyId/stats")
  @ApiOperation({ summary: "Inbound email statistics" })
  async emailStats(@Param("app") app: string, @Param("companyId") companyId: string) {
    return this.inboundEmailService.emailStats(app, parseInt(companyId, 10));
  }
}
