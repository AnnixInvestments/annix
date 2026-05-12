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

@Entity({ name: "insights_watchlist_items" })
export class WatchlistItem {
  @ApiProperty({ description: "Primary key" })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "Asset this watchlist row points at", type: () => Asset })
  @ManyToOne(
    () => Asset,
    (asset) => asset.watchlistItems,
    { onDelete: "CASCADE", eager: false, nullable: false },
  )
  @JoinColumn({ name: "asset_id" })
  asset: Asset;

  @Index()
  @Column({ name: "asset_id" })
  assetId: string;

  @ApiProperty({ description: "Free-form notes", required: false })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ApiProperty({ description: "Why this asset is on the watchlist", required: false })
  @Column({ type: "text", nullable: true, name: "target_reason" })
  targetReason: string | null;

  @ApiProperty({ description: "When the asset was added to the watchlist" })
  @CreateDateColumn({ type: "timestamptz", name: "added_at" })
  addedAt: Date;
}
