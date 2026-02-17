import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { FieldFlowAuthGuard } from "../auth";
import {
  ColdCallSuggestionsQueryDto,
  OptimizeRouteDto,
  PlanDayRouteQueryDto,
  ScheduleGapsQueryDto,
} from "../dto";
import { ColdCallSuggestion, OptimizedRoute, RoutePlanningService, ScheduleGap } from "../services";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Routes")
@Controller("fieldflow/routes")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class RouteController {
  constructor(private readonly routePlanningService: RoutePlanningService) {}

  @Get("gaps")
  @ApiOperation({ summary: "Get schedule gaps for the day" })
  @ApiResponse({ status: 200 })
  async scheduleGaps(
    @Req() req: FieldFlowRequest,
    @Query() query: ScheduleGapsQueryDto,
  ): Promise<ScheduleGap[]> {
    const date = new Date(query.date);
    return this.routePlanningService.scheduleGaps(
      req.fieldflowUser.userId,
      date,
      query.minGapMinutes,
    );
  }

  @Get("cold-call-suggestions")
  @ApiOperation({ summary: "Get cold call suggestions based on location" })
  @ApiResponse({ status: 200 })
  async coldCallSuggestions(
    @Req() req: FieldFlowRequest,
    @Query() query: ColdCallSuggestionsQueryDto,
  ): Promise<ColdCallSuggestion[]> {
    const date = new Date(query.date);
    return this.routePlanningService.coldCallSuggestions(
      req.fieldflowUser.userId,
      date,
      query.currentLat,
      query.currentLng,
      query.maxSuggestions,
    );
  }

  @Post("optimize")
  @ApiOperation({ summary: "Optimize route for given stops" })
  @ApiResponse({ status: 200 })
  async optimizeRoute(@Body() dto: OptimizeRouteDto): Promise<OptimizedRoute> {
    return this.routePlanningService.optimizeRoute(
      dto.startLat,
      dto.startLng,
      dto.stops,
      dto.returnToStart,
    );
  }

  @Get("plan-day")
  @ApiOperation({ summary: "Plan optimized route for the day" })
  @ApiResponse({ status: 200 })
  async planDayRoute(
    @Req() req: FieldFlowRequest,
    @Query() query: PlanDayRouteQueryDto,
  ): Promise<OptimizedRoute> {
    const date = new Date(query.date);
    return this.routePlanningService.planDayRoute(
      req.fieldflowUser.userId,
      date,
      query.includeColdCalls,
      query.currentLat,
      query.currentLng,
    );
  }
}
