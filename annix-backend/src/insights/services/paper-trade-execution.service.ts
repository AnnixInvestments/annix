import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import { type NewsProvenance } from "../entities/paper-trade.entity";
import { PaperHoldingRepository } from "../repositories/paper-holding.repository";
import { PaperPortfolioRepository } from "../repositories/paper-portfolio.repository";
import { PaperTradeRepository } from "../repositories/paper-trade.repository";
import { AiExecutorService } from "./ai-executor.service";
import {
  AllocationRulesEngineService,
  type BuyDecision,
  type Decision,
  type SellDecision,
} from "./allocation-rules-engine.service";

export interface ExecutionResult {
  portfolioSlug: string;
  buysExecuted: number;
  sellsExecuted: number;
  cashDeployed: number;
  cashRaised: number;
  skipped: boolean;
  skipReason: string | null;
}

export interface TradeDecisionRepositories {
  txRunner: TransactionRunner;
  portfolioRepo: PaperPortfolioRepository;
  holdingRepo: PaperHoldingRepository;
  tradeRepo: PaperTradeRepository;
}

const METRIC_CATEGORY = "insights-portfolio-exec";
const BYTES_PER_TRADE_ROW = 400;

@Injectable()
export class PaperTradeExecutionService {
  private readonly logger = new Logger(PaperTradeExecutionService.name);

  constructor(
    private readonly portfolioRepo: PaperPortfolioRepository,
    private readonly holdingRepo: PaperHoldingRepository,
    private readonly tradeRepo: PaperTradeRepository,
    private readonly txRunner: TransactionRunner,
    private readonly rulesEngine: AllocationRulesEngineService,
    private readonly metrics: ExtractionMetricService,
    @Inject(forwardRef(() => AiExecutorService))
    private readonly aiExecutor: AiExecutorService,
  ) {}

  tradeDecisionRepositories(): TradeDecisionRepositories {
    return {
      txRunner: this.txRunner,
      portfolioRepo: this.portfolioRepo,
      holdingRepo: this.holdingRepo,
      tradeRepo: this.tradeRepo,
    };
  }

