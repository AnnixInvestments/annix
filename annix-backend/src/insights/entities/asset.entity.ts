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
import { WatchlistItem } from "./watchlist-item.entity";

export type InsightsExchange =
  | "JSE"
  | "NYSE"
  | "NASDAQ"
  | "LSE"
  | "TSX"
  | "HKEX"
  | "TSE"
  | "SSE"
  | "ASX"
  | "COMMODITY"
  | "INDEX"
  | "FOREX";

export type InsightsAssetType =
  | "stock"
  | "etf"
  | "commodity"
  | "index"
  | "crypto"
  | "forex"
  | "leveraged_etf";

export type InsightsCurrency =
  | "ZAR"
  | "USD"
  | "GBP"
  | "EUR"
  | "JPY"
  | "CNY"
  | "AUD"
  | "CAD"
  | "HKD";

@Entity({ name: "insights_assets" })
export class Asset {
  @ApiProperty({ description: "Primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "Yahoo Finance symbol (e.g. AGL.JO, SPY, ^J200)" })
  @Index({ unique: true })
  @Column({ type: "varchar", length: 32 })
  symbol: string;

  @ApiProperty({ description: "Display name (e.g. Anglo American)" })
  @Column({ type: "varchar", length: 128 })
  name: string;

  @ApiProperty({ description: "Listing exchange" })
  @Column({ type: "varchar", length: 16 })
  exchange: InsightsExchange;

  @ApiProperty({ description: "Trading currency" })
  @Column({ type: "varchar", length: 8 })
  currency: InsightsCurrency;

  @ApiProperty({ description: "Asset type for engine routing" })
  @Column({ type: "varchar", length: 32, name: "asset_type" })
  assetType: InsightsAssetType;

  @ApiProperty({ description: "Sector (free-form, nullable)", required: false })
  @Column({ type: "varchar", length: 64, nullable: true })
  sector: string | null;

  @ApiProperty({ description: "Whether the asset is currently tracked" })
  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive: boolean;

  @ApiProperty({ description: "Creation timestamp" })
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  @OneToMany(
    () => WatchlistItem,
    (item) => item.asset,
  )
  watchlistItems: WatchlistItem[];
}
