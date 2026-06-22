import { Controller, Get, Header, Query, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnalyticsService } from "../services/analytics.service";

@Controller("annix-orbit/analytics")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("funnel")
  async conversionFunnel(
    @Request() req: { user: { companyId: number } },
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.analyticsService.conversionFunnel(
      req.user.companyId,
      dateFrom ?? null,
      dateTo ?? null,
    );
  }

  @Get("match-accuracy")
  async matchAccuracy(@Request() req: { user: { companyId: number } }) {
    return this.analyticsService.matchAccuracy(req.user.companyId);
  }

  @Get("time-to-fill")
  async timeToFill(@Request() req: { user: { companyId: number } }) {
    return this.analyticsService.timeToFill(req.user.companyId);
  }

  @Get("market-trends")
  async marketTrends(@Request() req: { user: { companyId: number } }) {
    return this.analyticsService.marketTrends(req.user.companyId);
  }

  @Get("export/funnel")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", "attachment; filename=funnel-export.csv")
  async exportFunnel(
    @Request() req: { user: { companyId: number } },
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.analyticsService.funnelExportData(
      req.user.companyId,
      dateFrom ?? null,
      dateTo ?? null,
    );
  }

  @Get("export/time-to-fill")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", "attachment; filename=time-to-fill-export.csv")
  async exportTimeToFill(@Request() req: { user: { companyId: number } }) {
    return this.analyticsService.timeToFillExportData(req.user.companyId);
  }
}
