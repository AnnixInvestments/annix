import { Controller, Get, Req, UseGuards } from "@nestjs/common";
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
  async stats(@Req() req: any) {
    return this.dashboardService.stats(req.user.companyId);
  }

  @Get("soh-summary")
  @ApiOperation({ summary: "Stock on hand summary by category" })
  async sohSummary(@Req() req: any) {
    return this.dashboardService.sohSummary(req.user.companyId);
  }

  @Get("recent-activity")
  @ApiOperation({ summary: "Recent stock movement activity" })
  async recentActivity(@Req() req: any) {
    return this.dashboardService.recentActivity(req.user.companyId);
  }

  @Get("reorder-alerts")
  @ApiOperation({ summary: "Items that need reordering" })
  async reorderAlerts(@Req() req: any) {
    return this.dashboardService.reorderAlerts(req.user.companyId);
  }
}
