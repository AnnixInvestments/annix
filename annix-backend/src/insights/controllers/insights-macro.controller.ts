import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import {
  type MacroBreakdown,
  MacroSentimentSnapshot,
} from "../entities/macro-sentiment-snapshot.entity";
import { INSIGHTS_ROLE } from "../insights.constants";
import { MacroSentimentService } from "../services/macro-sentiment.service";

export interface MacroSentimentSnapshotDto {
  id: string;
  snapshotDate: string;
  overallScore: number;
  articleCount: number;
  highImpactCount: number;
  sectorBreakdown: MacroBreakdown;
  commodityBreakdown: MacroBreakdown;
  createdAt: string;
}

@ApiTags("insights")
@Controller("insights/macro")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsMacroController {
  constructor(private readonly macro: MacroSentimentService) {}

  @Get("today")
  @ApiOperation({
    summary: "Latest macro sentiment snapshot for today, null if cron hasn't run yet",
  })
  async today(): Promise<MacroSentimentSnapshotDto | null> {
    const row = await this.macro.today();
    return row !== null ? toDto(row) : null;
  }

  @Get("history")
  @ApiOperation({ summary: "Recent macro sentiment snapshots (ascending date, max 90)" })
  async history(@Query("limit") limit?: string): Promise<MacroSentimentSnapshotDto[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : Number.NaN;
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 90) : 30;
    const rows = await this.macro.history(safeLimit);
    return rows.map(toDto);
  }
}

function toDto(row: MacroSentimentSnapshot): MacroSentimentSnapshotDto {
  const dateStr =
    typeof row.snapshotDate === "string" ? row.snapshotDate.slice(0, 10) : row.snapshotDate;
  return {
    id: row.id,
    snapshotDate: dateStr,
    overallScore: Number(row.overallScore),
    articleCount: row.articleCount,
    highImpactCount: row.highImpactCount,
    sectorBreakdown: row.sectorBreakdown,
    commodityBreakdown: row.commodityBreakdown,
    createdAt: row.createdAt.toISOString(),
  };
}
