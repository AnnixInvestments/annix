import { Injectable, Logger } from "@nestjs/common";
import YahooFinanceClass from "yahoo-finance2";
import { fromJSDate } from "../../lib/datetime";

const yahooFinance = new YahooFinanceClass();

interface ChartQuote {
  date: Date | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjclose?: number | null;
  volume?: number | null;
}

export interface YahooDailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number | null;
  volume: number | null;
}

export interface YahooNewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: Date;
  relatedTickers: string[];
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

  fetchNews(symbol: string, newsCount = 10): Promise<YahooNewsArticle[]> {
    return this.scheduled(() => this.fetchNewsWithRetry(symbol, newsCount));
  }

  private async fetchNewsWithRetry(symbol: string, newsCount: number): Promise<YahooNewsArticle[]> {
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < MAX_RETRIES) {
      try {
        const result = await yahooFinance.search(symbol, {
          quotesCount: 0,
          newsCount,
        });
        const news = (result?.news ?? []) as Array<{
          uuid?: string;
          title?: string;
          publisher?: string;
          link?: string;
          providerPublishTime?: Date | number | string;
          relatedTickers?: string[];
        }>;
        return news
          .filter((n) => typeof n.link === "string" && typeof n.title === "string")
          .map((n) => ({
            uuid: n.uuid ?? "",
            title: n.title as string,
            publisher: n.publisher ?? "",
            link: n.link as string,
            providerPublishTime:
              n.providerPublishTime instanceof Date
                ? n.providerPublishTime
                : new Date(n.providerPublishTime ?? Date.now()),
            relatedTickers: n.relatedTickers ?? [],
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
          `Yahoo news fetch for ${symbol} failed (attempt ${attempt}/${MAX_RETRIES}): ${errorMessage(error)}. Retrying in ${backoff}ms.`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, backoff));
      }
    }
    throw new Error(
      `Yahoo Finance news fetch for ${symbol} failed after ${attempt} attempts: ${errorMessage(lastError)}`,
    );
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
        const result = await yahooFinance.chart(symbol, {
          period1: from,
          period2: to,
          interval: "1d",
        });
        const quotes = (result?.quotes ?? []) as ChartQuote[];
        return quotes
          .filter((q) => q.close !== null && q.open !== null && q.high !== null && q.low !== null)
          .map((q) => ({
            date: toIsoDate(q.date instanceof Date ? q.date : new Date(q.date)),
            open: q.open as number,
            high: q.high as number,
            low: q.low as number,
            close: q.close as number,
            adjClose: q.adjclose ?? null,
            volume: q.volume ?? null,
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
