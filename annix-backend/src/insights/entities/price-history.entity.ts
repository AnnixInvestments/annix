import { ApiProperty } from "@nestjs/swagger";
import { Asset } from "./asset.entity";

export class PriceHistory {
  @ApiProperty()
  id: string;

  asset: Asset;

  assetId: string;

  @ApiProperty({ description: "Trading date (UTC)", example: "2026-05-09" })
  date: string;

  @ApiProperty()
  open: string;

  @ApiProperty()
  high: string;

  @ApiProperty()
  low: string;

  @ApiProperty()
  close: string;

  @ApiProperty({ description: "Adjusted close (dividends + splits applied)", required: false })
  adjClose: string | null;

  @ApiProperty({ description: "Trading volume", required: false })
  volume: string | null;

  createdAt: Date;
}
