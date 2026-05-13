import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { sectorTrendEtf } from "../config/sector-etf-map";
import { Asset } from "../entities/asset.entity";
import { NewsItem } from "../entities/news-item.entity";
import { PriceHistory } from "../entities/price-history.entity";
import { type SignalComponentBreakdown, SignalSnapshot } from "../entities/signal-snapshot.entity";

const METRIC_CATEGORY = "insights-signal-engine";
const NEWS_LOOKBACK_HOURS = 48;
const NEWS_MAX_ARTICLES = 20;

interface ComputedSignals {
  momentum: { score: number; roc20: number | null; smaCrossover: number | null };
  valuation: { score: number; trailingPe: number | null; medianPe: number | null };
  newsSentiment: {
    score: number;
    source: string;
    articleCount: number;
    articleIds: string[];
  };
  sectorTrend: {
    score: number;
    sector: string | null;
    etf: string | null;
    etfRoc20: number | null;
  };
  drawdownRisk: { score: number; weekHigh52: number | null; distanceFromHighPct: number };
}

export interface SignalRunResult {
  totalAssets: number;
  scored: number;
  skipped: number;
}

@Injectable()
export class SignalEngineService {
  private readonly logger = new Logger(SignalEngineService.name);

  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(PriceHistory) private readonly historyRepo: Repository<PriceHistory>,
    @InjectRepository(SignalSnapshot)
    private readonly signalRepo: Repository<SignalSnapshot>,
    @InjectRepository(NewsItem) private readonly newsRepo: Repository<NewsItem>,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async runDailySnapshot(): Promise<SignalRunResult> {
    return this.metrics.time(METRIC_CATEGORY, "daily-score", async () => {
      const assets = await this.assetRepo.find({ where: { isActive: true } });
      let scored = 0;
      let skipped = 0;
      for (const asset of assets) {
        try {
          const success = await this.scoreOne(asset);
          if (success) scored += 1;
          else skipped += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Signal score failed for ${asset.symbol}: ${message}`);
          skipped += 1;
        }
      }
      return { totalAssets: assets.length, scored, skipped };
    });
  }

  private async scoreOne(asset: Asset): Promise<boolean> {
    const history = await this.historyRepo.find({
      where: { assetId: asset.id },
      order: { date: "DESC" },
      take: 260,
    });
    if (history.length < 21) {
      this.logger.warn(
        `Skipping ${asset.symbol}: only ${history.length} price-history rows (need >= 21).`,
      );
      return false;
    }
    const orderedAsc = [...history].reverse();
    const closes = orderedAsc.map((row) => Number(row.close));

    const momentum = this.momentum(closes);
    const valuation = this.valuationStub();
    const newsSentiment = await this.newsSentiment(asset.symbol);
    const sectorTrend = await this.sectorTrend(asset.sector);
    const drawdownRisk = this.drawdownRisk(closes);

    const inputsMissing: string[] = [];
    if (valuation.trailingPe === null) inputsMissing.push("valuation");
    if (newsSentiment.source !== "yahoo-news-extraction") inputsMissing.push("news");
    if (sectorTrend.etf === null) inputsMissing.push("sector-etf");
    const inputsAvailable = 5 - inputsMissing.length;

    const opportunityScore =
      0.3 * momentum.score +
      0.25 * valuation.score +
      0.2 * newsSentiment.score +
      0.15 * sectorTrend.score +
      0.1 * (100 - drawdownRisk.score);

    const valuationGap = 100 - valuation.score;
    const volatilityProxy = 50;
    const riskScore = 0.5 * drawdownRisk.score + 0.3 * valuationGap + 0.2 * volatilityProxy;

    const confidenceScore = Math.max(0, 80 - inputsMissing.length * 10);

    const breakdown: SignalComponentBreakdown = {
      momentum,
      valuation,
      newsSentiment,
      sectorTrend,
      drawdownRisk,
      inputsAvailable,
      inputsMissing,
    };

    const snapshotDate = now().toISODate() ?? "";
    const existing = await this.signalRepo.findOne({
      where: { assetId: asset.id, snapshotDate },
    });
    if (existing) {
      await this.signalRepo.delete({ id: existing.id });
    }

    await this.signalRepo.save(
      this.signalRepo.create({
        assetId: asset.id,
        snapshotDate,
        momentumScore: momentum.score.toFixed(2),
        valuationScore: valuation.score.toFixed(2),
        newsSentimentScore: newsSentiment.score.toFixed(2),
        sectorTrendScore: sectorTrend.score.toFixed(2),
        drawdownRiskScore: drawdownRisk.score.toFixed(2),
        opportunityScore: clamp01to100(opportunityScore).toFixed(2),
        riskScore: clamp01to100(riskScore).toFixed(2),
        confidenceScore: clamp01to100(confidenceScore).toFixed(2),
        componentBreakdownJson: breakdown,
        marketRegime: "unknown",
      }),
    );

    return true;
  }

  private momentum(closes: number[]): ComputedSignals["momentum"] {
    if (closes.length < 21) {
      return { score: 50, roc20: null, smaCrossover: null };
    }
    const latest = closes[closes.length - 1];
    const twentyAgo = closes[closes.length - 21];
    const roc20 = ((latest - twentyAgo) / twentyAgo) * 100;

    let smaCrossover: number | null = null;
    if (closes.length >= 50) {
      const last50 = closes.slice(-50);
      const sma50 = last50.reduce((sum, c) => sum + c, 0) / last50.length;
      smaCrossover = ((latest - sma50) / sma50) * 100;
    }

    const rocClamped = Math.max(-25, Math.min(25, roc20));
    const rocScore = ((rocClamped + 25) / 50) * 100;

    let crossoverScore = 50;
    if (smaCrossover !== null) {
      const clamped = Math.max(-15, Math.min(15, smaCrossover));
      crossoverScore = ((clamped + 15) / 30) * 100;
    }

    const score = clamp01to100(0.7 * rocScore + 0.3 * crossoverScore);
    return {
      score,
      roc20: roundOrNull(roc20),
      smaCrossover: smaCrossover !== null ? roundOrNull(smaCrossover) : null,
    };
  }

  private valuationStub(): ComputedSignals["valuation"] {
    return { score: 50, trailingPe: null, medianPe: null };
  }

  private async newsSentiment(symbol: string): Promise<ComputedSignals["newsSentiment"]> {
    const cutoff = now().minus({ hours: NEWS_LOOKBACK_HOURS }).toJSDate();
    const items = await this.newsRepo
      .createQueryBuilder("n")
      .where("n.extraction_status = :status", { status: "extracted" })
      .andWhere("(n.published_at >= :cutoff OR n.created_at >= :cutoff)", { cutoff })
      .andWhere("n.related_symbols ILIKE :symbolPattern", {
        symbolPattern: `%${symbol}%`,
      })
      .orderBy("n.published_at", "DESC")
      .limit(NEWS_MAX_ARTICLES)
      .getMany();

    const matched = items.filter((item) => matchesSymbol(item.relatedSymbols, symbol));
    if (matched.length === 0) {
      return { score: 50, source: "no-news", articleCount: 0, articleIds: [] };
    }

    let weightedSum = 0;
    let weightTotal = 0;
    for (const item of matched) {
      const sentiment = item.sentiment === null ? Number.NaN : Number(item.sentiment);
      if (!Number.isFinite(sentiment)) continue;
      const weight = item.impactLevel === "high" ? 4 : item.impactLevel === "medium" ? 2 : 1;
      weightedSum += sentiment * weight;
      weightTotal += weight;
    }

    if (weightTotal === 0) {
      return { score: 50, source: "no-news", articleCount: 0, articleIds: [] };
    }

    const avgSentiment = weightedSum / weightTotal;
    const score = clamp01to100(((avgSentiment + 1) / 2) * 100);
    return {
      score,
      source: "yahoo-news-extraction",
      articleCount: matched.length,
      articleIds: matched.map((item) => item.id),
    };
  }

  private async sectorTrend(sector: string | null): Promise<ComputedSignals["sectorTrend"]> {
    const etfSymbol = sectorTrendEtf(sector);
    if (!etfSymbol) {
      return { score: 50, sector, etf: null, etfRoc20: null };
    }
    const etfAsset = await this.assetRepo.findOne({ where: { symbol: etfSymbol } });
    if (!etfAsset) {
      return { score: 50, sector, etf: etfSymbol, etfRoc20: null };
    }
    const etfHistory = await this.historyRepo.find({
      where: { assetId: etfAsset.id },
      order: { date: "DESC" },
      take: 21,
    });
    if (etfHistory.length < 21) {
      return { score: 50, sector, etf: etfSymbol, etfRoc20: null };
    }
    const orderedAsc = [...etfHistory].reverse();
    const latestClose = Number(orderedAsc[orderedAsc.length - 1].close);
    const twentyAgoClose = Number(orderedAsc[0].close);
    const etfRoc20 = ((latestClose - twentyAgoClose) / twentyAgoClose) * 100;
    const clamped = Math.max(-15, Math.min(15, etfRoc20));
    const score = ((clamped + 15) / 30) * 100;
    return {
      score: clamp01to100(score),
      sector,
      etf: etfSymbol,
      etfRoc20: roundOrNull(etfRoc20),
    };
  }

  private drawdownRisk(closes: number[]): ComputedSignals["drawdownRisk"] {
    const slice = closes.slice(-252);
    if (slice.length === 0) {
      return { score: 0, weekHigh52: null, distanceFromHighPct: 0 };
    }
    const latest = slice[slice.length - 1];
    const peak = Math.max(...slice);
    if (peak <= 0) {
      return { score: 0, weekHigh52: peak, distanceFromHighPct: 0 };
    }
    const distancePct = ((peak - latest) / peak) * 100;
    const score = Math.max(0, Math.min(100, distancePct));
    return {
      score,
      weekHigh52: roundOrNull(peak),
      distanceFromHighPct: roundOrNull(distancePct) ?? 0,
    };
  }
}

function matchesSymbol(relatedSymbols: string[] | null, symbol: string): boolean {
  if (relatedSymbols === null) return false;
  const upper = symbol.toUpperCase();
  return relatedSymbols.some((s) => s.toUpperCase() === upper);
}

function clamp01to100(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function roundOrNull(value: number | null): number | null {
  if (value === null) return null;
  if (Number.isNaN(value) || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}
