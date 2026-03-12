import {
  Body,
  Controller,
  Delete,
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
import { WorkflowStep } from "../entities/job-card-approval.entity";
import { JobCardDocumentType } from "../entities/job-card-document.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import {
  AddStepConfigDto,
  ApproveWorkflowStepDto,
  CompleteBackgroundStepDto,
  PushSubscribeDto,
  PushUnsubscribeDto,
  RejectWorkflowStepDto,
  ReorderStepConfigsDto,
  ScanDispatchItemDto,
  ScanQrDto,
  ToggleStepBackgroundDto,
  UpdateNotificationRecipientsDto,
  UpdateStepAssignmentsDto,
  UpdateStepLabelDto,
  UpdateUserLocationsDto,
} from "../dto/workflow.dto";
import { BackgroundStepService } from "../services/background-step.service";
import { DispatchService } from "../services/dispatch.service";
import { JobCardPdfService } from "../services/job-card-pdf.service";
import { JobCardWorkflowService } from "../services/job-card-workflow.service";
import { WebPushService } from "../services/web-push.service";
import { WorkflowAssignmentService } from "../services/workflow-assignment.service";
import { WorkflowNotificationService } from "../services/workflow-notification.service";
import { WorkflowStepConfigService } from "../services/workflow-step-config.service";

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
    private readonly assignmentService: WorkflowAssignmentService,
    private readonly webPushService: WebPushService,
    private readonly stepConfigService: WorkflowStepConfigService,
    private readonly backgroundStepService: BackgroundStepService,
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
    @Body() dto: ApproveWorkflowStepDto,
  ) {
    return this.workflowService.approveStep(req.user.companyId, id, req.user, dto);
  }

  @Post("job-cards/:id/reject")
  @StockControlRoles("admin", "manager")
  @ApiOperation({ summary: "Reject current workflow step" })
  async reject(@Req() req: any, @Param("id") id: number, @Body() dto: RejectWorkflowStepDto) {
    return this.workflowService.rejectStep(req.user.companyId, id, req.user, dto.reason);
  }

  @Get("pending")
  @ApiOperation({ summary: "Pending approvals for current user" })
  async pendingApprovals(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    return this.workflowService.pendingApprovalsForUser(req.user, pageNum, limitNum);
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

  @Get("assignments")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Get all workflow step assignments for company" })
  async allAssignments(@Req() req: any) {
    return this.assignmentService.allAssignments(req.user.companyId);
  }

  @Get("assignments/:step/eligible-users")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Get users eligible for a workflow step" })
  async eligibleUsersForStep(@Req() req: any, @Param("step") step: string) {
    return this.assignmentService.eligibleUsersForStep(req.user.companyId, step as WorkflowStep);
  }

  @Put("assignments/:step")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Update users assigned to a workflow step" })
  async updateStepAssignments(
    @Req() req: any,
    @Param("step") step: string,
    @Body() dto: UpdateStepAssignmentsDto,
  ) {
    await this.assignmentService.updateAssignments(
      req.user.companyId,
      step as WorkflowStep,
      dto.userIds,
      dto.primaryUserId,
    );
    return { success: true };
  }

  @Get("notification-recipients")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Get all notification recipients for company" })
  async allNotificationRecipients(@Req() req: any) {
    return this.assignmentService.allNotificationRecipients(req.user.companyId);
  }

  @Put("notification-recipients/:step")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Update notification recipients for a workflow step" })
  async updateNotificationRecipients(
    @Req() req: any,
    @Param("step") step: string,
    @Body() dto: UpdateNotificationRecipientsDto,
  ) {
    await this.assignmentService.updateNotificationRecipients(
      req.user.companyId,
      step as WorkflowStep,
      dto.emails,
    );
    return { success: true };
  }

  @Get("user-locations")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Get all user location assignments for company" })
  async allUserLocations(@Req() req: any) {
    return this.assignmentService.allUserLocationAssignments(req.user.companyId);
  }

  @Put("user-locations/:userId")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Update location assignments for a user" })
  async updateUserLocations(
    @Req() req: any,
    @Param("userId") userId: number,
    @Body() dto: UpdateUserLocationsDto,
  ) {
    await this.assignmentService.updateUserLocations(req.user.companyId, userId, dto.locationIds);
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
    @Body() dto: ScanDispatchItemDto,
  ) {
    return this.dispatchService.scanItem(
      req.user.companyId,
      id,
      dto.stockItemId,
      dto.quantity,
      req.user,
      dto.notes,
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
  async scanQr(@Req() req: any, @Body() dto: ScanQrDto) {
    return this.dispatchService.scanByQrToken(req.user.companyId, dto.qrToken);
  }

  @Get("job-cards/:id/print")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Download signed job card PDF" })
  async printJobCard(@Req() req: any, @Param("id") id: number, @Res() res: Response) {
    this.logger.log(`Print request received for job card ${id} by user ${req.user.id}`);
    const { buffer, filename } = await this.pdfService.generatePrintableJobCard(
      req.user.companyId,
      id,
    );
    this.logger.log(`PDF generated: ${filename}, size: ${buffer.length} bytes`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(buffer);
  }

  @Get("push/vapid-key")
  @ApiOperation({ summary: "Get VAPID public key for push subscription" })
  vapidKey() {
    return { vapidPublicKey: this.webPushService.vapidPublicKey() };
  }

  @Post("push/subscribe")
  @ApiOperation({ summary: "Subscribe to push notifications" })
  async pushSubscribe(
    @Req() req: any,
    @Body() dto: PushSubscribeDto,
  ) {
    await this.webPushService.subscribe(req.user.id, req.user.companyId, dto);
    return { success: true };
  }

  @Post("push/unsubscribe")
  @ApiOperation({ summary: "Unsubscribe from push notifications" })
  async pushUnsubscribe(@Req() req: any, @Body() dto: PushUnsubscribeDto) {
    await this.webPushService.unsubscribe(req.user.id, dto.endpoint);
    return { success: true };
  }

  @Get("step-configs")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Get ordered workflow step configurations for company" })
  async stepConfigs(@Req() req: any) {
    return this.stepConfigService.orderedSteps(req.user.companyId);
  }

  @Put("step-configs/:key/label")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Update a workflow step label" })
  async updateStepLabel(
    @Req() req: any,
    @Param("key") key: string,
    @Body() dto: UpdateStepLabelDto,
  ) {
    await this.stepConfigService.updateLabel(req.user.companyId, key, dto.label);
    return { success: true };
  }

  @Post("step-configs")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Add a custom workflow step" })
  async addStepConfig(
    @Req() req: any,
    @Body() dto: AddStepConfigDto,
  ) {
    return this.stepConfigService.addStep(req.user.companyId, dto);
  }

  @Get("step-configs/background")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Get background workflow step configurations" })
  async backgroundStepConfigs(@Req() req: any) {
    return this.stepConfigService.backgroundSteps(req.user.companyId);
  }

  @Put("step-configs/:key/toggle-background")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Toggle a step between foreground and background" })
  async toggleStepBackground(
    @Req() req: any,
    @Param("key") key: string,
    @Body() dto: ToggleStepBackgroundDto,
  ) {
    return this.stepConfigService.toggleBackground(
      req.user.companyId,
      key,
      dto.isBackground,
      dto.triggerAfterStep,
    );
  }

  @Delete("step-configs/:key")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Remove a custom workflow step" })
  async removeStepConfig(@Req() req: any, @Param("key") key: string) {
    await this.stepConfigService.removeStep(req.user.companyId, key);
    return { success: true };
  }

  @Put("step-configs/reorder")
  @StockControlRoles("admin")
  @ApiOperation({ summary: "Bulk reorder workflow steps" })
  async reorderStepConfigs(@Req() req: any, @Body() dto: ReorderStepConfigsDto) {
    await this.stepConfigService.bulkReorder(req.user.companyId, dto.orderedKeys);
    return { success: true };
  }

  @Get("job-cards/:id/background-steps")
  @ApiOperation({ summary: "Background step statuses for a job card" })
  async backgroundSteps(@Req() req: any, @Param("id") id: number) {
    return this.backgroundStepService.statusForJobCard(req.user.companyId, id);
  }

  @Post("job-cards/:id/background-steps/:stepKey/complete")
  @ApiOperation({ summary: "Complete a background step for a job card" })
  async completeBackgroundStep(
    @Req() req: any,
    @Param("id") id: number,
    @Param("stepKey") stepKey: string,
    @Body() dto: CompleteBackgroundStepDto,
  ) {
    return this.backgroundStepService.completeStep(
      req.user.companyId,
      id,
      stepKey,
      req.user,
      dto.notes,
    );
  }

  @Get("background-steps/pending")
  @ApiOperation({ summary: "Pending background steps for current user" })
  async pendingBackgroundSteps(@Req() req: any) {
    return this.backgroundStepService.pendingForUser(req.user.id, req.user.companyId);
  }
}
