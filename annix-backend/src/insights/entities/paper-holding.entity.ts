import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Asset } from "./asset.entity";
import { PaperPortfolio } from "./paper-portfolio.entity";

@Entity({ name: "insights_paper_holdings" })
@Index("UQ_insights_paper_holdings_portfolio_asset", ["portfolioId", "assetId"], {
  unique: true,
})
export class PaperHolding {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(
    () => PaperPortfolio,
    (p) => p.holdings,
    { onDelete: "CASCADE", eager: false, nullable: false },
  )
  @JoinColumn({ name: "portfolio_id" })
  portfolio: PaperPortfolio;

  @Column({ name: "portfolio_id" })
  portfolioId: string;

  @ManyToOne(() => Asset, { onDelete: "RESTRICT", eager: false, nullable: false })
  @JoinColumn({ name: "asset_id" })
  asset: Asset;

  @Column({ name: "asset_id" })
  assetId: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 24, scale: 8 })
  quantity: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6, name: "average_buy_price" })
  averageBuyPrice: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6, name: "current_price", default: 0 })
  currentPrice: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 2, name: "market_value", default: 0 })
  marketValue: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 18,
    scale: 2,
    name: "unrealised_gain_loss",
    default: 0,
  })
  unrealisedGainLoss: string;

  @ApiProperty()
  @Column({
    type: "numeric",
    precision: 9,
    scale: 4,
    name: "unrealised_gain_loss_percent",
    default: 0,
  })
  unrealisedGainLossPercent: string;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "first_acquired_at" })
  firstAcquiredAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