  async executeAll(): Promise<ExecutionResult[]> {
    const portfolios = await this.portfolioRepo.findActive();
    const results: ExecutionResult[] = [];
    for (const portfolio of portfolios) {
      const strategy = portfolio.executorStrategy;
      if (strategy === "buy-and-hold") continue;
      try {
        if (strategy === "rules") {
          results.push(await this.executeOne(portfolio));
        } else {
          results.push(await this.aiExecutor.executeOne(portfolio));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Execution crashed for ${portfolio.slug}: ${message}`);
        results.push({
          portfolioSlug: portfolio.slug,
          buysExecuted: 0,
          sellsExecuted: 0,
          cashDeployed: 0,
          cashRaised: 0,
          skipped: true,
          skipReason: `crashed: ${message}`,
        });
      }
    }
    return results;
  }

  async executeOne(portfolio: PaperPortfolio): Promise<ExecutionResult> {
    if (portfolio.isPaused) {
      this.logger.log(`Skipping ${portfolio.slug}: paused`);
      return {
        portfolioSlug: portfolio.slug,
        buysExecuted: 0,
        sellsExecuted: 0,
        cashDeployed: 0,
        cashRaised: 0,
        skipped: true,
        skipReason: "portfolio paused",
      };
    }

    return this.metrics.time(
      METRIC_CATEGORY,
      portfolio.slug,
      async () => {
        const decisions = await this.rulesEngine.evaluateOne(portfolio);
        if (decisions.decisions.length === 0) {
          return {
            portfolioSlug: portfolio.slug,
            buysExecuted: 0,
            sellsExecuted: 0,
            cashDeployed: 0,
            cashRaised: 0,
            skipped: false,
            skipReason: null,
          };
        }
        return applyTradeDecisions(
          this.tradeDecisionRepositories(),
          portfolio,
          decisions.decisions,
          this.logger,
        );
      },
      (result) => (result.buysExecuted + result.sellsExecuted) * BYTES_PER_TRADE_ROW,
    );
  }
}

export async function applyTradeDecisions(
  repositories: TradeDecisionRepositories,
  portfolio: PaperPortfolio,
  decisions: Decision[],
  logger: Logger,
): Promise<ExecutionResult> {
  const sortedSellsFirst = [...decisions].sort((a, b) => {
    if (a.action === b.action) return 0;
    return a.action === "sell" ? -1 : 1;
  });

  let buysExecuted = 0;
  let sellsExecuted = 0;
  let cashDeployed = 0;
  let cashRaised = 0;

  await repositories.txRunner.run(async (ctx) => {
    const portfolioRepo = repositories.portfolioRepo.withTransaction(ctx);
    const holdingRepo = repositories.holdingRepo.withTransaction(ctx);
    const tradeRepo = repositories.tradeRepo.withTransaction(ctx);

    const fresh = await portfolioRepo.findByIdOrFail(portfolio.id);
    let cashBalance = Number(fresh.currentCashBalance);

    for (const decision of sortedSellsFirst) {
      if (decision.action === "sell") {
        const applied = await applySell(decision, holdingRepo, tradeRepo);
        if (applied) {
          cashBalance += decision.estimatedTradeValue;
          cashRaised += decision.estimatedTradeValue;
          sellsExecuted += 1;
        }
      } else {
        const cost = decision.estimatedTradeValue;
        if (cashBalance < cost) {
          logger.warn(
            `${decision.portfolioSlug}: insufficient cash to buy ${decision.symbol} (need ${cost.toFixed(2)}, have ${cashBalance.toFixed(2)}). Skipping.`,
          );
          continue;
        }
        await applyBuy(decision, holdingRepo, tradeRepo);
        cashBalance -= cost;
        cashDeployed += cost;
        buysExecuted += 1;
      }
    }

    await portfolioRepo.updateById(portfolio.id, {
      currentCashBalance: cashBalance.toFixed(2),
    });
  });

  return {
    portfolioSlug: portfolio.slug,
    buysExecuted,
    sellsExecuted,
    cashDeployed,
    cashRaised,
    skipped: false,
    skipReason: null,
  };
}

async function applySell(
  decision: SellDecision,
  holdingRepo: PaperHoldingRepository,
  tradeRepo: PaperTradeRepository,
): Promise<boolean> {
  const holding = await holdingRepo.findById(decision.holdingId);
  if (!holding) return false;
  const heldQty = Number(holding.quantity);
  const remainingQty = heldQty - decision.qty;
  if (remainingQty > 0) {
    const avg = Number(holding.averageBuyPrice);
    const newMarketValue = remainingQty * decision.estimatedPrice;
    const newUnrealised = newMarketValue - remainingQty * avg;
    const newUnrealisedPct = avg > 0 ? (newUnrealised / (remainingQty * avg)) * 100 : 0;
    await holdingRepo.updateById(holding.id, {
      quantity: remainingQty.toString(),
      currentPrice: decision.estimatedPrice.toFixed(6),
      marketValue: newMarketValue.toFixed(2),
      unrealisedGainLoss: newUnrealised.toFixed(2),
      unrealisedGainLossPercent: newUnrealisedPct.toFixed(4),
    });
  } else {
    await holdingRepo.deleteById(holding.id);
  }
  await tradeRepo.create({
    portfolioId: decision.portfolioId,
    assetId: decision.assetId,
    action: "sell",
    quantity: decision.qty.toString(),
    price: decision.estimatedPrice.toFixed(6),
    tradeValue: decision.estimatedTradeValue.toFixed(2),
    fees: "0",
    appReasoning: decision.reasoning,
    opportunityScore: decision.opportunityScore.toFixed(2),
    riskScore: decision.riskScore.toFixed(2),
    confidenceScore: decision.confidenceScore.toFixed(2),
    marketRegime: null,
    signalSnapshot: decision.signalSnapshotId
      ? { signalSnapshotId: decision.signalSnapshotId, reasonCode: decision.reasonCode }
      : null,
    relatedNewsIds: newsIds(decision.newsConsidered),
    newsConsidered: decision.newsConsidered.length > 0 ? decision.newsConsidered : null,
  });
  return true;
}

async function applyBuy(
  decision: BuyDecision,
  holdingRepo: PaperHoldingRepository,
  tradeRepo: PaperTradeRepository,
): Promise<void> {
  const existing = await holdingRepo.findByPortfolioAndAsset(
    decision.portfolioId,
    decision.assetId,
  );
  if (existing) {
    const existingQty = Number(existing.quantity);
    const existingAvg = Number(existing.averageBuyPrice);
    const newQty = existingQty + decision.qty;
    const newAvg = (existingQty * existingAvg + decision.estimatedTradeValue) / newQty;
    const newMarketValue = newQty * decision.estimatedPrice;
    const newUnrealised = newMarketValue - newQty * newAvg;
    const newUnrealisedPct = newAvg > 0 ? (newUnrealised / (newQty * newAvg)) * 100 : 0;
    await holdingRepo.updateById(existing.id, {
      quantity: newQty.toString(),
      averageBuyPrice: newAvg.toFixed(6),
      currentPrice: decision.estimatedPrice.toFixed(6),
      marketValue: newMarketValue.toFixed(2),
      unrealisedGainLoss: newUnrealised.toFixed(2),
      unrealisedGainLossPercent: newUnrealisedPct.toFixed(4),
    });
  } else {
    await holdingRepo.create({
      portfolioId: decision.portfolioId,
      assetId: decision.assetId,
      quantity: decision.qty.toString(),
      averageBuyPrice: decision.estimatedPrice.toFixed(6),
      currentPrice: decision.estimatedPrice.toFixed(6),
      marketValue: decision.estimatedTradeValue.toFixed(2),
      unrealisedGainLoss: "0",
      unrealisedGainLossPercent: "0",
    });
  }

  await tradeRepo.create({
    portfolioId: decision.portfolioId,
    assetId: decision.assetId,
    action: "buy",
    quantity: decision.qty.toString(),
    price: decision.estimatedPrice.toFixed(6),
    tradeValue: decision.estimatedTradeValue.toFixed(2),
    fees: "0",
    appReasoning: decision.reasoning,
    opportunityScore: decision.opportunityScore.toFixed(2),
    riskScore: decision.riskScore.toFixed(2),
    confidenceScore: decision.confidenceScore.toFixed(2),
    marketRegime: null,
    signalSnapshot: {
      signalSnapshotId: decision.signalSnapshotId,
      signalSnapshotDate: decision.signalSnapshotDate,
      breakdown: decision.signalBreakdown,
      adjustedScore: decision.adjustedScore,
    },
    relatedNewsIds: newsIds(decision.newsConsidered),
    newsConsidered: decision.newsConsidered.length > 0 ? decision.newsConsidered : null,
  });
}

function newsIds(provenance: NewsProvenance[]): string[] | null {
  if (provenance.length === 0) return null;
  return provenance.map((p) => p.id);
}

export type { Decision } from "./allocation-rules-engine.service";
