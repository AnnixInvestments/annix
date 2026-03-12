import { Body, Controller, Get, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlRole } from "../entities/stock-control-user.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { CpoService } from "../services/cpo.service";
import { DashboardService } from "../services/dashboard.service";

const ROLE_HIERARCHY = ["viewer", "storeman", "accounts", "manager", "admin"];

@ApiTags("Stock Control - Dashboard")
@Controller("stock-control/dashboard")
@UseGuards(StockControlAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cpoService: CpoService,
  ) {}

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

  @Get("soh-by-location")
  @ApiOperation({ summary: "Stock on hand summary by location" })
  async sohByLocation(@Req() req: any) {
    return this.dashboardService.sohByLocation(req.user.companyId);
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

  @Get("cpo-summary")
  @ApiOperation({ summary: "CPO summary for dashboard" })
  async cpoSummary(@Req() req: any) {
    return this.cpoService.cpoSummary(req.user.companyId);
  }

  @Get("workflow-lanes")
  @ApiOperation({ summary: "Workflow lane counts for three-lane dashboard" })
  async workflowLanes(@Req() req: any) {
    return this.dashboardService.workflowLaneCounts(req.user.companyId);
  }

  @Get("role-summary")
  @ApiOperation({ summary: "Role-specific dashboard summary" })
  async roleSummary(@Req() req: any, @Query("role") requestedRole?: string) {
    const { companyId, role: userRole } = req.user;
    const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
    const requestedIndex = requestedRole ? ROLE_HIERARCHY.indexOf(requestedRole) : -1;
    const effectiveRole =
      requestedRole && requestedIndex >= 0 && requestedIndex <= userRoleIndex
        ? requestedRole
        : userRole;

    if (effectiveRole === StockControlRole.STOREMAN) {
      const data = await this.dashboardService.storemanSummary(companyId);
      return { role: effectiveRole, ...data };
    } else if (effectiveRole === StockControlRole.ACCOUNTS) {
      const data = await this.dashboardService.accountsSummary(companyId);
      return { role: effectiveRole, ...data };
    } else if (effectiveRole === StockControlRole.MANAGER) {
      const data = await this.dashboardService.managerSummary(companyId);
      return { role: effectiveRole, ...data };
    } else if (effectiveRole === StockControlRole.ADMIN) {
      const data = await this.dashboardService.adminSummary(companyId);
      return { role: effectiveRole, ...data };
    } else {
      const data = await this.dashboardService.stats(companyId);
      return { role: "viewer", ...data };
    }
  }

  @Get("preferences")
  @ApiOperation({ summary: "Dashboard preferences for current user" })
  async preferences(@Req() req: any) {
    return this.dashboardService.preferencesForUser(req.user.companyId, req.user.id);
  }

  @Put("preferences")
  @ApiOperation({ summary: "Update dashboard preferences" })
  async updatePreferences(
    @Req() req: any,
    @Body()
    body: {
      pinnedWidgets?: string[];
      hiddenWidgets?: string[];
      viewOverride?: string | null;
    },
  ) {
    return this.dashboardService.updatePreferences(req.user.companyId, req.user.id, body);
  }
}
