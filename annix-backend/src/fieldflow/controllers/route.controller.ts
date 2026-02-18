import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import {
  ColdCallSuggestionsQueryDto,
  OptimizeRouteDto,
  PlanDayRouteQueryDto,
  ScheduleGapsQueryDto,
} from "../dto";
import { ColdCallSuggestion, OptimizedRoute, RoutePlanningService, ScheduleGap } from "../services";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Routes")
@Controller("annix-rep/routes")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class RouteController {
  constructor(private readonly routePlanningService: RoutePlanningService) {}

  @Get("gaps")
  @ApiOperation({ summary: "Get schedule gaps for the day" })
  @ApiResponse({ status: 200 })
  async scheduleGaps(
    @Req() req: AnnixRepRequest,
    @Query() query: ScheduleGapsQueryDto,
  ): Promise<ScheduleGap[]> {
    const date = new Date(query.date);
    return this.routePlanningService.scheduleGaps(
      req.annixRepUser.userId,
      date,
      query.minGapMinutes,
    );
  }

  @Get("cold-call-suggestions")
  @ApiOperation({ summary: "Get cold call suggestions based on location" })
  @ApiResponse({ status: 200 })
  async coldCallSuggestions(
    @Req() req: AnnixRepRequest,
    @Query() query: ColdCallSuggestionsQueryDto,
  ): Promise<ColdCallSuggestion[]> {
    const date = new Date(query.date);
    return this.routePlanningService.coldCallSuggestions(
      req.annixRepUser.userId,
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
    @Req() req: AnnixRepRequest,
    @Query() query: PlanDayRouteQueryDto,
  ): Promise<OptimizedRoute> {
    const date = new Date(query.date);
    return this.routePlanningService.planDayRoute(
      req.annixRepUser.userId,
      date,
      query.includeColdCalls,
      query.currentLat,
      query.currentLng,
    );
  }
}
