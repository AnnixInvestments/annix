import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard, AnnixRepUser } from "../auth";
import { TeamRoleGuard, TeamRoles } from "../auth/guards/team-role.guard";
import {
  LeaderboardEntryDto,
  ManagerDashboardResponseDto,
  MemberPerformanceResponseDto,
} from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { TeamAnalyticsService } from "../services/team-analytics.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Manager Dashboard")
@Controller("annix-rep/manager")
@UseGuards(AnnixRepAuthGuard, TeamRoleGuard)
@TeamRoles(TeamRole.MANAGER, TeamRole.ADMIN)
@ApiBearerAuth()
export class ManagerDashboardController {
  constructor(private readonly analyticsService: TeamAnalyticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get manager dashboard data" })
  @ApiResponse({ status: 200, type: ManagerDashboardResponseDto })
  async dashboard(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const summary = await this.analyticsService.teamSummary(orgId);
    return {
      teamSize: summary.totalMembers,
      activeReps: summary.activeMembers,
      totalPipelineValue: summary.totalPipelineValue,
      teamMeetingsThisMonth: summary.meetingsThisMonth,
      teamDealsWonThisMonth: summary.dealsWonThisMonth,
      teamDealsLostThisMonth: summary.dealsLostThisMonth,
    };
  }

  @Get("team-performance")
  @ApiOperation({ summary: "Get team performance metrics" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiResponse({ status: 200, type: [MemberPerformanceResponseDto] })
  async teamPerformance(
    @Req() req: AnnixRepRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const period = startDate && endDate ? { start: startDate, end: endDate } : undefined;
    return this.analyticsService.memberPerformance(orgId, period);
  }

  @Get("territory-performance")
  @ApiOperation({ summary: "Get territory performance metrics" })
  async territoryPerformance(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.analyticsService.territoryPerformance(orgId);
  }

  @Get("pipeline-by-rep")
  @ApiOperation({ summary: "Get pipeline breakdown by rep" })
  async pipelineByRep(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.analyticsService.pipelineByRep(orgId);
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "Get sales leaderboard" })
  @ApiQuery({
    name: "metric",
    required: false,
    enum: ["deals_won", "pipeline_value", "meetings_completed", "prospects_created"],
  })
  @ApiResponse({ status: 200, type: [LeaderboardEntryDto] })
  async leaderboard(@Req() req: AnnixRepRequest, @Query("metric") metric?: string) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const validMetric = metric as
      | "deals_won"
      | "pipeline_value"
      | "meetings_completed"
      | "prospects_created";
    return this.analyticsService.leaderboard(orgId, validMetric ?? "deals_won");
  }
}
