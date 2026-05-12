import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { Asset } from "../entities/asset.entity";
import { SignalSnapshot } from "../entities/signal-snapshot.entity";
import { INSIGHTS_ROLE } from "../insights.constants";

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
    @InjectRepository(SignalSnapshot)
    private readonly signalRepo: Repository<SignalSnapshot>,
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
  ) {}

  @Get("latest")
  @ApiOperation({
    summary: "Latest signal snapshot per asset (one row per asset, newest available date).",
  })
  async latest(): Promise<SignalSnapshotDto[]> {
    const rows = await this.signalRepo
      .createQueryBuilder("s")
      .innerJoinAndSelect("s.asset", "asset")
      .innerJoin(
        (qb) =>
          qb
            .from(SignalSnapshot, "ss")
            .select("ss.asset_id", "asset_id")
            .addSelect("MAX(ss.snapshot_date)", "max_date")
            .groupBy("ss.asset_id"),
        "latest",
        '"latest".asset_id = s.asset_id AND "latest".max_date = s.snapshot_date',
      )
      .orderBy("s.opportunity_score", "DESC")
      .getMany();
    return rows.map((row) => this.toDto(row));
  }

  @Get(":symbol/history")
  @ApiOperation({ summary: "Daily signal snapshot history for one asset (oldest first)" })
  async history(
    @Param("symbol") symbol: string,
    @Query("limit") limit?: string,
  ): Promise<SignalSnapshotDto[]> {
    const upper = symbol.toUpperCase();
    const asset = await this.assetRepo.findOne({ where: { symbol: upper } });
    if (!asset) return [];
    const parsed = limit ? Number.parseInt(limit, 10) : 365;
    const safe = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 2000) : 365;
    const rows = await this.signalRepo.find({
      where: { assetId: asset.id },
      relations: { asset: true },
      order: { snapshotDate: "DESC" },
      take: safe,
    });
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
