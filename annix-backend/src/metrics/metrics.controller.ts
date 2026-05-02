import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { ExtractionMetricService, ExtractionStats } from "./extraction-metric.service";

@ApiTags("Metrics")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly extractionMetricService: ExtractionMetricService) {}

  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @Get("extraction-stats")
  @ApiOperation({
    summary: "Get rolling-average duration for a long-running extraction operation",
  })
  @ApiQuery({ name: "category", required: true })
  @ApiQuery({ name: "operation", required: false })
  async extractionStats(
    @Query("category") category: string,
    @Query("operation") operation?: string,
  ): Promise<ExtractionStats> {
    return this.extractionMetricService.stats(category, operation || "");
  }
}
