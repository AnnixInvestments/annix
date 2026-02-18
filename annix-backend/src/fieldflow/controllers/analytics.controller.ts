import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { FieldFlowAuthGuard } from "../auth";
import { AnalyticsService } from "../services/analytics.service";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Analytics")
@Controller("fieldflow/analytics")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("summary")
  @ApiOperation({ summary: "Get analytics summary" })
  @ApiResponse({ status: 200, description: "Analytics summary data" })
  summary(@Req() req: FieldFlowRequest) {
    return this.analyticsService.summary(req.fieldflowUser.userId);
  }

  @Get("meetings-over-time")
  @ApiOperation({ summary: "Get meetings count over time" })
  @ApiQuery({ name: "period", enum: ["week", "month"], required: false })
  @ApiQuery({ name: "count", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Meetings over time data" })
  meetingsOverTime(
    @Req() req: FieldFlowRequest,
    @Query("period") period?: "week" | "month",
    @Query("count") count?: string,
  ) {
    return this.analyticsService.meetingsOverTime(
      req.fieldflowUser.userId,
      period || "week",
      count ? parseInt(count, 10) : 8,
    );
  }

  @Get("prospect-funnel")
  @ApiOperation({ summary: "Get prospects funnel data" })
  @ApiResponse({ status: 200, description: "Prospect funnel by status" })
  prospectFunnel(@Req() req: FieldFlowRequest) {
    return this.analyticsService.prospectFunnel(req.fieldflowUser.userId);
  }

  @Get("win-loss-trends")
  @ApiOperation({ summary: "Get win/loss rate trends" })
  @ApiQuery({ name: "months", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Win/loss rate trends" })
  winLossRateTrends(@Req() req: FieldFlowRequest, @Query("months") months?: string) {
    return this.analyticsService.winLossRateTrends(
      req.fieldflowUser.userId,
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get("activity-heatmap")
  @ApiOperation({ summary: "Get activity heatmap (visits by day/hour)" })
  @ApiResponse({ status: 200, description: "Activity heatmap data" })
  activityHeatmap(@Req() req: FieldFlowRequest) {
    return this.analyticsService.activityHeatmap(req.fieldflowUser.userId);
  }

  @Get("revenue-pipeline")
  @ApiOperation({ summary: "Get revenue pipeline by stage" })
  @ApiResponse({ status: 200, description: "Revenue pipeline data" })
  revenuePipeline(@Req() req: FieldFlowRequest) {
    return this.analyticsService.revenuePipeline(req.fieldflowUser.userId);
  }

  @Get("top-prospects")
  @ApiOperation({ summary: "Get top prospects by value" })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Top prospects by estimated value" })
  topProspects(@Req() req: FieldFlowRequest, @Query("limit") limit?: string) {
    return this.analyticsService.topProspects(
      req.fieldflowUser.userId,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
