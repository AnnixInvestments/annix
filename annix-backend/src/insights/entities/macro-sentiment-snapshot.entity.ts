import { ApiProperty } from "@nestjs/swagger";
export interface MacroBreakdown {
  [key: string]: { count: number; meanSentiment: number };
}

export class MacroSentimentSnapshot {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "SAST trading date the snapshot represents" })
  snapshotDate: string;

  @ApiProperty({ description: "Weighted average sentiment across last 48h, -1 to +1" })
  overallScore: string;

  @ApiProperty({ description: "Number of articles contributing to the score" })
  articleCount: number;

  @ApiProperty({ description: "Number of high-impact articles in the window" })
  highImpactCount: number;

  @ApiProperty({
    description: "Per-sector article count + mean sentiment (Gemini affectedSectors field)",
  })
  sectorBreakdown: MacroBreakdown;

  @ApiProperty({
    description: "Per-commodity article count + mean sentiment (Gemini affectedCommodities field)",
  })
  commodityBreakdown: MacroBreakdown;

  @ApiProperty()
  createdAt: Date;
}
