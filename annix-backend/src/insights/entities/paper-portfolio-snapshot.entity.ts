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
import { PaperPortfolio } from "./paper-portfolio.entity";

@Entity({ name: "insights_paper_portfolio_snapshots" })
@Index("UQ_insights_paper_portfolio_snapshots_portfolio_date", ["portfolioId", "snapshotDate"], {
  unique: true,
})
export class PaperPortfolioSnapshot {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(
    () => PaperPortfolio,
    (p) => p.snapshots,
    { onDelete: "CASCADE", eager: false, nullable: false },
  )
  @JoinColumn({ name: "portfolio_id" })
  portfolio: PaperPortfolio;

  @Column({ name: "portfolio_id" })
  portfolioId: string;

  @ApiProperty()
  @Column({ type: "date", name: "snapshot_date" })
  snapshotDate: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "total_value" })
  totalValue: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "cash_balance" })
  cashBalance: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "invested_value" })
  investedValue: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 9,
    scale: 4,
    name: "daily_return_percent",
    default: 0,
  })
  dailyReturnPercent: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 9,
    scale: 4,
    name: "total_return_percent",
    default: 0,
  })
  totalReturnPercent: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 9,
    scale: 4,
    name: "max_drawdown_percent",
    default: 0,
  })
  maxDrawdownPercent: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 9,
    scale: 4,
    name: "volatility_score",
    default: 0,
  })
  volatilityScore: string;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
