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

@Entity({ name: "insights_price_history" })
@Index("UQ_insights_price_history_asset_date", ["assetId", "date"], { unique: true })
export class PriceHistory {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Asset, { onDelete: "CASCADE", eager: false, nullable: false })
  @JoinColumn({ name: "asset_id" })
  asset: Asset;

  @Column({ name: "asset_id" })
  assetId: string;

  @ApiProperty({ description: "Trading date (UTC)", example: "2026-05-09" })
  @Column({ type: "date" })
  date: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6 })
  open: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6 })
  high: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6 })
  low: string;

  @ApiProperty()
  @Column({ type: "numeric", precision: 18, scale: 6 })
  close: string;

  @ApiProperty({ description: "Adjusted close (dividends + splits applied)", required: false })
  @Column({ type: "numeric", precision: 18, scale: 6, nullable: true, name: "adj_close" })
  adjClose: string | null;

  @ApiProperty({ description: "Trading volume", required: false })
  @Column({ type: "bigint", nullable: true })
  volume: string | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
