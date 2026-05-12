import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import type {
  InsightsAssetType,
  InsightsCurrency,
  InsightsExchange,
} from "../entities/asset.entity";

const EXCHANGES: InsightsExchange[] = [
  "JSE",
  "NYSE",
  "NASDAQ",
  "LSE",
  "TSX",
  "HKEX",
  "TSE",
  "SSE",
  "ASX",
  "COMMODITY",
  "INDEX",
  "FOREX",
];

const ASSET_TYPES: InsightsAssetType[] = [
  "stock",
  "etf",
  "commodity",
  "index",
  "crypto",
  "forex",
  "leveraged_etf",
];

const CURRENCIES: InsightsCurrency[] = [
  "ZAR",
  "USD",
  "GBP",
  "EUR",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "HKD",
];

export class AddWatchlistItemDto {
  @ApiProperty({ example: "AGL.JO", description: "Yahoo Finance symbol" })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  symbol: string;

  @ApiProperty({ example: "Anglo American" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name: string;

  @ApiProperty({ enum: EXCHANGES })
  @IsIn(EXCHANGES)
  exchange: InsightsExchange;

  @ApiProperty({ enum: CURRENCIES })
  @IsIn(CURRENCIES)
  currency: InsightsCurrency;

  @ApiProperty({ enum: ASSET_TYPES })
  @IsIn(ASSET_TYPES)
  assetType: InsightsAssetType;

  @ApiProperty({ required: false, example: "Diversified mining" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sector?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({ required: false, description: "Why this asset deserves attention" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  targetReason?: string;
}
