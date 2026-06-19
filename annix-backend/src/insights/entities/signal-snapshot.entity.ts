import { ApiProperty } from "@nestjs/swagger";
import { Asset } from "./asset.entity";

export type ValuationSource =
  | "sector-peer-median"
  | "no-asset-pe"
  | "insufficient-peers"
  | "no-sector";

export interface SignalComponentBreakdown {
  momentum: { score: number; roc20: number | null; smaCrossover: number | null };
  valuation: {
    score: number;
    trailingPe: number | null;
    medianPe: number | null;
    source: ValuationSource;
    sector: string | null;
    peerCount: number;
  };
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

export class SignalSnapshot {
  @ApiProperty()
  id: string;

  asset: Asset;

  assetId: string;

  @ApiProperty({ description: "Trading date the snapshot represents", example: "2026-05-12" })
  snapshotDate: string;

  @ApiProperty({ description: "Momentum score 0-100" })
  momentumScore: string;

  @ApiProperty({ description: "Valuation score 0-100 (higher = cheaper vs history)" })
  valuationScore: string;

  @ApiProperty({ description: "News sentiment 0-100 (stubbed at 50 until Phase 8)" })
  newsSentimentScore: string;

  @ApiProperty({ description: "Sector-ETF 20d trend score 0-100" })
  sectorTrendScore: string;

  @ApiProperty({ description: "Drawdown-risk score 0-100 (higher = more downside risk)" })
  drawdownRiskScore: string;

  @ApiProperty({ description: "Aggregated opportunity score 0-100" })
  opportunityScore: string;

  @ApiProperty({ description: "Aggregated risk score 0-100" })
  riskScore: string;

  @ApiProperty({ description: "Confidence score 0-100 (drops when input dimensions are missing)" })
  confidenceScore: string;

  @ApiProperty({ description: "Every input value used so the score can be re-audited later" })
  componentBreakdownJson: SignalComponentBreakdown;

  @ApiProperty({ description: "Market-regime classification (Phase 12+); 'unknown' until then" })
  marketRegime: string;

  @ApiProperty()
  createdAt: Date;
}
