import { ApiProperty } from "@nestjs/swagger";
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

export class Asset {
  @ApiProperty({ description: "Primary key" })
  id: string;

  @ApiProperty({ description: "Yahoo Finance symbol (e.g. AGL.JO, SPY, ^J200)" })
  symbol: string;

  @ApiProperty({ description: "Display name (e.g. Anglo American)" })
  name: string;

  @ApiProperty({ description: "Listing exchange" })
  exchange: InsightsExchange;

  @ApiProperty({ description: "Trading currency" })
  currency: InsightsCurrency;

  @ApiProperty({ description: "Asset type for engine routing" })
  assetType: InsightsAssetType;

  @ApiProperty({ description: "Sector (free-form, nullable)", required: false })
  sector: string | null;

  @ApiProperty({ description: "Whether the asset is currently tracked" })
  isActive: boolean;

  @ApiProperty({
    description: "Trailing twelve-month P/E ratio from Yahoo summaryDetail (null when N/A)",
    required: false,
  })
  trailingPe: string | null;

  @ApiProperty({
    description: "Timestamp of the last trailingPe refresh (null when never fetched)",
    required: false,
  })
  peUpdatedAt: Date | null;

  @ApiProperty({ description: "Creation timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Last update timestamp" })
  updatedAt: Date;

  watchlistItems: WatchlistItem[];
}
