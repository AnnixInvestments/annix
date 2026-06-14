import { Controller, Get, Header, Query, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { RecruiterDashboardService } from "../services/recruiter-dashboard.service";

interface RecruiterAuthRequest {
  user: { companyId: number; id: number };
}

@Controller("annix-orbit/recruiter")
@UseGuards(AnnixOrbitAuthGuard)
export class RecruiterDashboardController {
  constructor(private readonly dashboardService: RecruiterDashboardService) {}

  // Single aggregate powering every dashboard widget (issue #362 phase 1).
  // Short private cache — the data is per-recruiter and changes slowly
  // within a viewing session.
  @Get("dashboard")
  @Header("Cache-Control", "private, max-age=60")
  dashboard(
    @Request() req: RecruiterAuthRequest,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.dashboardService.dashboard(req.user.companyId, req.user.id, from, to);
  }
}
