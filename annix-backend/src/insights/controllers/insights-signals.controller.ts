import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { SignalSnapshot } from "../entities/signal-snapshot.entity";
import { INSIGHTS_ROLE } from "../insights.constants";
import { AssetRepository } from "../repositories/asset.repository";
import { SignalSnapshotRepository } from "../repositories/signal-snapshot.repository";

export interface SignalSnapshotDto {
  symbol: string;
  name: string;
  sector: string | null;
  snapshotDate: string;
  momentumScore: number;
  valuationScore: number;
  newsSentimentScore: number;
  sectorTrendScore: number;
  drawdownRiskScore: number;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  componentBreakdown: SignalSnapshot["componentBreakdownJson"];
  marketRegime: string;
}

@ApiTags("insights")
@Controller("insights/signals")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsSignalsController {
  constructor(
    private readonly signalRepo: SignalSnapshotRepository,
    private readonly assetRepo: AssetRepository,
  ) {}

  @Get("latest")
  @ApiOperation({
    summary: "Latest signal snapshot per asset (one row per asset, newest available date).",
  })
  async latest(): Promise<SignalSnapshotDto[]> {
    const rows = await this.signalRepo.findLatestPerAssetWithAsset();
    return rows.map((row) => this.toDto(row));
  }

  @Get(":symbol/history")
  @ApiOperation({ summary: "Daily signal snapshot history for one asset (oldest first)" })
  async history(
    @Param("symbol") symbol: string,
    @Query("limit") limit?: string,
  ): Promise<SignalSnapshotDto[]> {
    const upper = symbol.toUpperCase();
    const asset = await this.assetRepo.findBySymbol(upper);
    if (!asset) return [];
    const parsed = limit ? Number.parseInt(limit, 10) : 365;
    const safe = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 2000) : 365;
    const rows = await this.signalRepo.findHistoryForAsset(asset.id, safe);
    return rows.map((row) => this.toDto(row)).reverse();
  }

  private toDto(row: SignalSnapshot): SignalSnapshotDto {
    return {
      symbol: row.asset.symbol,
      name: row.asset.name,
      sector: row.asset.sector,
      snapshotDate:
        typeof row.snapshotDate === "string" ? row.snapshotDate.slice(0, 10) : row.snapshotDate,
      momentumScore: Number(row.momentumScore),
      valuationScore: Number(row.valuationScore),
      newsSentimentScore: Number(row.newsSentimentScore),
      sectorTrendScore: Number(row.sectorTrendScore),
      drawdownRiskScore: Number(row.drawdownRiskScore),
      opportunityScore: Number(row.opportunityScore),
      riskScore: Number(row.riskScore),
      confidenceScore: Number(row.confidenceScore),
      componentBreakdown: row.componentBreakdownJson,
      marketRegime: row.marketRegime,
    };
  }
}
