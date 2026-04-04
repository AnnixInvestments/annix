import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { DataBookPdfService } from "../../services/data-book-pdf.service";
import { QcpApprovalService } from "../services/qcp-approval.service";

@ApiTags("Stock Control - QCP Public Review")
@Controller("stock-control/public/qcp-review")
export class QcpPublicController {
  constructor(
    private readonly approvalService: QcpApprovalService,
    private readonly dataBookPdfService: DataBookPdfService,
  ) {}

  @Get(":token")
  @ApiOperation({ summary: "Public QCP review details (no auth)" })
  async reviewDetails(@Param("token") token: string) {
    return this.approvalService.tokenDetails(token);
  }

  @Get(":token/pdf")
  @ApiOperation({ summary: "Download QCP PDF via public token (no auth)" })
  async reviewPdf(@Param("token") token: string, @Res() res: Response) {
    const { plan } = await this.approvalService.tokenDetails(token);

    const buffer = await this.dataBookPdfService.generateControlPlanPdf(
      plan.companyId,
      plan.jobCardId,
      plan.id,
    );

    if (!buffer) {
      res.status(404).json({ message: "PDF could not be generated" });
      return;
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="QCP_${plan.qcpNumber || plan.id}.pdf"`,
      "Content-Length": buffer.length.toString(),
    });
    res.end(buffer);
  }

  @Post(":token/submit")
  @ApiOperation({ summary: "Submit QCP review (approve or request changes)" })
  async submitReview(
    @Param("token") token: string,
    @Body()
    body: {
      action: "approve" | "request_changes";
      activities?: any[];
      lineRemarks?: Array<{ operationNumber: number; remark: string }>;
      overallComments?: string;
      signatureName?: string;
      signatureUrl?: string;
    },
  ) {
    return this.approvalService.submitReview(token, body);
  }

  @Post(":token/save-preferences")
  @ApiOperation({ summary: "Save intervention preferences for future QCPs" })
  async savePreferences(
    @Param("token") token: string,
    @Body() body: { preferences: Record<number, string> },
  ) {
    return this.approvalService.saveInterventionPreferences(token, body.preferences);
  }

  @Post(":token/forward")
  @ApiOperation({ summary: "Forward QCP to 3rd party reviewer" })
  async forwardToThirdParty(
    @Param("token") token: string,
    @Body() body: { email: string; name?: string },
  ) {
    return this.approvalService.forwardToThirdParty(token, body.email, body.name || null);
  }
}
