import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isString } from "es-toolkit/compat";
import { In, Repository } from "typeorm";
import { daysBetween, now, nowISO } from "../../lib/datetime";
import { Asset } from "../entities/asset.entity";
import { NewsItem } from "../entities/news-item.entity";
import { PaperHolding } from "../entities/paper-holding.entity";
import {
  type AllocationRules,
  PaperPortfolio,
  type PaperPortfolioSlug,
} from "../entities/paper-portfolio.entity";
import type { NewsProvenance } from "../entities/paper-trade.entity";
import { PaperTrade } from "../entities/paper-trade.entity";
import { PriceHistory } from "../entities/price-history.entity";
import { type SignalComponentBreakdown, SignalSnapshot } from "../entities/signal-snapshot.entity";
import { WatchlistItem } from "../entities/watchlist-item.entity";
import { dedupeProvenance, toNewsProvenance } from "./news-provenance";

export interface BuyDecision {
  action: "buy";
  portfolioId: string;
  portfolioSlug: PaperPortfolioSlug;
  assetId: string;
  symbol: string;
  assetName: string;
  qty: number;
  estimatedPrice: number;
  estimatedTradeValue: number;
  signalSnapshotId: string;
  signalSnapshotDate: string;
  signalBreakdown: SignalComponentBreakdown;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  adjustedScore: number;
  reasoning: string;
  ruleEvaluationTrace: string;
  newsConsidered: NewsProvenance[];
}

export interface SellDecision {
  action: "sell";
  portfolioId: string;
  portfolioSlug: PaperPortfolioSlug;
  holdingId: string;
  assetId: string;
  symbol: string;
  assetName: string;
  qty: number;
  estimatedPrice: number;
  estimatedTradeValue: number;
  signalSnapshotId: string | null;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  reasonCode: "confidence-dropped" | "stop-loss";
  reasoning: string;
  ruleEvaluationTrace: string;
  newsConsidered: NewsProvenance[];
}

export type Decision = BuyDecision | SellDecision;

export interface PortfolioDecisions {
  portfolioSlug: PaperPortfolioSlug;
  decisions: Decision[];
  skippedReasons: string[];
  evaluatedAt: string;
}

const STOP_LOSS_THRESHOLD_PCT = -20;
const MIN_BUY_VALUE = 100;
const MAX_PRICE_AGE_DAYS = 5;

interface PriceSnapshot {
  close: number;
  date: string;
}

@Injectable()
export class AllocationRulesEngineService {
  private readonly logger = new Logger(AllocationRulesEngineService.name);

  constructor(
    @InjectRepository(PaperPortfolio)
    private readonly portfolioRepo: Repository<PaperPortfolio>,
    @InjectRepository(PaperHolding) private readonly holdingRepo: Repository<PaperHolding>,
    @InjectRepository(PaperTrade) private readonly tradeRepo: Repository<PaperTrade>,
    @InjectRepository(WatchlistItem)
    private readonly watchlistRepo: Repository<WatchlistItem>,
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(PriceHistory) private readonly historyRepo: Repository<PriceHistory>,
    @InjectRepository(SignalSnapshot)
    private readonly signalRepo: Repository<SignalSnapshot>,
    @InjectRepository(NewsItem) private readonly newsRepo: Repository<NewsItem>,
  ) {}

