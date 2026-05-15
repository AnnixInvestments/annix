import { ApiProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export interface MacroBreakdown {
  [key: string]: { count: number; meanSentiment: number };
}

@Entity({ name: "insights_macro_sentiment_snapshots" })
@Index("UQ_insights_macro_sentiment_snapshots_date", ["snapshotDate"], { unique: true })
export class MacroSentimentSnapshot {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "SAST trading date the snapshot represents" })
  @Column({ type: "date", name: "snapshot_date" })
  snapshotDate: string;

  @ApiProperty({ description: "Weighted average sentiment across last 48h, -1 to +1" })
  @Column({ type: "numeric", precision: 6, scale: 4, name: "overall_score", default: 0 })
  overallScore: string;

  @ApiProperty({ description: "Number of articles contributing to the score" })
  @Column({ type: "integer", name: "article_count", default: 0 })
  articleCount: number;

  @ApiProperty({ description: "Number of high-impact articles in the window" })
  @Column({ type: "integer", name: "high_impact_count", default: 0 })
  highImpactCount: number;

  @ApiProperty({
    description: "Per-sector article count + mean sentiment (Gemini affectedSectors field)",
  })
  @Column({ type: "jsonb", name: "sector_breakdown" })
  sectorBreakdown: MacroBreakdown;

  @ApiProperty({
    description: "Per-commodity article count + mean sentiment (Gemini affectedCommodities field)",
  })
  @Column({ type: "jsonb", name: "commodity_breakdown" })
  commodityBreakdown: MacroBreakdown;

  @ApiProperty()
  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
