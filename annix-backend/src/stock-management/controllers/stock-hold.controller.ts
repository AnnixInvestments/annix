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
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type { StockHoldDispositionStatus } from "../entities/stock-hold-item.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import {
  type FlagStockHoldInput,
  type ResolveDispositionInput,
  StockHoldService,
} from "../services/stock-hold.service";

@ApiTags("stock-management/stock-hold")
@Controller("stock-management/stock-hold")
@UseGuards(JwtAuthGuard, StockManagementFeatureGuard)
export class StockHoldController {
  constructor(private readonly stockHoldService: StockHoldService) {}

  @Get()
  @StockManagementFeature("STOCK_HOLD_QUEUE")
  @ApiOperation({ summary: "List stock hold items with optional disposition status filter" })
  async list(@Req() req: any, @Query("status") status?: StockHoldDispositionStatus) {
    return this.stockHoldService.listAll(Number(req.user.companyId), status);
  }

  @Get("pending")
  @StockManagementFeature("STOCK_HOLD_QUEUE")
  @ApiOperation({ summary: "List pending stock hold items needing admin disposition" })
  async listPending(@Req() req: any) {
    return this.stockHoldService.listPending(Number(req.user.companyId));
  }

  @Get("aging")
  @StockManagementFeature("STOCK_HOLD_QUEUE")
  @ApiOperation({ summary: "Aging report for pending stock hold items" })
  async aging(@Req() req: any) {
    return this.stockHoldService.aging(Number(req.user.companyId));
  }

  @Get(":id")
  @StockManagementFeature("STOCK_HOLD_QUEUE")
  @ApiOperation({ summary: "Get a single stock hold item" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.stockHoldService.byId(Number(req.user.companyId), id);
  }

  @Post("flag")
  @StockManagementFeature("STOCK_HOLD_QUEUE")
  @ApiOperation({ summary: "Flag a stock item as damaged, expired, contaminated, etc." })
  async flag(@Req() req: any, @Body() body: FlagStockHoldInput) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.stockHoldService.flagStock(Number(req.user.companyId), {
      ...body,
      flaggedByStaffId: staffId,
    });
  }

  @Post(":id/resolve")
  @StockManagementFeature("STOCK_HOLD_QUEUE")
  @ApiOperation({
    summary: "Resolve a stock hold item with a disposition (scrap/return/repair/donate/other)",
  })
  async resolve(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ResolveDispositionInput,
  ) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.stockHoldService.resolveDisposition(Number(req.user.companyId), id, {
      ...body,
      dispositionByStaffId: staffId,
    });
  }
}
