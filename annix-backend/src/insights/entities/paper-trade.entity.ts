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
import { PaperPortfolio } from "./paper-portfolio.entity";

export type PaperTradeAction = "buy" | "sell" | "rebalance" | "contribution";

@Entity({ name: "insights_paper_trades" })
@Index("IDX_insights_paper_trades_portfolio_executed_at", ["portfolioId", "executedAt"])
export class PaperTrade {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(
    () => PaperPortfolio,
    (p) => p.trades,
    { onDelete: "CASCADE", eager: false, nullable: false },
  )
  @JoinColumn({ name: "portfolio_id" })
  portfolio: PaperPortfolio;

  @Column({ name: "portfolio_id" })
  portfolioId: string;

  @ManyToOne(() => Asset, { onDelete: "RESTRICT", eager: false, nullable: true })
  @JoinColumn({ name: "asset_id" })
  asset: Asset | null;

  @Column({ name: "asset_id", nullable: true })
  assetId: string | null;

  @ApiProperty({ enum: ["buy", "sell", "rebalance", "contribution"] })
  @Column({ type: "varchar", length: 16 })
  action: PaperTradeAction;

  @ApiProperty()
  @Column({ type: "numeric", precision: 24, scale: 8, default: 0 })
  quantity: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6, default: 0 })
  price: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "trade_value", default: 0 })
  tradeValue: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, default: 0 })
  fees: string;

  @ApiProperty({ description: "Full reasoning at the time of execution — append-only audit." })
  @Column({ type: "text", name: "app_reasoning", default: "" })
  appReasoning: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    name: "opportunity_score",
  })
  opportunityScore: string | null;

  @ApiProperty()
  @Column({ type: "numeric", precision: 6, scale: 2, nullable: true, name: "risk_score" })
  riskScore: string | null;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 6,
    scale: 2,
    nullable: true,
    name: "confidence_score",
  })
  confidenceScore: string | null;

  @ApiProperty({ description: "Market regime classification (Phase 12+); nullable until then." })
  @Column({ type: "varchar", length: 64, nullable: true, name: "market_regime" })
  marketRegime: string | null;

  @ApiProperty({ description: "Every signal value at the moment of execution (Phase 5+)." })
  @Column({ type: "jsonb", nullable: true, name: "signal_snapshot" })
  signalSnapshot: Record<string, unknown> | null;

  @ApiProperty({ description: "News item IDs that influenced this trade (Phase 8+)." })
  @Column({ type: "simple-array", nullable: true, name: "related_news_ids" })
  relatedNewsIds: string[] | null;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "executed_at" })
  executedAt: Date;
}
