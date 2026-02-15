import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import {
  ColdCallSuggestionsQueryDto,
  OptimizeRouteDto,
  PlanDayRouteQueryDto,
  ScheduleGapsQueryDto,
} from "../dto";
import { ColdCallSuggestion, OptimizedRoute, RoutePlanningService, ScheduleGap } from "../services";

interface AuthRequest extends Request {
  user: { id: number; email: string; roles: string[] };
}

@Controller("fieldflow/routes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RouteController {
  constructor(private readonly routePlanningService: RoutePlanningService) {}

  @Get("gaps")
  @Roles("admin", "employee")
  async scheduleGaps(
    @Req() req: AuthRequest,
    @Query() query: ScheduleGapsQueryDto,
  ): Promise<ScheduleGap[]> {
    const date = new Date(query.date);
    return this.routePlanningService.scheduleGaps(req.user.id, date, query.minGapMinutes);
  }

  @Get("cold-call-suggestions")
  @Roles("admin", "employee")
  async coldCallSuggestions(
    @Req() req: AuthRequest,
    @Query() query: ColdCallSuggestionsQueryDto,
  ): Promise<ColdCallSuggestion[]> {
    const date = new Date(query.date);
    return this.routePlanningService.coldCallSuggestions(
      req.user.id,
      date,
      query.currentLat,
      query.currentLng,
      query.maxSuggestions,
    );
  }

  @Post("optimize")
  @Roles("admin", "employee")
  async optimizeRoute(@Body() dto: OptimizeRouteDto): Promise<OptimizedRoute> {
    return this.routePlanningService.optimizeRoute(
      dto.startLat,
      dto.startLng,
      dto.stops,
      dto.returnToStart,
    );
  }

  @Get("plan-day")
  @Roles("admin", "employee")
  async planDayRoute(
    @Req() req: AuthRequest,
    @Query() query: PlanDayRouteQueryDto,
  ): Promise<OptimizedRoute> {
    const date = new Date(query.date);
    return this.routePlanningService.planDayRoute(
      req.user.id,
      date,
      query.includeColdCalls,
      query.currentLat,
      query.currentLng,
    );
  }
}
