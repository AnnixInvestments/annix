import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { PaperHolding } from "../entities/paper-holding.entity";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import { PaperPortfolioSnapshot } from "../entities/paper-portfolio-snapshot.entity";
import { PriceHistory } from "../entities/price-history.entity";

export interface SnapshotResult {
  slug: string;
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  totalReturnPercent: number;
  maxDrawdownPercent: number;
  volatilityScore: number;
}

const ROLLING_DRAWDOWN_DAYS = 252;
const VOLATILITY_DAYS = 30;
const TRADING_DAYS_PER_YEAR = 252;

@Injectable()
export class PortfolioSnapshotService {
  private readonly logger = new Logger(PortfolioSnapshotService.name);

  constructor(
    @InjectRepository(PaperPortfolio)
    private readonly portfolioRepo: Repository<PaperPortfolio>,
    @InjectRepository(PaperHolding)
    private readonly holdingRepo: Repository<PaperHolding>,
    @InjectRepository(PaperPortfolioSnapshot)
    private readonly snapshotRepo: Repository<PaperPortfolioSnapshot>,
    @InjectRepository(PriceHistory)
    private readonly historyRepo: Repository<PriceHistory>,
  ) {}

  async captureForAll(): Promise<SnapshotResult[]> {
    const portfolios = await this.portfolioRepo.find({ where: { isActive: true } });
    const results: SnapshotResult[] = [];
    for (const portfolio of portfolios) {
      try {
        results.push(await this.captureForPortfolio(portfolio));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Snapshot failed for ${portfolio.slug}: ${message}`);
      }
    }
    return results;
  }

  async captureForPortfolio(portfolio: PaperPortfolio): Promise<SnapshotResult> {
    const investedValue = await this.markToMarket(portfolio);
    const cashBalance = Number(portfolio.currentCashBalance);
    const totalValue = cashBalance + investedValue;

    const startingCapital = Number(portfolio.startingCapital);
    const totalReturnPercent =
      startingCapital > 0 ? ((totalValue - startingCapital) / startingCapital) * 100 : 0;

    await this.portfolioRepo.update(
      { id: portfolio.id },
      { currentPortfolioValue: investedValue.toFixed(2) },
    );

    const snapshotDate = now().toISODate() ?? "";

    const previousSnapshot = await this.snapshotRepo.findOne({
      where: { portfolioId: portfolio.id },
      order: { snapshotDate: "DESC" },
    });

    const previousTotal = previousSnapshot ? Number(previousSnapshot.totalValue) : startingCapital;
    const dailyReturnPercent =
      previousTotal > 0 ? ((totalValue - previousTotal) / previousTotal) * 100 : 0;

    const maxDrawdownPercent = await this.computeRollingDrawdown(portfolio.id, totalValue);
    const volatilityScore = await this.computeAnnualisedVolatility(portfolio.id);

    const existing = await this.snapshotRepo.findOne({
      where: { portfolioId: portfolio.id, snapshotDate },
    });
    if (existing) {
      await this.snapshotRepo.delete({ id: existing.id });
    }

    await this.snapshotRepo.save(
      this.snapshotRepo.create({
        portfolioId: portfolio.id,
        snapshotDate,
        totalValue: totalValue.toFixed(2),
        cashBalance: cashBalance.toFixed(2),
        investedValue: investedValue.toFixed(2),
        dailyReturnPercent: dailyReturnPercent.toFixed(4),
        totalReturnPercent: totalReturnPercent.toFixed(4),
        maxDrawdownPercent: maxDrawdownPercent.toFixed(4),
        volatilityScore: volatilityScore.toFixed(4),
      }),
    );

    return {
      slug: portfolio.slug,
      totalValue,
      cashBalance,
      investedValue,
      totalReturnPercent,
      maxDrawdownPercent,
      volatilityScore,
    };
  }

  private async markToMarket(portfolio: PaperPortfolio): Promise<number> {
    const holdings = await this.holdingRepo.find({
      where: { portfolioId: portfolio.id },
    });
    let totalInvested = 0;
    for (const holding of holdings) {
      const latest = await this.historyRepo.findOne({
        where: { assetId: holding.assetId },
        order: { date: "DESC" },
      });
      if (!latest) {
        totalInvested += Number(holding.marketValue);
        continue;
      }
      const currentPrice = Number(latest.close);
      const qty = Number(holding.quantity);
      const avgBuy = Number(holding.averageBuyPrice);
      const marketValue = qty * currentPrice;
      const unrealised = marketValue - qty * avgBuy;
      const unrealisedPct = avgBuy > 0 ? (unrealised / (qty * avgBuy)) * 100 : 0;
      await this.holdingRepo.update(
        { id: holding.id },
        {
          currentPrice: currentPrice.toFixed(6),
          marketValue: marketValue.toFixed(2),
          unrealisedGainLoss: unrealised.toFixed(2),
          unrealisedGainLossPercent: unrealisedPct.toFixed(4),
        },
      );
      totalInvested += marketValue;
    }
    return totalInvested;
  }

  private async computeRollingDrawdown(portfolioId: string, currentTotal: number): Promise<number> {
    const recent = await this.snapshotRepo
      .createQueryBuilder("s")
      .select("s.total_value", "total_value")
      .where("s.portfolio_id = :portfolioId", { portfolioId })
      .orderBy("s.snapshot_date", "DESC")
      .limit(ROLLING_DRAWDOWN_DAYS)
      .getRawMany<{ total_value: string }>();
    const recentValues = recent.map((r) => Number(r.total_value));
    if (recentValues.length === 0) return 0;
    const allValues = [...recentValues, currentTotal];
    const peak = Math.max(...allValues);
    if (peak <= 0) return 0;
    const drawdown = ((peak - currentTotal) / peak) * 100;
    return Math.max(0, drawdown);
  }

  private async computeAnnualisedVolatility(portfolioId: string): Promise<number> {
    const recent = await this.snapshotRepo
      .createQueryBuilder("s")
      .select("s.daily_return_percent", "daily_return_percent")
      .where("s.portfolio_id = :portfolioId", { portfolioId })
      .orderBy("s.snapshot_date", "DESC")
      .limit(VOLATILITY_DAYS)
      .getRawMany<{ daily_return_percent: string }>();
    const returns = recent.map((r) => Number(r.daily_return_percent));
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
    const stdev = Math.sqrt(variance);
    return stdev * Math.sqrt(TRADING_DAYS_PER_YEAR);
  }
}
