import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Asset } from "../entities/asset.entity";
import { PaperHolding } from "../entities/paper-holding.entity";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import { PaperTrade } from "../entities/paper-trade.entity";
import { PriceHistory } from "../entities/price-history.entity";

export interface BenchmarkExecutionResult {
  slug: string;
  symbol: string | null;
  status: "skipped-no-price" | "skipped-no-cash" | "executed";
  qtyBought: number;
  cashDeployed: number;
}

@Injectable()
export class BenchmarkExecutionService {
  private readonly logger = new Logger(BenchmarkExecutionService.name);

  constructor(
    @InjectRepository(PaperPortfolio)
    private readonly portfolioRepo: Repository<PaperPortfolio>,
    @InjectRepository(PaperHolding)
    private readonly holdingRepo: Repository<PaperHolding>,
    @InjectRepository(PaperTrade)
    private readonly tradeRepo: Repository<PaperTrade>,
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(PriceHistory)
    private readonly historyRepo: Repository<PriceHistory>,
  ) {}

  async runAll(): Promise<BenchmarkExecutionResult[]> {
    const portfolios = await this.portfolioRepo.find({
      where: { isActive: true, riskProfile: "buy-and-hold" },
    });
    const results: BenchmarkExecutionResult[] = [];
    for (const portfolio of portfolios) {
      try {
        const result = await this.executeOne(portfolio);
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Benchmark execution failed for ${portfolio.slug}: ${message}`);
        results.push({
          slug: portfolio.slug,
          symbol: null,
          status: "skipped-no-price",
          qtyBought: 0,
          cashDeployed: 0,
        });
      }
    }
    return results;
  }

  private async executeOne(portfolio: PaperPortfolio): Promise<BenchmarkExecutionResult> {
    const rules = portfolio.allocationRulesJson;
    const fixed = rules.fixedHolding;
    if (!fixed) {
      return {
        slug: portfolio.slug,
        symbol: null,
        status: "skipped-no-price",
        qtyBought: 0,
        cashDeployed: 0,
      };
    }

    const asset = await this.assetRepo.findOne({ where: { symbol: fixed.symbol } });
    if (!asset) {
      this.logger.warn(`Benchmark ${portfolio.slug}: asset ${fixed.symbol} not found.`);
      return {
        slug: portfolio.slug,
        symbol: fixed.symbol,
        status: "skipped-no-price",
        qtyBought: 0,
        cashDeployed: 0,
      };
    }

    const latest = await this.historyRepo.findOne({
      where: { assetId: asset.id },
      order: { date: "DESC" },
    });
    if (!latest) {
      this.logger.warn(
        `Benchmark ${portfolio.slug}: no price history for ${fixed.symbol} yet. Will retry on next cron.`,
      );
      return {
        slug: portfolio.slug,
        symbol: fixed.symbol,
        status: "skipped-no-price",
        qtyBought: 0,
        cashDeployed: 0,
      };
    }

    const closePrice = Number(latest.close);
    const cashBalance = Number(portfolio.currentCashBalance);
    if (closePrice <= 0 || cashBalance < closePrice) {
      return {
        slug: portfolio.slug,
        symbol: fixed.symbol,
        status: "skipped-no-cash",
        qtyBought: 0,
        cashDeployed: 0,
      };
    }

    const qty = Math.floor(cashBalance / closePrice);
    if (qty <= 0) {
      return {
        slug: portfolio.slug,
        symbol: fixed.symbol,
        status: "skipped-no-cash",
        qtyBought: 0,
        cashDeployed: 0,
      };
    }
    const cashDeployed = qty * closePrice;

    const existingHolding = await this.holdingRepo.findOne({
      where: { portfolioId: portfolio.id, assetId: asset.id },
    });

    if (existingHolding) {
      const existingQty = Number(existingHolding.quantity);
      const existingAvg = Number(existingHolding.averageBuyPrice);
      const newQty = existingQty + qty;
      const newAvg = (existingQty * existingAvg + cashDeployed) / newQty;
      const newMarketValue = newQty * closePrice;
      const newUnrealised = newMarketValue - newQty * newAvg;
      const newUnrealisedPct = (newUnrealised / (newQty * newAvg)) * 100;
      await this.holdingRepo.update(
        { id: existingHolding.id },
        {
          quantity: newQty.toString(),
          averageBuyPrice: newAvg.toFixed(6),
          currentPrice: closePrice.toFixed(6),
          marketValue: newMarketValue.toFixed(2),
          unrealisedGainLoss: newUnrealised.toFixed(2),
          unrealisedGainLossPercent: newUnrealisedPct.toFixed(4),
        },
      );
    } else {
      const holding = this.holdingRepo.create({
        portfolioId: portfolio.id,
        assetId: asset.id,
        quantity: qty.toString(),
        averageBuyPrice: closePrice.toFixed(6),
        currentPrice: closePrice.toFixed(6),
        marketValue: cashDeployed.toFixed(2),
        unrealisedGainLoss: "0",
        unrealisedGainLossPercent: "0",
      });
      await this.holdingRepo.save(holding);
    }

    const trade = this.tradeRepo.create({
      portfolioId: portfolio.id,
      assetId: asset.id,
      action: "buy",
      quantity: qty.toString(),
      price: closePrice.toFixed(6),
      tradeValue: cashDeployed.toFixed(2),
      fees: "0",
      appReasoning: `Buy-and-hold benchmark — automatic deployment of available cash into ${fixed.symbol} at ${latest.date} close ${closePrice}. ${qty} units bought, ${(cashBalance - cashDeployed).toFixed(2)} cash remainder.`,
    });
    await this.tradeRepo.save(trade);

    const newCash = cashBalance - cashDeployed;
    await this.portfolioRepo.update(
      { id: portfolio.id },
      { currentCashBalance: newCash.toFixed(2) },
    );

    return {
      slug: portfolio.slug,
      symbol: fixed.symbol,
      status: "executed",
      qtyBought: qty,
      cashDeployed,
    };
  }
}
