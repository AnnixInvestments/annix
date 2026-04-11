import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import {
  type CreateOffcutReturnInput,
  type CreateWastageEntryInput,
  ReturnsService,
} from "../services/returns.service";

interface RejectBody {
  reason: string;
}

@ApiTags("stock-management/returns")
@Controller("stock-management/returns")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get("outstanding")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "List all pending return sessions for the calling company" })
  async outstanding(@Req() req: any) {
    return this.returnsService.outstandingReturns(Number(req.user.companyId));
  }

  @Post("rubber-offcut")
  @StockManagementFeature("RUBBER_OFFCUT_TRACKING")
  @ApiOperation({
    summary: "Create a rubber offcut return session that produces a new allocatable offcut",
  })
  async createOffcutReturn(@Req() req: any, @Body() body: CreateOffcutReturnInput) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? null;
    return this.returnsService.createOffcutReturnSession(Number(req.user.companyId), {
      ...body,
      returnedByStaffId: staffId,
    });
  }

  @Post("sessions/:id/confirm")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Confirm a pending return session (final user allocation)" })
  async confirm(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.returnsService.confirm(Number(req.user.companyId), id, staffId);
  }

  @Post("sessions/:id/reject")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Reject a pending return session" })
  async reject(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body() body: RejectBody) {
    return this.returnsService.reject(Number(req.user.companyId), id, body.reason);
  }

  @Get("wastage-bins")
  @StockManagementFeature("RUBBER_WASTAGE_BINS")
  @ApiOperation({ summary: "List all rubber wastage bins for the calling company" })
  async listWastageBins(@Req() req: any) {
    return this.returnsService.listWastageBins(Number(req.user.companyId));
  }

  @Post("wastage-entries")
  @StockManagementFeature("RUBBER_WASTAGE_BINS")
  @ApiOperation({ summary: "Add weight to a colour-bucketed rubber wastage bin" })
  async addWastageEntry(@Req() req: any, @Body() body: CreateWastageEntryInput) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? null;
    return this.returnsService.addWastageEntry(Number(req.user.companyId), {
      ...body,
      addedByStaffId: staffId,
    });
  }

  @Post("wastage-bins/:id/empty")
  @StockManagementFeature("RUBBER_WASTAGE_BINS")
  @ApiOperation({
    summary: "Empty a wastage bin (marks last emptied date and value, resets totals)",
  })
  async emptyWastageBin(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.returnsService.emptyWastageBin(Number(req.user.companyId), id);
  }
}
