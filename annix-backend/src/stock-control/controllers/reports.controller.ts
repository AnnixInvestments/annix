import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { ReportsService } from "../services/reports.service";

@ApiTags("Stock Control - Reports")
@Controller("stock-control/reports")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("cost-by-job")
  @ApiOperation({ summary: "Cost breakdown by job card" })
  async costByJob(@Req() req: any) {
    return this.reportsService.costByJob(req.user.companyId);
  }

  @Get("stock-valuation")
  @ApiOperation({ summary: "Current stock valuation" })
  async stockValuation(@Req() req: any) {
    return this.reportsService.stockValuation(req.user.companyId);
  }

  @Get("movement-history")
  @ApiOperation({ summary: "Stock movement history with filters" })
  async movementHistory(
    @Req() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("movementType") movementType?: string,
    @Query("stockItemId") stockItemId?: string,
  ) {
    return this.reportsService.movementHistory(req.user.companyId, {
      startDate,
      endDate,
      movementType,
      stockItemId: stockItemId ? Number(stockItemId) : undefined,
    });
  }
}
