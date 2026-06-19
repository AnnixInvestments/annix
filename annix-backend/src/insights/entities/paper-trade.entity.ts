import { ApiProperty } from "@nestjs/swagger";
import { Asset } from "./asset.entity";
import { PaperPortfolio } from "./paper-portfolio.entity";

export type PaperTradeAction = "buy" | "sell" | "rebalance" | "contribution";

export interface NewsProvenance {
  id: string;
  title: string;
  url: string;
  source: string | null;
  publishedAt: string | null;
  sentiment: number | null;
  impactLevel: string | null;
  summary: string | null;
  feedType: string;
}

export class PaperTrade {
  @ApiProperty()
  id: string;

  portfolio: PaperPortfolio;

  portfolioId: string;

  asset: Asset | null;

  assetId: string | null;

  @ApiProperty({ enum: ["buy", "sell", "rebalance", "contribution"] })
  action: PaperTradeAction;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  price: string;

  @ApiProperty()
  tradeValue: string;

  @ApiProperty()
  fees: string;

  @ApiProperty({ description: "Full reasoning at the time of execution — append-only audit." })
  appReasoning: string;

  @ApiProperty()
  opportunityScore: string | null;

  @ApiProperty()
  riskScore: string | null;

  @ApiProperty()
  confidenceScore: string | null;

  @ApiProperty({ description: "Market regime classification (Phase 12+); nullable until then." })
  marketRegime: string | null;

  @ApiProperty({ description: "Every signal value at the moment of execution (Phase 5+)." })
  signalSnapshot: Record<string, unknown> | null;

  @ApiProperty({ description: "News item IDs that influenced this trade (Phase 8+)." })
  relatedNewsIds: string[] | null;

  @ApiProperty({
    description:
      "Frozen snapshot of every news article considered for this trade — title, url, sentiment etc. Self-contained so it survives the 90-day news-retention purge.",
  })
  newsConsidered: NewsProvenance[] | null;

  @ApiProperty()
  executedAt: Date;
}
