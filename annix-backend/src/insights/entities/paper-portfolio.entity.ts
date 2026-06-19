import { ApiProperty } from "@nestjs/swagger";
import { PaperHolding } from "./paper-holding.entity";
import { PaperPortfolioSnapshot } from "./paper-portfolio-snapshot.entity";
import { PaperTrade } from "./paper-trade.entity";

export type PaperPortfolioSlug =
  | "benchmark-spy"
  | "benchmark-jse40"
  | "signal-conservative"
  | "signal-balanced"
  | "signal-commodity-tilt"
  | "signal-very-high-risk"
  | "nix-pure"
  | "nix-hybrid"
  | "nix-picker";

export type RiskProfile =
  | "buy-and-hold"
  | "conservative"
  | "balanced"
  | "commodity-tilt"
  | "very-high-risk";

export type ExecutorStrategy = "buy-and-hold" | "rules" | "ai-pure" | "ai-override" | "ai-picker";

export interface AllocationRules {
  maxPositions: number | null;
  maxPercentPerPosition: number | null;
  maxPercentPerSector: number | null;
  cashFloorPercent: number;
  confidenceFloor: number;
  sectorTilt?: { sectors: string[]; bonus: number };
  preferLeveragedEtfs?: boolean;
  fixedHolding?: { symbol: string };
}

export class PaperPortfolio {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "Stable identifier used in URLs and seeds" })
  slug: PaperPortfolioSlug;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  startingCapital: string;

  @ApiProperty()
  monthlyContribution: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  riskProfile: RiskProfile;

  @ApiProperty({
    description:
      "Which executor handles trade decisions. 'buy-and-hold' routes to BenchmarkExecutionService; 'rules' routes to the deterministic rules engine; 'ai-pure', 'ai-override', 'ai-picker' route to AiExecutorService in different modes.",
  })
  executorStrategy: ExecutorStrategy;

  @ApiProperty()
  currentCashBalance: string;

  @ApiProperty()
  currentPortfolioValue: string;

  @ApiProperty({ description: "Allocation rules JSON — see AllocationRules type" })
  allocationRulesJson: AllocationRules;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({
    description: "Auto-execution paused via the admin toggle (Phase 6 onwards).",
  })
  isPaused: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Result of the most recent rules-engine evaluation (decisions + skip reasons).",
  })
  lastEvaluationJson: Record<string, unknown> | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  holdings: PaperHolding[];

  trades: PaperTrade[];

  snapshots: PaperPortfolioSnapshot[];
}
