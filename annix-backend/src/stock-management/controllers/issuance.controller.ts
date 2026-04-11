import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import type { CreateIssuanceSessionDto, IssuanceSessionFilters } from "../dto/issuance.dto";
import type {
  IssuanceSessionKind,
  IssuanceSessionStatus,
} from "../entities/issuance-session.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { IssuanceService } from "../services/issuance.service";

@ApiTags("stock-management/issuance")
@Controller("stock-management/issuance")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class IssuanceController {
  constructor(private readonly issuanceService: IssuanceService) {}

  @Get("sessions")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "List issuance sessions for the calling company" })
  async list(
    @Req() req: any,
    @Query("status") status?: IssuanceSessionStatus,
    @Query("sessionKind") sessionKind?: IssuanceSessionKind,
    @Query("cpoId") cpoId?: string,
    @Query("issuerStaffId") issuerStaffId?: string,
    @Query("recipientStaffId") recipientStaffId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const filters: IssuanceSessionFilters = {};
    if (status) filters.status = status;
    if (sessionKind) filters.sessionKind = sessionKind;
    if (cpoId) filters.cpoId = Number(cpoId);
    if (issuerStaffId) filters.issuerStaffId = Number(issuerStaffId);
    if (recipientStaffId) filters.recipientStaffId = Number(recipientStaffId);
    if (page) filters.page = Number(page);
    if (pageSize) filters.pageSize = Number(pageSize);
    return this.issuanceService.list(Number(req.user.companyId), filters);
  }

  @Get("sessions/:id")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Get a single issuance session by ID" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.issuanceService.byId(Number(req.user.companyId), id);
  }

  @Post("sessions")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({
    summary: "Create a new mixed-row issuance session (consumables, paint, rubber, solutions)",
  })
  async create(@Req() req: any, @Body() dto: CreateIssuanceSessionDto) {
    return this.issuanceService.createSession(Number(req.user.companyId), dto);
  }

  @Post("sessions/:id/undo")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Undo an entire issuance session and mark all rows as undone" })
  async undo(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const undoneBy = req.user.linkedStaffId ?? req.user.id ?? null;
    return this.issuanceService.undoSession(Number(req.user.companyId), id, undoneBy);
  }
}
