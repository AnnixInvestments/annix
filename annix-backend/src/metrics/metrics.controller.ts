import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import {
  type AggregatedUsageGroupBy,
  type AggregatedUsageRow,
  ExtractionMetricService,
  type ExtractionStats,
} from "./extraction-metric.service";

const VALID_GROUP_BY: AggregatedUsageGroupBy[] = ["category", "operation", "day"];

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

  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @Get("extraction-usage")
  @ApiOperation({
    summary:
      "Aggregated extraction-metric usage (runs, durations, payload bytes) over a time window",
  })
  @ApiQuery({ name: "from", required: false, description: "ISO date — defaults to 7 days ago" })
  @ApiQuery({ name: "to", required: false, description: "ISO date — defaults to now" })
  @ApiQuery({
    name: "groupBy",
    required: false,
    description: "category | operation (default) | day",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filter to a single metric category",
  })
  async extractionUsage(
    @Query("from") fromRaw?: string,
    @Query("to") toRaw?: string,
    @Query("groupBy") groupByRaw?: string,
    @Query("category") category?: string,
  ): Promise<AggregatedUsageRow[]> {
    const from = parseIsoDate(fromRaw, "from");
    const to = parseIsoDate(toRaw, "to");
    const groupByValue: AggregatedUsageGroupBy | undefined =
      groupByRaw === undefined
        ? undefined
        : VALID_GROUP_BY.includes(groupByRaw as AggregatedUsageGroupBy)
          ? (groupByRaw as AggregatedUsageGroupBy)
          : undefined;
    if (groupByRaw !== undefined && groupByValue === undefined) {
      throw new BadRequestException(`groupBy must be one of: ${VALID_GROUP_BY.join(", ")}`);
    }
    return this.extractionMetricService.aggregatedUsage({
      from,
      to,
      groupBy: groupByValue,
      category: category?.trim() || undefined,
    });
  }
}

function parseIsoDate(raw: string | undefined, label: string): Date | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${label} must be a valid ISO date`);
  }
  return parsed;
}
