import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Asset } from "./asset.entity";

export interface SignalComponentBreakdown {
  momentum: { score: number; roc20: number | null; smaCrossover: number | null };
  valuation: { score: number; trailingPe: number | null; medianPe: number | null };
  newsSentiment: {
    score: number;
    source: string;
    articleCount?: number;
    articleIds?: string[];
  };
  sectorTrend: {
    score: number;
    sector: string | null;
    etf: string | null;
    etfRoc20: number | null;
  };
  drawdownRisk: { score: number; weekHigh52: number | null; distanceFromHighPct: number };
  inputsAvailable: number;
  inputsMissing: string[];
}

@Entity({ name: "insights_signal_snapshots" })
@Index("UQ_insights_signal_snapshots_asset_date", ["assetId", "snapshotDate"], { unique: true })
export class SignalSnapshot {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Asset, { onDelete: "CASCADE", eager: false, nullable: false })
  @JoinColumn({ name: "asset_id" })
  asset: Asset;

  @Column({ name: "asset_id" })
  assetId: string;

  @ApiProperty({ description: "Trading date the snapshot represents", example: "2026-05-12" })
  @Column({ type: "date", name: "snapshot_date" })
  snapshotDate: string;

  @ApiProperty({ description: "Momentum score 0-100" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "momentum_score" })
  momentumScore: string;

  @ApiProperty({ description: "Valuation score 0-100 (higher = cheaper vs history)" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "valuation_score" })
  valuationScore: string;

  @ApiProperty({ description: "News sentiment 0-100 (stubbed at 50 until Phase 8)" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "news_sentiment_score" })
  newsSentimentScore: string;

  @ApiProperty({ description: "Sector-ETF 20d trend score 0-100" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "sector_trend_score" })
  sectorTrendScore: string;

  @ApiProperty({ description: "Drawdown-risk score 0-100 (higher = more downside risk)" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "drawdown_risk_score" })
  drawdownRiskScore: string;

  @ApiProperty({ description: "Aggregated opportunity score 0-100" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "opportunity_score" })
  opportunityScore: string;

  @ApiProperty({ description: "Aggregated risk score 0-100" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "risk_score" })
  riskScore: string;

  @ApiProperty({ description: "Confidence score 0-100 (drops when input dimensions are missing)" })
  @Column({ type: "numeric", precision: 6, scale: 2, name: "confidence_score" })
  confidenceScore: string;

  @ApiProperty({ description: "Every input value used so the score can be re-audited later" })
  @Column({ type: "jsonb", name: "component_breakdown_json" })
  componentBreakdownJson: SignalComponentBreakdown;

  @ApiProperty({ description: "Market-regime classification (Phase 12+); 'unknown' until then" })
  @Column({ type: "varchar", length: 32, default: "unknown", name: "market_regime" })
  marketRegime: string;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
