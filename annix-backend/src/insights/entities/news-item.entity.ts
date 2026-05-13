import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type NewsExtractionStatus = "pending" | "extracted" | "failed" | "skipped";
export type NewsImpactLevel = "low" | "medium" | "high";

@Entity({ name: "insights_news_items" })
@Index("UQ_insights_news_items_url_hash", ["urlHash"], { unique: true })
@Index("IDX_insights_news_items_published_at", ["publishedAt"])
@Index("IDX_insights_news_items_extraction_status", ["extractionStatus"])
export class NewsItem {
  @ApiProperty()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({ description: "sha256(url + '|' + lower(title)) for dedup" })
  @Column({ name: "url_hash", type: "varchar", length: 64 })
  urlHash: string;

  @ApiProperty()
  @Column({ type: "text" })
  url: string;

  @ApiProperty()
  @Column({ type: "text" })
  title: string;

  @ApiProperty({ required: false, description: "Yahoo publisher name" })
  @Column({ type: "text", nullable: true })
  source: string | null;

  @ApiProperty({ required: false, description: "Gemini-extracted event description" })
  @Column({ type: "text", nullable: true })
  summary: string | null;

  @ApiProperty({ required: false, type: [String] })
  @Column({ name: "related_symbols", type: "simple-array", nullable: true })
  relatedSymbols: string[] | null;

  @ApiProperty({ required: false, type: [String] })
  @Column({ name: "related_themes", type: "simple-array", nullable: true })
  relatedThemes: string[] | null;

  @ApiProperty({ required: false, description: "Gemini sentiment, -1.000 to 1.000" })
  @Column({ type: "decimal", precision: 4, scale: 3, nullable: true })
  sentiment: string | null;

  @ApiProperty({ required: false })
  @Column({ name: "impact_level", type: "varchar", length: 16, nullable: true })
  impactLevel: NewsImpactLevel | null;

  @ApiProperty({ required: false })
  @Column({ name: "short_term_implication", type: "text", nullable: true })
  shortTermImplication: string | null;

  @ApiProperty({ required: false })
  @Column({ name: "medium_term_implication", type: "text", nullable: true })
  mediumTermImplication: string | null;

  @ApiProperty({ required: false, description: "Yahoo-reported publish time" })
  @Column({ name: "published_at", type: "timestamptz", nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ required: false, description: "When Gemini extraction completed" })
  @Column({ name: "extracted_at", type: "timestamptz", nullable: true })
  extractedAt: Date | null;

  @ApiProperty()
  @Column({
    name: "extraction_status",
    type: "varchar",
    length: 16,
    default: "pending",
  })
  extractionStatus: NewsExtractionStatus;

  @ApiProperty({ required: false })
  @Column({ name: "extraction_error", type: "text", nullable: true })
  extractionError: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
