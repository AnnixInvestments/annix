import { ApiProperty } from "@nestjs/swagger";
import { Asset } from "./asset.entity";

export class WatchlistItem {
  @ApiProperty({ description: "Primary key" })
  id: string;

  @ApiProperty({ description: "Asset this watchlist row points at", type: () => Asset })
  asset: Asset;

  assetId: string;

  @ApiProperty({ description: "Free-form notes", required: false })
  notes: string | null;

  @ApiProperty({ description: "Why this asset is on the watchlist", required: false })
  targetReason: string | null;

  @ApiProperty({ description: "When the asset was added to the watchlist" })
  addedAt: Date;
}
