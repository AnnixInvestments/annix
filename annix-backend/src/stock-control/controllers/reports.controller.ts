import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { ReportsService } from "../services/reports.service";

@ApiTags("Stock Control - Reports")
@Controller("stock-control/reports")
@UseGuards(StockControlAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("cost-by-job")
  @ApiOperation({ summary: "Cost breakdown by job card" })
  async costByJob() {
    return this.reportsService.costByJob();
  }

  @Get("stock-valuation")
  @ApiOperation({ summary: "Current stock valuation" })
  async stockValuation() {
    return this.reportsService.stockValuation();
  }

  @Get("movement-history")
  @ApiOperation({ summary: "Stock movement history with filters" })
  async movementHistory(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("movementType") movementType?: string,
    @Query("stockItemId") stockItemId?: string,
  ) {
    return this.reportsService.movementHistory({
      startDate,
      endDate,
      movementType,
      stockItemId: stockItemId ? Number(stockItemId) : undefined,
    });
  }
}
