import { ApiProperty } from "@nestjs/swagger";
import { Asset } from "./asset.entity";
import { PaperPortfolio } from "./paper-portfolio.entity";

export class PaperHolding {
  @ApiProperty()
  id: string;

  portfolio: PaperPortfolio;

  portfolioId: string;

  asset: Asset;

  assetId: string;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  averageBuyPrice: string;

  @ApiProperty()
  currentPrice: string;

  @ApiProperty()
  marketValue: string;

  @ApiProperty()
  unrealisedGainLoss: string;

  @ApiProperty()
  unrealisedGainLossPercent: string;

  @ApiProperty()
  firstAcquiredAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
