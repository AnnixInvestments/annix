import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AiUsageListResponse, AiUsageService } from "../ai-usage/ai-usage.service";
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
