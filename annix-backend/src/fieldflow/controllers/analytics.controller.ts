import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { AnalyticsService } from "../services/analytics.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Analytics")
@Controller("annix-rep/analytics")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  @ApiOperation({ summary: "Get analytics summary" })
  @ApiResponse({ status: 200, description: "Analytics summary data" })
  summary(@Req() req: AnnixRepRequest) {
    return this.analyticsService.summary(req.annixRepUser.userId);
  }

  @Get("meetings-over-time")
  @ApiOperation({ summary: "Get meetings count over time" })
  @ApiQuery({ name: "period", enum: ["week", "month"], required: false })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Meetings over time data" })
  meetingsOverTime(
    @Req() req: AnnixRepRequest,
    @Query("period") period?: "week" | "month",
    @Query("count") count?: string,
  ) {
    return this.analyticsService.meetingsOverTime(
      req.annixRepUser.userId,
      period || "week",
      count ? parseInt(count, 10) : 8,
    );
  }

  @Get("prospect-funnel")
  @ApiOperation({ summary: "Get prospects funnel data" })
  @ApiResponse({ status: 200, description: "Prospect funnel by status" })
  prospectFunnel(@Req() req: AnnixRepRequest) {
    return this.analyticsService.prospectFunnel(req.annixRepUser.userId);
  }

  @Get("win-loss-trends")
  @ApiOperation({ summary: "Get win/loss rate trends" })
  @ApiQuery({ name: "months", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Win/loss rate trends" })
  winLossRateTrends(@Req() req: AnnixRepRequest, @Query("months") months?: string) {
    return this.analyticsService.winLossRateTrends(
      req.annixRepUser.userId,
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get("activity-heatmap")
  @ApiOperation({ summary: "Get activity heatmap (visits by day/hour)" })
  @ApiResponse({ status: 200, description: "Activity heatmap data" })
  activityHeatmap(@Req() req: AnnixRepRequest) {
    return this.analyticsService.activityHeatmap(req.annixRepUser.userId);
  }

  @Get("revenue-pipeline")
  @ApiOperation({ summary: "Get revenue pipeline by stage" })
  @ApiResponse({ status: 200, description: "Revenue pipeline data" })
  revenuePipeline(@Req() req: AnnixRepRequest) {
    return this.analyticsService.revenuePipeline(req.annixRepUser.userId);
  }

  @Get("top-prospects")
  @ApiOperation({ summary: "Get top prospects by value" })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Top prospects by estimated value" })
  topProspects(@Req() req: AnnixRepRequest, @Query("limit") limit?: string) {
    return this.analyticsService.topProspects(
      req.annixRepUser.userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
