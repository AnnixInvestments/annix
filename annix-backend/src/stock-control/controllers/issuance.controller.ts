import { Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import {
  BatchIssuanceDto,
  CpoBatchIssuanceDto,
  CreateIssuanceDto,
  IssuanceFilters,
  IssuanceService,
} from "../services/issuance.service";

@ApiTags("Stock Control - Issuance")
@Controller("stock-control/issuance")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class IssuanceController {
  private readonly logger = new Logger(IssuanceController.name);

  constructor(private readonly issuanceService: IssuanceService) {}

  @Post("scan-qr")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.issue")
  @ApiOperation({ summary: "Scan and validate any QR code for issuance workflow" })
  async scanQr(@Req() req: any, @Body() body: { qrCode: string }) {
    return this.issuanceService.parseAndValidateQr(req.user.companyId, body.qrCode);
  }

  @Post()
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.issue")
  @ApiOperation({ summary: "Create a new stock issuance" })
  async createIssuance(@Req() req: any, @Body() dto: CreateIssuanceDto) {
    return this.issuanceService.createIssuance(req.user.companyId, dto, req.user);
  }

  @Post("batch")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.issue")
  @ApiOperation({ summary: "Create multiple stock issuances in batch" })
  async createBatchIssuance(@Req() req: any, @Body() dto: BatchIssuanceDto) {
    return this.issuanceService.createBatchIssuance(req.user.companyId, dto, req.user);
  }

  @Post("cpo-batch")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.issue")
  @ApiOperation({
    summary: "Create a CPO-level batch issuance across multiple child job cards",
  })
  async createCpoBatchIssuance(@Req() req: any, @Body() dto: CpoBatchIssuanceDto) {
    return this.issuanceService.createCpoBatchIssuance(req.user.companyId, dto, req.user);
  }

  @Get("cpo-batch/context/:cpoId")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.issue")
  @ApiOperation({
    summary: "Get child JCs + aggregated coating requirements for a CPO batch session",
  })
  async cpoBatchContext(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.issuanceService.cpoBatchIssueContext(req.user.companyId, Number(cpoId));
  }

  @Get("sessions/pending-approval")
  @StockControlRoles("manager", "admin")
  @PermissionKey("issuance.approve")
  @ApiOperation({ summary: "List all sessions currently pending approval" })
  async pendingApprovalSessions(@Req() req: any) {
    return this.issuanceService.pendingApprovalSessions(req.user.companyId);
  }

  @Get("sessions/by-cpo/:cpoId")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @ApiOperation({ summary: "List all issuance sessions for a CPO" })
  async sessionsForCpo(@Req() req: any, @Param("cpoId") cpoId: number) {
    return this.issuanceService.sessionsForCpo(req.user.companyId, Number(cpoId));
  }

  @Get("sessions/by-job-card/:jobCardId")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @ApiOperation({ summary: "List all issuance sessions that include a specific job card" })
  async sessionsForJobCard(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.issuanceService.sessionsForJobCard(req.user.companyId, Number(jobCardId));
  }

  @Get("sessions/:id")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @ApiOperation({ summary: "Get a specific issuance session by ID" })
  async sessionById(@Req() req: any, @Param("id") id: number) {
    return this.issuanceService.sessionById(req.user.companyId, Number(id));
  }

  @Post("sessions/:id/undo")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.undo")
  @ApiOperation({ summary: "Undo an entire issuance session (all rows)" })
  async undoSession(@Req() req: any, @Param("id") id: number) {
    return this.issuanceService.undoSession(req.user.companyId, Number(id), req.user);
  }

  @Post("sessions/:id/approve")
  @StockControlRoles("manager", "admin")
  @PermissionKey("issuance.approve")
  @ApiOperation({ summary: "Approve a pending-approval issuance session" })
  async approveSession(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: { managerStaffId: number },
  ) {
    return this.issuanceService.approveSession(
      req.user.companyId,
      Number(id),
      body.managerStaffId,
      req.user,
    );
  }

  @Post("sessions/:id/reject")
  @StockControlRoles("manager", "admin")
  @PermissionKey("issuance.approve")
  @ApiOperation({ summary: "Reject a pending-approval issuance session and roll it back" })
  async rejectSession(@Req() req: any, @Param("id") id: number, @Body() body: { reason: string }) {
    return this.issuanceService.rejectSession(
      req.user.companyId,
      Number(id),
      body.reason,
      req.user,
    );
  }

  @Get()
  @ApiOperation({ summary: "List all stock issuances with optional filters" })
  async findAll(
    @Req() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("staffId") staffId?: string,
    @Query("stockItemId") stockItemId?: string,
    @Query("jobCardId") jobCardId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const filters: IssuanceFilters = {};

    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (staffId) filters.staffId = parseInt(staffId, 10);
    if (stockItemId) filters.stockItemId = parseInt(stockItemId, 10);
    if (jobCardId) filters.jobCardId = parseInt(jobCardId, 10);

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    return this.issuanceService.findAll(req.user.companyId, filters, pageNum, limitNum);
  }

  @Get("recent")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.issue")
  @ApiOperation({ summary: "Get recent issuances from the last 24 hours" })
  async recentIssuances(@Req() req: any) {
    return this.issuanceService.recentByUser(req.user.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific issuance by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.issuanceService.findById(req.user.companyId, id);
  }

  @Post(":id/undo")
  @StockControlRoles("storeman", "receiving-clerk", "accounts", "manager", "admin")
  @PermissionKey("issuance.undo")
  @ApiOperation({ summary: "Undo a recent issuance (within 5 minutes)" })
  async undoIssuance(@Req() req: any, @Param("id") id: number) {
    return this.issuanceService.undoIssuance(req.user.companyId, id, req.user);
  }
}
