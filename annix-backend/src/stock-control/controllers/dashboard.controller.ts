import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { DashboardService } from "../services/dashboard.service";

@ApiTags("Stock Control - Dashboard")
@Controller("stock-control/dashboard")
@UseGuards(StockControlAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "Dashboard statistics overview" })
  async stats() {
    return this.dashboardService.stats();
  }

  @Get("soh-summary")
  @ApiOperation({ summary: "Stock on hand summary by category" })
  async sohSummary() {
    return this.dashboardService.sohSummary();
  }

  @Get("recent-activity")
  @ApiOperation({ summary: "Recent stock movement activity" })
  async recentActivity() {
    return this.dashboardService.recentActivity();
  }

  @Get("reorder-alerts")
  @ApiOperation({ summary: "Items that need reordering" })
  async reorderAlerts() {
    return this.dashboardService.reorderAlerts();
  }
}
