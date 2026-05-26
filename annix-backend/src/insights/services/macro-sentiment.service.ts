import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import {
  type MacroBreakdown,
  MacroSentimentSnapshot,
} from "../entities/macro-sentiment-snapshot.entity";
import { NewsItem } from "../entities/news-item.entity";
import { MacroSentimentSnapshotRepository } from "../repositories/macro-sentiment-snapshot.repository";
import { NewsItemRepository } from "../repositories/news-item.repository";

const METRIC_CATEGORY = "insights-macro-sentiment";
const LOOKBACK_HOURS = 48;
const BYTES_PER_SNAPSHOT = 600;

const IMPACT_WEIGHTS: Record<string, number> = {
  high: 4,
  medium: 2,
  low: 1,
};

interface ScoringAccumulator {
  weightedSum: number;
  weightTotal: number;
  articleCount: number;
  highImpactCount: number;
  sectorAccum: Map<string, { sumSentiment: number; count: number }>;
  commodityAccum: Map<string, { sumSentiment: number; count: number }>;
}

@Injectable()
export class MacroSentimentService {
  private readonly logger = new Logger(MacroSentimentService.name);

  constructor(
    private readonly newsRepo: NewsItemRepository,
    private readonly snapshotRepo: MacroSentimentSnapshotRepository,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async captureForToday(): Promise<MacroSentimentSnapshot> {
    return this.metrics.time(
      METRIC_CATEGORY,
      "capture-today",
      async () => {
        const todayIso = now().toISODate() ?? "";
        const cutoff = now().minus({ hours: LOOKBACK_HOURS }).toJSDate();
        const rows = await this.newsRepo.findExtractedMacro(cutoff);

        const accumulator = this.accumulate(rows);
        const overallScore =
          accumulator.weightTotal > 0 ? accumulator.weightedSum / accumulator.weightTotal : 0;

        const sectorBreakdown = mapToBreakdown(accumulator.sectorAccum);
        const commodityBreakdown = mapToBreakdown(accumulator.commodityAccum);

        const existing = await this.snapshotRepo.findByDate(todayIso);
        if (existing) {
          await this.snapshotRepo.deleteById(existing.id);
        }
        const saved = await this.snapshotRepo.create({
          snapshotDate: todayIso,
          overallScore: clampSentiment(overallScore).toFixed(4),
          articleCount: accumulator.articleCount,
          highImpactCount: accumulator.highImpactCount,
          sectorBreakdown,
          commodityBreakdown,
        });
        this.logger.log(
          `Macro sentiment for ${todayIso}: score=${overallScore.toFixed(3)}, ${accumulator.articleCount} articles (${accumulator.highImpactCount} high-impact).`,
        );
        return saved;
      },
      () => BYTES_PER_SNAPSHOT,
    );
  }

  async today(): Promise<MacroSentimentSnapshot | null> {
    const todayIso = now().toISODate() ?? "";
    return this.snapshotRepo.findByDate(todayIso);
  }

  async history(limit = 30): Promise<MacroSentimentSnapshot[]> {
    const rows = await this.snapshotRepo.recentHistory(limit);
    return rows.reverse();
  }

  private accumulate(rows: NewsItem[]): ScoringAccumulator {
    const acc: ScoringAccumulator = {
      weightedSum: 0,
      weightTotal: 0,
      articleCount: 0,
      highImpactCount: 0,
      sectorAccum: new Map(),
      commodityAccum: new Map(),
    };
    for (const row of rows) {
      const sentiment = row.sentiment !== null ? Number(row.sentiment) : Number.NaN;
      if (!Number.isFinite(sentiment)) continue;
      const impact = row.impactLevel ?? "low";
      const weight = IMPACT_WEIGHTS[impact] ?? 1;
      acc.weightedSum += sentiment * weight;
      acc.weightTotal += weight;
      acc.articleCount += 1;
      if (impact === "high") acc.highImpactCount += 1;

      const themes = row.relatedThemes ?? [];
      const sectorHits = new Set<string>();
      const commodityHits = new Set<string>();
      for (const theme of themes) {
        const trimmed = typeof theme === "string" ? theme.trim().toLowerCase() : "";
        if (trimmed.length === 0) continue;
        if (isCommodityTheme(trimmed)) {
          commodityHits.add(trimmed);
        } else {
          sectorHits.add(trimmed);
        }
      }
      for (const sector of sectorHits) {
        const entry = acc.sectorAccum.get(sector) ?? { sumSentiment: 0, count: 0 };
        entry.sumSentiment += sentiment;
        entry.count += 1;
        acc.sectorAccum.set(sector, entry);
      }
      for (const commodity of commodityHits) {
        const entry = acc.commodityAccum.get(commodity) ?? { sumSentiment: 0, count: 0 };
        entry.sumSentiment += sentiment;
        entry.count += 1;
        acc.commodityAccum.set(commodity, entry);
      }
    }
    return acc;
  }
}

const COMMODITY_THEMES = new Set([
  "gold",
  "silver",
  "platinum",
  "palladium",
  "rhodium",
  "copper",
  "iron ore",
  "iron",
  "coal",
  "uranium",
  "oil",
  "crude oil",
  "natural gas",
  "lng",
  "nickel",
  "zinc",
  "lithium",
  "cobalt",
  "manganese",
  "agriculture",
  "wheat",
  "maize",
  "corn",
  "soybeans",
  "sugar",
]);

function isCommodityTheme(theme: string): boolean {
  return COMMODITY_THEMES.has(theme);
}

function mapToBreakdown(
  source: Map<string, { sumSentiment: number; count: number }>,
): MacroBreakdown {
  const out: MacroBreakdown = {};
  for (const [key, value] of source.entries()) {
    out[key] = {
      count: value.count,
      meanSentiment: value.count > 0 ? Number((value.sumSentiment / value.count).toFixed(4)) : 0,
    };
  }
  return out;
}

function clampSentiment(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}
