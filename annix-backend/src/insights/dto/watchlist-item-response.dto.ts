import { ApiProperty } from "@nestjs/swagger";
import type {
  InsightsAssetType,
  InsightsCurrency,
  InsightsExchange,
} from "../entities/asset.entity";

export class WatchlistItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  exchange: InsightsExchange;

  @ApiProperty()
  currency: InsightsCurrency;

  @ApiProperty()
  assetType: InsightsAssetType;

  @ApiProperty({ required: false, nullable: true })
  sector: string | null;

  @ApiProperty({ required: false, nullable: true })
  notes: string | null;

  @ApiProperty({ required: false, nullable: true })
  targetReason: string | null;

  @ApiProperty()
  addedAt: string;
}
