import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { JobCardDocumentType } from "../entities/job-card-document.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { DispatchService } from "../services/dispatch.service";
import { JobCardPdfService } from "../services/job-card-pdf.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { WorkflowNotificationService } from "../services/workflow-notification.service";

@ApiTags("Stock Control - Workflow")
@Controller("stock-control/workflow")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(
    private readonly workflowService: JobCardWorkflowService,
    private readonly dispatchService: DispatchService,
    private readonly notificationService: WorkflowNotificationService,
    private readonly pdfService: JobCardPdfService,
  ) {}

  @Post("job-cards/:id/documents")
  @StockControlRoles("accounts", "admin")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a document to a job card" })
  async uploadDocument(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body("documentType") documentType: string,
  ) {
    const docType = (documentType as JobCardDocumentType) || JobCardDocumentType.SCANNED_FORM;
    return this.workflowService.uploadDocument(req.user.companyId, id, req.user, file, docType);
  }

  @Get("job-cards/:id/documents")
  @ApiOperation({ summary: "List documents for a job card" })
  async listDocuments(@Req() req: any, @Param("id") id: number) {
    return this.workflowService.documents(req.user.companyId, id);
  }

  @Get("job-cards/:id/status")
  @ApiOperation({ summary: "Current workflow status" })
  async workflowStatus(@Req() req: any, @Param("id") id: number) {
    return this.workflowService.workflowStatus(req.user.companyId, id);
  }

  @Get("job-cards/:id/history")
  @ApiOperation({ summary: "Approval history for a job card" })
  async approvalHistory(@Req() req: any, @Param("id") id: number) {
    return this.workflowService.approvalHistory(req.user.companyId, id);
  }

  @Post("job-cards/:id/approve")
  @StockControlRoles("admin", "manager", "storeman")
  @ApiOperation({ summary: "Approve current workflow step" })
  async approve(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { signatureDataUrl?: string; comments?: string },
  ) {
    return this.workflowService.approveStep(req.user.companyId, id, req.user, body);
  }

  @Post("job-cards/:id/reject")
  @StockControlRoles("admin", "manager")
  @ApiOperation({ summary: "Reject current workflow step" })
  async reject(@Req() req: any, @Param("id") id: number, @Body() body: { reason: string }) {
    return this.workflowService.rejectStep(req.user.companyId, id, req.user, body.reason);
  }

  @Get("pending")
  @ApiOperation({ summary: "Pending approvals for current user" })
  async pendingApprovals(@Req() req: any) {
    return this.workflowService.pendingApprovalsForUser(req.user);
  }

  @Get("job-cards/:id/can-approve")
  @ApiOperation({ summary: "Check if current user can approve" })
  async canApprove(@Req() req: any, @Param("id") id: number) {
    const canApprove = await this.workflowService.canUserApprove(req.user, id);
    return { canApprove };
  }

  @Get("notifications")
  @ApiOperation({ summary: "All notifications for current user" })
  async notifications(@Req() req: any, @Query("limit") limit?: number) {
    return this.notificationService.allNotifications(req.user.id, limit || 50);
  }

  @Get("notifications/unread")
  @ApiOperation({ summary: "Unread notifications for current user" })
  async unreadNotifications(@Req() req: any) {
    return this.notificationService.unreadNotifications(req.user.id);
  }

  @Get("notifications/count")
  @ApiOperation({ summary: "Count of unread notifications" })
  async notificationCount(@Req() req: any) {
    const count = await this.notificationService.unreadCount(req.user.id);
    return { count };
  }

  @Put("notifications/:id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  async markAsRead(@Req() req: any, @Param("id") id: number) {
    await this.notificationService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Put("notifications/read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@Req() req: any) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Get("job-cards/:id/dispatch/start")
  @StockControlRoles("storeman", "admin", "manager")
  @ApiOperation({ summary: "Start dispatch session for a job card" })
  async startDispatch(@Req() req: any, @Param("id") id: number) {
    return this.dispatchService.startDispatchSession(req.user.companyId, id);
  }

  @Get("job-cards/:id/dispatch/progress")
  @ApiOperation({ summary: "Dispatch progress for a job card" })
  async dispatchProgress(@Req() req: any, @Param("id") id: number) {
    return this.dispatchService.dispatchProgress(req.user.companyId, id);
  }

  @Get("job-cards/:id/dispatch/history")
  @ApiOperation({ summary: "Dispatch history for a job card" })
  async dispatchHistory(@Req() req: any, @Param("id") id: number) {
    return this.dispatchService.dispatchHistory(req.user.companyId, id);
  }

  @Post("job-cards/:id/dispatch/scan")
  @StockControlRoles("storeman", "admin")
  @ApiOperation({ summary: "Scan an item for dispatch" })
  async scanItem(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { stockItemId: number; quantity: number; notes?: string },
  ) {
    return this.dispatchService.scanItem(
      req.user.companyId,
      id,
      body.stockItemId,
      body.quantity,
      req.user,
      body.notes,
    );
  }

  @Post("job-cards/:id/dispatch/complete")
  @StockControlRoles("storeman", "admin")
  @ApiOperation({ summary: "Complete dispatch for a job card" })
  async completeDispatch(@Req() req: any, @Param("id") id: number) {
    return this.dispatchService.completeDispatch(req.user.companyId, id, req.user);
  }

  @Post("dispatch/scan-qr")
  @StockControlRoles("storeman", "admin")
  @ApiOperation({ summary: "Identify item by QR code" })
  async scanQr(@Req() req: any, @Body() body: { qrToken: string }) {
    return this.dispatchService.scanByQrToken(req.user.companyId, body.qrToken);
  }

  @Get("job-cards/:id/print")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Download signed job card PDF" })
  async printJobCard(@Req() req: any, @Param("id") id: number, @Res() res: Response) {
    const { buffer, filename } = await this.pdfService.generatePrintableJobCard(
      req.user.companyId,
      id,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
