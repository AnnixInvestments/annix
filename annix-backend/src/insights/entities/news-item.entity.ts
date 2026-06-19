import { ApiProperty } from "@nestjs/swagger";
export type NewsExtractionStatus = "pending" | "extracted" | "failed" | "skipped";
export type NewsImpactLevel = "low" | "medium" | "high";
export type NewsFeedType = "per-asset" | "macro";

export class NewsItem {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "sha256(url + '|' + lower(title)) for dedup" })
  urlHash: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, description: "Yahoo publisher name" })
  source: string | null;

  @ApiProperty({ required: false, description: "Gemini-extracted event description" })
  summary: string | null;

  @ApiProperty({ required: false, type: [String] })
  relatedSymbols: string[] | null;

  @ApiProperty({ required: false, type: [String] })
  relatedThemes: string[] | null;

  @ApiProperty({ required: false, description: "Gemini sentiment, -1.000 to 1.000" })
  sentiment: string | null;

  @ApiProperty({ required: false })
  impactLevel: NewsImpactLevel | null;

  @ApiProperty({ required: false })
  shortTermImplication: string | null;

  @ApiProperty({ required: false })
  mediumTermImplication: string | null;

  @ApiProperty({ required: false, description: "Yahoo-reported publish time" })
  publishedAt: Date | null;

  @ApiProperty({ required: false, description: "When Gemini extraction completed" })
  extractedAt: Date | null;

  @ApiProperty()
  extractionStatus: NewsExtractionStatus;

  @ApiProperty({ required: false })
  extractionError: string | null;

  @ApiProperty({
    description:
      "'per-asset' = pulled by ticker search against a watchlist symbol; 'macro' = pulled by broad query for portfolio-wide context",
  })
  feedType: NewsFeedType;

  @ApiProperty({
    required: false,
    description: "For macro articles: which query brought this article in (e.g. 'oil price')",
  })
  macroQuery: string | null;

  createdAt: Date;

  updatedAt: Date;
}
