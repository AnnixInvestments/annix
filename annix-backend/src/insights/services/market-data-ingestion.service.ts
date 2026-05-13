import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { Asset } from "../entities/asset.entity";
import { PriceHistory } from "../entities/price-history.entity";
import { YahooDailyBar, YahooMarketDataService } from "./yahoo-market-data.service";

export interface IngestResult {
  symbol: string;
  inserted: number;
  skipped: number;
  earliestDate: string | null;
  latestDate: string | null;
}

const DEFAULT_BACKFILL_YEARS = 20;
const METRIC_CATEGORY = "insights-market-data";

@Injectable()
export class MarketDataIngestionService {
  private readonly logger = new Logger(MarketDataIngestionService.name);

  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(PriceHistory) private readonly historyRepo: Repository<PriceHistory>,
    private readonly yahoo: YahooMarketDataService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async backfillBySymbol(symbol: string, from?: Date): Promise<IngestResult> {
    const asset = await this.assetRepo.findOne({ where: { symbol } });
    if (!asset) {
      throw new Error(`Asset ${symbol} not found in insights_assets`);
    }
    return this.backfillForAsset(asset, from);
  }

  async backfillForAsset(asset: Asset, from?: Date): Promise<IngestResult> {
    const since = from ?? defaultBackfillStart();
    return this.metrics.time(METRIC_CATEGORY, "backfill", async () => {
      const bars = await this.yahoo.fetchHistorical(asset.symbol, since);
      return this.persistBars(asset, bars);
    });
  }

  async incrementalUpdate(asset: Asset): Promise<IngestResult> {
    return this.metrics.time(METRIC_CATEGORY, "daily-snapshot", async () => {
      const latestRow = await this.historyRepo.findOne({
        where: { assetId: asset.id },
        order: { date: "DESC" },
      });
      const today = now().toISODate();
      if (latestRow && today !== null && latestRow.date >= today) {
        return {
          symbol: asset.symbol,
          inserted: 0,
          skipped: 0,
          earliestDate: null,
          latestDate: latestRow.date,
        };
      }
      const since = latestRow ? incrementDate(latestRow.date) : defaultBackfillStart();
      const bars = await this.yahoo.fetchHistorical(asset.symbol, since);
      return this.persistBars(asset, bars);
    });
  }

  async runDailySnapshot(): Promise<{ totalInserted: number; failed: string[] }> {
    const assets = await this.assetRepo.find({ where: { isActive: true } });
    let totalInserted = 0;
    const failed: string[] = [];
    for (const asset of assets) {
      try {
        const result = await this.incrementalUpdate(asset);
        totalInserted += result.inserted;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Daily snapshot failed for ${asset.symbol}: ${message}`);
        failed.push(asset.symbol);
      }
    }
    return { totalInserted, failed };
  }

  async historyForSymbol(symbol: string): Promise<PriceHistory[]> {
    const asset = await this.assetRepo.findOne({ where: { symbol } });
    if (!asset) return [];
    return this.historyRepo.find({
      where: { assetId: asset.id },
      order: { date: "ASC" },
    });
  }

  async rowCountForSymbol(symbol: string): Promise<number> {
    const asset = await this.assetRepo.findOne({ where: { symbol } });
    if (!asset) return 0;
    return this.historyRepo.count({ where: { assetId: asset.id } });
  }

  private async persistBars(asset: Asset, bars: YahooDailyBar[]): Promise<IngestResult> {
    if (bars.length === 0) {
      return {
        symbol: asset.symbol,
        inserted: 0,
        skipped: 0,
        earliestDate: null,
        latestDate: null,
      };
    }

    const dates = bars.map((b) => b.date);
    const existing = await this.historyRepo
      .createQueryBuilder("h")
      .select("h.date", "date")
      .where("h.asset_id = :assetId", { assetId: asset.id })
      .andWhere("h.date IN (:...dates)", { dates })
      .getRawMany<{ date: string }>();
    const existingDates = new Set(existing.map((r) => normaliseDate(r.date)));

    const fresh = bars.filter((b) => !existingDates.has(b.date));
    if (fresh.length === 0) {
      const sortedDates = [...dates].sort();
      return {
        symbol: asset.symbol,
        inserted: 0,
        skipped: bars.length,
        earliestDate: sortedDates[0],
        latestDate: sortedDates[sortedDates.length - 1],
      };
    }

    const rows = fresh.map((b) =>
      this.historyRepo.create({
        assetId: asset.id,
        date: b.date,
        open: b.open.toString(),
        high: b.high.toString(),
        low: b.low.toString(),
        close: b.close.toString(),
        adjClose: b.adjClose !== null ? b.adjClose.toString() : null,
        volume: b.volume !== null ? b.volume.toString() : null,
      }),
    );

    await this.historyRepo.createQueryBuilder().insert().values(rows).orIgnore().execute();

    const sortedFresh = [...fresh].sort((a, b) => (a.date < b.date ? -1 : 1));
    return {
      symbol: asset.symbol,
      inserted: fresh.length,
      skipped: bars.length - fresh.length,
      earliestDate: sortedFresh[0].date,
      latestDate: sortedFresh[sortedFresh.length - 1].date,
    };
  }
}

function defaultBackfillStart(): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - DEFAULT_BACKFILL_YEARS);
  return d;
}

function incrementDate(isoDate: string): Date {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function normaliseDate(raw: string | Date): string {
  if (typeof raw === "string") return raw.slice(0, 10);
  return raw.toISOString().slice(0, 10);
}