  async evaluateOne(portfolio: PaperPortfolio): Promise<PortfolioDecisions> {
    const rules = portfolio.allocationRulesJson;
    const decisions: Decision[] = [];
    const skipped: string[] = [];

    if (rules.fixedHolding) {
      skipped.push("benchmark portfolio — driven by BenchmarkExecutionService, not signals");
      return {
        portfolioSlug: portfolio.slug,
        decisions,
        skippedReasons: skipped,
        evaluatedAt: nowIso(),
      };
    }

    const holdings = await this.holdingRepo.find({
      where: { portfolioId: portfolio.id },
      relations: { asset: true },
    });

    const watchlist = await this.watchlistRepo.find({
      relations: { asset: true },
    });

    const candidateAssets = watchlist.map((w) => w.asset);
    const allAssetIds = [
      ...new Set([...holdings.map((h) => h.assetId), ...candidateAssets.map((a) => a.id)]),
    ];

    const latestPrices = await this.latestPrices(allAssetIds);
    const latestSignals = await this.latestSignals(allAssetIds);
    const newsMap = await this.buildNewsMap(Array.from(latestSignals.values()));

    const cashBalance = Number(portfolio.currentCashBalance);
    const investedValue = Number(portfolio.currentPortfolioValue);
    const totalPortfolioValue = cashBalance + investedValue;

    let simulatedCash = cashBalance;
    const heldAssetIds = new Set(holdings.map((h) => h.assetId));
    const sectorExposure = new Map<string, number>();
    for (const holding of holdings) {
      const sector = holding.asset.sector ?? "(unknown)";
      const value = Number(holding.marketValue);
      sectorExposure.set(sector, (sectorExposure.get(sector) ?? 0) + value);
    }

    const todayIso = nowIsoDate();
    for (const holding of holdings) {
      const signal = latestSignals.get(holding.assetId);
      const priceSnapshot = latestPrices.get(holding.assetId);
      if (!signal || !priceSnapshot) {
        const missingSignal = !signal;
        const missingPrice = !priceSnapshot;
        skipped.push(
          `Hold ${holding.asset.symbol}: missing ${missingSignal ? "signal" : ""}${missingSignal && missingPrice ? " + " : ""}${missingPrice ? "price" : ""}`,
        );
        continue;
      }
      const staleness = daysBetweenIso(priceSnapshot.date, todayIso);
      if (staleness > MAX_PRICE_AGE_DAYS) {
        skipped.push(
          `Hold ${holding.asset.symbol}: latest price is ${staleness} days old (${priceSnapshot.date}); refusing to evaluate sell off stale data.`,
        );
        continue;
      }
      const sellDecision = await this.evaluateSell(
        portfolio,
        rules,
        holding,
        signal,
        priceSnapshot.close,
        newsMap,
      );
      if (sellDecision) {
        decisions.push(sellDecision);
        simulatedCash += sellDecision.estimatedTradeValue;
        heldAssetIds.delete(holding.assetId);
        const sector = holding.asset.sector ?? "(unknown)";
        sectorExposure.set(sector, (sectorExposure.get(sector) ?? 0) - Number(holding.marketValue));
      }
    }

    const cashFloor = (rules.cashFloorPercent / 100) * totalPortfolioValue;
    let deployableCash = Math.max(0, simulatedCash - cashFloor);

    const remainingHeldCount =
      holdings.length - decisions.filter((d) => d.action === "sell").length;
    const maxPositions = rules.maxPositions ?? Number.POSITIVE_INFINITY;
    const buyBudgetSlots = Math.max(0, maxPositions - remainingHeldCount);

    if (buyBudgetSlots === 0) {
      skipped.push("No buy slots remaining (maxPositions hit)");
    }

    const tiltSectors = new Set(rules.sectorTilt?.sectors ?? []);
    const tiltBonus = rules.sectorTilt?.bonus ?? 0;
    const preferLeveraged = rules.preferLeveragedEtfs === true;

    const buyCandidates = candidateAssets
      .filter((asset) => !heldAssetIds.has(asset.id))
      .map((asset) => {
        const signal = latestSignals.get(asset.id);
        const priceSnapshot = latestPrices.get(asset.id);
        if (!signal || !priceSnapshot) return null;
        const staleness = daysBetweenIso(priceSnapshot.date, todayIso);
        if (staleness > MAX_PRICE_AGE_DAYS) {
          skipped.push(
            `Buy ${asset.symbol}: latest price is ${staleness} days old (${priceSnapshot.date}); excluded from buy candidates.`,
          );
          return null;
        }
        const sectorMatch = asset.sector !== null && tiltSectors.has(asset.sector);
        const sectorBonus = sectorMatch ? tiltBonus : 0;
        const leverageBonus = preferLeveraged && asset.assetType === "leveraged_etf" ? 5 : 0;
        const adjustedScore =
          signal.opportunityScore - signal.riskScore * 0.5 + sectorBonus + leverageBonus;
        return {
          asset,
          signal,
          price: priceSnapshot.close,
          adjustedScore,
          sectorBonus,
          leverageBonus,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .filter((entry) => entry.signal.confidenceScore >= rules.confidenceFloor)
      .sort((a, b) => b.adjustedScore - a.adjustedScore);

    let buysGenerated = 0;
    for (const candidate of buyCandidates) {
      if (buysGenerated >= buyBudgetSlots) break;
      if (deployableCash < MIN_BUY_VALUE) break;

      const sector = candidate.asset.sector ?? "(unknown)";
      const currentSectorValue = sectorExposure.get(sector) ?? 0;
      const sectorCapValue =
        rules.maxPercentPerSector !== null
          ? (rules.maxPercentPerSector / 100) * totalPortfolioValue
          : Number.POSITIVE_INFINITY;
      const sectorRoom = sectorCapValue - currentSectorValue;
      if (sectorRoom <= MIN_BUY_VALUE) {
        skipped.push(
          `Buy ${candidate.asset.symbol}: sector cap hit (${sector} at ${currentSectorValue.toFixed(0)}, cap ${sectorCapValue.toFixed(0)})`,
        );
        continue;
      }

      const positionCapValue =
        rules.maxPercentPerPosition !== null
          ? (rules.maxPercentPerPosition / 100) * totalPortfolioValue
          : Number.POSITIVE_INFINITY;
      const targetValue = Math.min(deployableCash, positionCapValue, sectorRoom);
      const qty = Math.floor(targetValue / candidate.price);
      if (qty <= 0) continue;
      const tradeValue = qty * candidate.price;

      const positionPct = (tradeValue / totalPortfolioValue) * 100;
      const sectorPct = ((currentSectorValue + tradeValue) / totalPortfolioValue) * 100;
      const trace = [
        `confidence>=${rules.confidenceFloor} (got ${candidate.signal.confidenceScore.toFixed(0)})`,
        rules.maxPercentPerPosition !== null
          ? `position<=${rules.maxPercentPerPosition}% (got ${positionPct.toFixed(2)}%)`
          : "no position cap",
        rules.maxPercentPerSector !== null
          ? `sector<=${rules.maxPercentPerSector}% (got ${sectorPct.toFixed(2)}%)`
          : "no sector cap",
      ].join(" · ");

      const topComponents = topThreeComponents(candidate.signal.componentBreakdownJson);
      const reasoning = `BUY ${qty} ${candidate.asset.symbol} @ ${candidate.price.toFixed(2)}. opp=${candidate.signal.opportunityScore.toFixed(0)} risk=${candidate.signal.riskScore.toFixed(0)} conf=${candidate.signal.confidenceScore.toFixed(0)}. Top contributors: ${topComponents}. Allocation: ${positionPct.toFixed(2)}% of portfolio, ${sectorPct.toFixed(2)}% of ${sector}. Adj-score ${candidate.adjustedScore.toFixed(2)} (tilt+${candidate.sectorBonus}, lev+${candidate.leverageBonus}). Rule path: ${trace}.`;

      decisions.push({
        action: "buy",
        portfolioId: portfolio.id,
        portfolioSlug: portfolio.slug,
        assetId: candidate.asset.id,
        symbol: candidate.asset.symbol,
        assetName: candidate.asset.name,
        qty,
        estimatedPrice: candidate.price,
        estimatedTradeValue: tradeValue,
        signalSnapshotId: candidate.signal.id,
        signalSnapshotDate: candidate.signal.snapshotDate,
        signalBreakdown: candidate.signal.componentBreakdownJson,
        opportunityScore: candidate.signal.opportunityScore,
        riskScore: candidate.signal.riskScore,
        confidenceScore: candidate.signal.confidenceScore,
        adjustedScore: candidate.adjustedScore,
        reasoning,
        ruleEvaluationTrace: trace,
        newsConsidered: newsForSignal(candidate.signal, newsMap),
      });

      deployableCash -= tradeValue;
      sectorExposure.set(sector, currentSectorValue + tradeValue);
      buysGenerated += 1;
    }

    if (buyCandidates.length === 0 && remainingHeldCount === 0) {
      skipped.push("No buy candidates passed the confidence floor");
    }

    return {
      portfolioSlug: portfolio.slug,
      decisions,
      skippedReasons: skipped,
      evaluatedAt: nowIso(),
    };
  }

  async evaluateAll(): Promise<PortfolioDecisions[]> {
    const portfolios = await this.portfolioRepo.find({
      where: { isActive: true },
    });
    const results: PortfolioDecisions[] = [];
    for (const portfolio of portfolios) {
      if (portfolio.allocationRulesJson.fixedHolding) continue;
      try {
        results.push(await this.evaluateOne(portfolio));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Decisions evaluation failed for ${portfolio.slug}: ${message}`);
      }
    }
    return results;
  }

  private async evaluateSell(
    portfolio: PaperPortfolio,
    rules: AllocationRules,
    holding: PaperHolding,
    signal: SignalSummary,
    price: number,
    newsMap: Map<string, NewsProvenance>,
  ): Promise<SellDecision | null> {
    const qty = Number(holding.quantity);
    const tradeValue = qty * price;
    const avgBuy = Number(holding.averageBuyPrice);
    const plPct = avgBuy > 0 ? ((price - avgBuy) / avgBuy) * 100 : 0;

    const baseDecision = {
      action: "sell" as const,
      portfolioId: portfolio.id,
      portfolioSlug: portfolio.slug,
      holdingId: holding.id,
      assetId: holding.assetId,
      symbol: holding.asset.symbol,
      assetName: holding.asset.name,
      qty,
      estimatedPrice: price,
      estimatedTradeValue: tradeValue,
      signalSnapshotId: signal.id,
      opportunityScore: signal.opportunityScore,
      riskScore: signal.riskScore,
      confidenceScore: signal.confidenceScore,
      newsConsidered: newsForSignal(signal, newsMap),
    };

    if (signal.confidenceScore < rules.confidenceFloor) {
      const trace = `confidence ${signal.confidenceScore.toFixed(0)} < floor ${rules.confidenceFloor}`;
      const reasoning = `SELL ${qty} ${holding.asset.symbol} @ ${price.toFixed(2)}. P/L ${plPct >= 0 ? "+" : ""}${plPct.toFixed(2)}%. Signal confidence dropped (${trace}). Closing position.`;
      return {
        ...baseDecision,
        reasonCode: "confidence-dropped",
        ruleEvaluationTrace: trace,
        reasoning,
      };
    }

    const isVeryHighRisk = portfolio.slug === "signal-very-high-risk";
    if (!isVeryHighRisk && plPct <= STOP_LOSS_THRESHOLD_PCT) {
      const originalBuy = await this.tradeRepo.findOne({
        where: { portfolioId: portfolio.id, assetId: holding.assetId, action: "buy" },
        order: { executedAt: "ASC" },
      });
      const originalConfidence =
        originalBuy?.confidenceScore !== null && originalBuy?.confidenceScore !== undefined
          ? Number(originalBuy.confidenceScore)
          : null;
      const confidenceHasFallen =
        originalConfidence === null || signal.confidenceScore < originalConfidence;
      if (confidenceHasFallen) {
        const trace = `P/L ${plPct.toFixed(2)}% <= ${STOP_LOSS_THRESHOLD_PCT}% and confidence ${signal.confidenceScore.toFixed(0)} < original-buy confidence ${originalConfidence !== null ? originalConfidence.toFixed(0) : "n/a"}`;
        const reasoning = `SELL ${qty} ${holding.asset.symbol} @ ${price.toFixed(2)}. Stop-loss triggered: ${trace}. Closing position.`;
        return {
          ...baseDecision,
          reasonCode: "stop-loss",
          ruleEvaluationTrace: trace,
          reasoning,
        };
      }
    }

    return null;
  }

  private async latestPrices(assetIds: string[]): Promise<Map<string, PriceSnapshot>> {
    const map = new Map<string, PriceSnapshot>();
    if (assetIds.length === 0) return map;
    const rows = await this.historyRepo
      .createQueryBuilder("h")
      .select("h.asset_id", "asset_id")
      .addSelect("h.close", "close")
      .addSelect("h.date", "date")
      .distinctOn(["h.asset_id"])
      .where({ assetId: In(assetIds) })
      .orderBy("h.asset_id")
      .addOrderBy("h.date", "DESC")
      .getRawMany<{ asset_id: string; close: string; date: string | Date }>();
    for (const row of rows) {
      const date = isString(row.date) ? row.date.slice(0, 10) : row.date.toISOString().slice(0, 10);
      map.set(row.asset_id, { close: Number(row.close), date });
    }
    return map;
  }

  private async buildNewsMap(signals: SignalSummary[]): Promise<Map<string, NewsProvenance>> {
    const articleIds = new Set<string>();
    for (const signal of signals) {
      const ids = signal.componentBreakdownJson.newsSentiment.articleIds ?? [];
      for (const id of ids) articleIds.add(id);
    }
    const map = new Map<string, NewsProvenance>();
    if (articleIds.size === 0) return map;
    const rows = await this.newsRepo.find({
      where: { id: In(Array.from(articleIds)) },
    });
    for (const row of rows) {
      map.set(row.id, toNewsProvenance(row));
    }
    return map;
  }

  private async latestSignals(assetIds: string[]): Promise<Map<string, SignalSummary>> {
    const map = new Map<string, SignalSummary>();
    if (assetIds.length === 0) return map;
    const rows = await this.signalRepo
      .createQueryBuilder("s")
      .where({ assetId: In(assetIds) })
      .orderBy("s.asset_id")
      .addOrderBy("s.snapshot_date", "DESC")
      .getMany();
    for (const row of rows) {
      if (map.has(row.assetId)) continue;
      map.set(row.assetId, {
        id: row.id,
        assetId: row.assetId,
        snapshotDate: isString(row.snapshotDate) ? row.snapshotDate.slice(0, 10) : row.snapshotDate,
        opportunityScore: Number(row.opportunityScore),
        riskScore: Number(row.riskScore),
        confidenceScore: Number(row.confidenceScore),
        componentBreakdownJson: row.componentBreakdownJson,
      });
    }
    return map;
  }
}

interface SignalSummary {
  id: string;
  assetId: string;
  snapshotDate: string;
  opportunityScore: number;
  riskScore: number;
  confidenceScore: number;
  componentBreakdownJson: SignalComponentBreakdown;
}

function newsForSignal(
  signal: SignalSummary,
  newsMap: Map<string, NewsProvenance>,
): NewsProvenance[] {
  const ids = signal.componentBreakdownJson.newsSentiment.articleIds ?? [];
  const rows: NewsProvenance[] = [];
  for (const id of ids) {
    const entry = newsMap.get(id);
    if (entry !== undefined) rows.push(entry);
  }
  return dedupeProvenance(rows);
}

function topThreeComponents(breakdown: SignalComponentBreakdown): string {
  const components: { name: string; score: number }[] = [
    { name: "momentum", score: breakdown.momentum.score },
    { name: "valuation", score: breakdown.valuation.score },
    { name: "news", score: breakdown.newsSentiment.score },
    { name: "sector", score: breakdown.sectorTrend.score },
    { name: "drawdown-clearance", score: 100 - breakdown.drawdownRisk.score },
  ];
  const sorted = [...components].sort((a, b) => b.score - a.score).slice(0, 3);
  return sorted.map((c) => `${c.name}:${c.score.toFixed(0)}`).join(", ");
}

function nowIso(): string {
  return nowISO();
}

function nowIsoDate(): string {
  return now().toISODate() ?? "";
}

function daysBetweenIso(earlierIso: string, laterIso: string): number {
  return Math.max(0, Math.round(daysBetween(earlierIso, laterIso)));
}
