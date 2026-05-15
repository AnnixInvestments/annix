import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { MacroSentimentSnapshot } from "../entities/macro-sentiment-snapshot.entity";
import { INSIGHTS_ROLE } from "../insights.constants";
import { MacroSentimentService } from "../services/macro-sentiment.service";

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
  today(): Promise<MacroSentimentSnapshot | null> {
    return this.macro.today();
  }

  @Get("history")
  @ApiOperation({ summary: "Recent macro sentiment snapshots (ascending date, max 90)" })
  history(@Query("limit") limit?: string): Promise<MacroSentimentSnapshot[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : Number.NaN;
    const safeLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 90) : 30;
    return this.macro.history(safeLimit);
  }
}
