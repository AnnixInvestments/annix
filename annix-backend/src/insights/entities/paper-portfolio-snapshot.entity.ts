import { ApiProperty } from "@nestjs/swagger";
import { PaperPortfolio } from "./paper-portfolio.entity";

export class PaperPortfolioSnapshot {
  @ApiProperty()
  id: string;

  portfolio: PaperPortfolio;

  portfolioId: string;

  @ApiProperty()
  snapshotDate: string;

  @ApiProperty()
  totalValue: string;

  @ApiProperty()
  cashBalance: string;

  @ApiProperty()
  investedValue: string;

  @ApiProperty()
  dailyReturnPercent: string;

  @ApiProperty()
  totalReturnPercent: string;

  @ApiProperty()
  maxDrawdownPercent: string;

  @ApiProperty()
  volatilityScore: string;

  @ApiProperty()
  createdAt: Date;
}
