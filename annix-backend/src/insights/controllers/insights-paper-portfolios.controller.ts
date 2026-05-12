import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { INSIGHTS_ROLE } from "../insights.constants";
import {
  type PaperHoldingDto,
  PaperPortfolioService,
  type PaperPortfolioSummary,
  type PaperTradeDto,
} from "../services/paper-portfolio.service";

@ApiTags("insights")
@Controller("insights/paper-portfolios")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsPaperPortfoliosController {
  constructor(private readonly service: PaperPortfolioService) {}

  @Get()
  @ApiOperation({ summary: "List all paper portfolios with summary stats" })
  list(): Promise<PaperPortfolioSummary[]> {
    return this.service.listAll();
  }

  @Get(":slug")
  @ApiOperation({ summary: "Get one paper portfolio by slug" })
  detail(@Param("slug") slug: string): Promise<PaperPortfolioSummary> {
    return this.service.bySlug(slug);
  }

  @Get(":slug/holdings")
  @ApiOperation({ summary: "List current holdings for a paper portfolio" })
  holdings(@Param("slug") slug: string): Promise<PaperHoldingDto[]> {
    return this.service.holdings(slug);
  }

  @Get(":slug/trades")
  @ApiOperation({ summary: "List recent trades for a paper portfolio (newest first)" })
  trades(@Param("slug") slug: string, @Query("limit") limit?: string): Promise<PaperTradeDto[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : 250;
    const safe = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 250;
    return this.service.trades(slug, safe);
  }
}
