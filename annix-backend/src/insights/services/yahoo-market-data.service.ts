import { Injectable, Logger } from "@nestjs/common";
import yahooFinance from "yahoo-finance2";
import type { HistoricalRowHistory } from "yahoo-finance2/esm/src/modules/historical.js";
import { fromJSDate } from "../../lib/datetime";

export interface YahooDailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
}

const REQUESTS_PER_SECOND = 2;
const REQUEST_INTERVAL_MS = Math.ceil(1000 / REQUESTS_PER_SECOND);
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 1000;

@Injectable()
export class YahooMarketDataService {
  private readonly logger = new Logger(YahooMarketDataService.name);
  private lastRequestAt = 0;
  private pendingChain: Promise<unknown> = Promise.resolve();

  fetchHistorical(symbol: string, from: Date, to: Date = new Date()): Promise<YahooDailyBar[]> {
    return this.scheduled(() => this.fetchHistoricalWithRetry(symbol, from, to));
  }

  fetchLatest(symbol: string): Promise<YahooDailyBar | null> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 7);
    return this.scheduled(async () => {
      const bars = await this.fetchHistoricalWithRetry(symbol, start, new Date());
      if (bars.length === 0) return null;
      const sorted = [...bars].sort((a, b) => (a.date < b.date ? 1 : -1));
      return sorted[0];
    });
  }

  private scheduled<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.pendingChain;
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        const elapsed = Date.now() - this.lastRequestAt;
        const wait = Math.max(0, REQUEST_INTERVAL_MS - elapsed);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
        }
        this.lastRequestAt = Date.now();
        return work();
      });
    this.pendingChain = current.catch(() => undefined);
    return current;
  }

  private async fetchHistoricalWithRetry(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<YahooDailyBar[]> {
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < MAX_RETRIES) {
      try {
        const raw = (await yahooFinance.historical(symbol, {
          period1: from,
          period2: to,
          interval: "1d",
          events: "history",
        })) as HistoricalRowHistory[];
        return raw.map((row) => ({
          date: toIsoDate(row.date),
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          adjClose: row.adjClose ?? null,
          volume: row.volume ?? null,
        }));
      } catch (error) {
        lastError = error;
        const status = errorStatus(error);
        const retryable = status === 429 || status === 503 || status === null;
        if (!retryable) break;
        attempt += 1;
        if (attempt >= MAX_RETRIES) break;
        const backoff = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `Yahoo fetch for ${symbol} failed (attempt ${attempt}/${MAX_RETRIES}): ${errorMessage(error)}. Retrying in ${backoff}ms.`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, backoff));
      }
    }
    throw new Error(
      `Yahoo Finance fetch for ${symbol} failed after ${attempt} attempts: ${errorMessage(lastError)}`,
    );
  }
}

function toIsoDate(value: Date | string): string {
  const jsDate = typeof value === "string" ? new Date(value) : value;
  return fromJSDate(jsDate).toISODate() ?? "";
}

function errorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    const errObj = error as { response?: { status?: number }; status?: number };
    const responseStatus = errObj.response?.status;
    if (typeof responseStatus === "number") return responseStatus;
    const direct = errObj.status;
    if (typeof direct === "number") return direct;
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
