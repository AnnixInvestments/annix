import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  AiUsageByFeatureResponse,
  AiUsageDailyByAppResponse,
  AiUsageDailyByFeatureResponse,
  AiUsageDailySeriesResponse,
  AiUsageListResponse,
  AiUsageService,
} from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin AI Usage")
@Controller("admin/ai-usage")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class AdminAiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  @Get("daily-series")
  @ApiOperation({ summary: "Daily AI usage series (calls + tokens per day) for charting" })
  @ApiQuery({ name: "days", required: false, type: Number })
  async dailySeries(@Query("days") days?: string): Promise<AiUsageDailySeriesResponse> {
    return this.aiUsageService.dailySeries(days ? Number(days) : 28);
  }

  @Get("by-feature")
  @ApiOperation({ summary: "AI cost rolled up by feature (actionType + model) over a window" })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiQuery({ name: "app", required: false, enum: AiApp })
  @ApiQuery({ name: "provider", required: false, enum: AiProvider })
  async byFeature(
    @Query("days") days?: string,
    @Query("app") app?: AiApp,
    @Query("provider") provider?: AiProvider,
  ): Promise<AiUsageByFeatureResponse> {
    return this.aiUsageService.byFeature(days ? Number(days) : 28, app ?? null, provider ?? null);
  }

  @Get("daily-by-feature")
  @ApiOperation({
    summary: "Daily AI cost/calls per feature (actionType) for grouped bar charting",
  })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiQuery({ name: "app", required: false, enum: AiApp })
  @ApiQuery({ name: "provider", required: false, enum: AiProvider })
  async dailyByFeature(
    @Query("days") days?: string,
    @Query("app") app?: AiApp,
    @Query("provider") provider?: AiProvider,
  ): Promise<AiUsageDailyByFeatureResponse> {
    return this.aiUsageService.dailyByFeature(
      days ? Number(days) : 28,
      app ?? null,
      provider ?? null,
    );
  }

  @Get("daily-by-app")
  @ApiOperation({
    summary: "Daily AI cost/calls per app (all apps) for the global grouped bar chart",
  })
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiQuery({ name: "provider", required: false, enum: AiProvider })
  async dailyByApp(
    @Query("days") days?: string,
    @Query("provider") provider?: AiProvider,
  ): Promise<AiUsageDailyByAppResponse> {
    return this.aiUsageService.dailyByApp(days ? Number(days) : 28, provider ?? null);
  }

  @Get()
  @ApiOperation({ summary: "List AI usage logs with filters" })
  @ApiQuery({ name: "app", required: false, enum: AiApp })
  @ApiQuery({ name: "provider", required: false, enum: AiProvider })
  @ApiQuery({ name: "from", required: false, type: String })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async list(
    @Query("app") app?: AiApp,
    @Query("provider") provider?: AiProvider,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<AiUsageListResponse> {
    return this.aiUsageService.usageLogs({
      app,
      provider,
      from,
      to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
