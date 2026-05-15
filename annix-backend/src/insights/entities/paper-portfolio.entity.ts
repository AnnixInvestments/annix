import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PaperHolding } from "./paper-holding.entity";
import { PaperPortfolioSnapshot } from "./paper-portfolio-snapshot.entity";
import { PaperTrade } from "./paper-trade.entity";

export type PaperPortfolioSlug =
  | "benchmark-spy"
  | "benchmark-jse40"
  | "signal-conservative"
  | "signal-balanced"
  | "signal-commodity-tilt"
  | "signal-very-high-risk";

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

@Entity({ name: "insights_paper_portfolios" })
export class PaperPortfolio {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "Stable identifier used in URLs and seeds" })
  @Index({ unique: true })
  @Column({ type: "varchar", length: 64 })
  slug: PaperPortfolioSlug;

  @ApiProperty()
  @Column({ type: "varchar", length: 128, name: "display_name" })
  displayName: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "starting_capital" })
  startingCapital: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 18,
    scale: 2,
    default: 5000,
    name: "monthly_contribution",
  })
  monthlyContribution: string;

  @ApiProperty()
  @Column({ type: "varchar", length: 8, default: "ZAR" })
  currency: string;

  @ApiProperty()
  @Column({ type: "varchar", length: 32, name: "risk_profile" })
  riskProfile: RiskProfile;

  @ApiProperty({
    description:
      "Which executor handles trade decisions. 'buy-and-hold' routes to BenchmarkExecutionService; 'rules' routes to the deterministic rules engine; 'ai-pure', 'ai-override', 'ai-picker' route to AiExecutorService in different modes.",
  })
  @Column({
    type: "varchar",
    length: 32,
    name: "executor_strategy",
    default: "rules",
  })
  executorStrategy: ExecutorStrategy;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "current_cash_balance" })
  currentCashBalance: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 18,
    scale: 2,
    name: "current_portfolio_value",
    default: 0,
  })
  currentPortfolioValue: string;

  @ApiProperty({ description: "Allocation rules JSON — see AllocationRules type" })
  @Column({ type: "jsonb", name: "allocation_rules_json" })
  allocationRulesJson: AllocationRules;

  @ApiProperty()
  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive: boolean;

  @ApiProperty({
    description: "Auto-execution paused via the admin toggle (Phase 6 onwards).",
  })
  @Column({ type: "boolean", default: false, name: "is_paused" })
  isPaused: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => PaperHolding,
    (h) => h.portfolio,
  )
  holdings: PaperHolding[];

  @OneToMany(
    () => PaperTrade,
    (t) => t.portfolio,
  )
  trades: PaperTrade[];

  @OneToMany(
    () => PaperPortfolioSnapshot,
    (s) => s.portfolio,
  )
  snapshots: PaperPortfolioSnapshot[];
}
