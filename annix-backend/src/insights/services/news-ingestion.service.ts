import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { Asset } from "../entities/asset.entity";
import { type NewsImpactLevel, NewsItem } from "../entities/news-item.entity";
import { YahooMarketDataService, type YahooNewsArticle } from "./yahoo-market-data.service";

const METRIC_CATEGORY = "insights-news";
const ARTICLES_PER_SYMBOL = 10;
const BYTES_PER_NEWS_ROW = 500;
const VALID_IMPACT_LEVELS: NewsImpactLevel[] = ["low", "medium", "high"];

interface ExtractedNewsFields {
  event: string;
  affectedSymbols: string[];
  affectedSectors: string[];
  affectedCommodities: string[];
  sentiment: number;
  impactLevel: NewsImpactLevel;
  shortTermImplication: string;
  mediumTermImplication: string;
}

export interface NewsPullResult {
  symbolsProcessed: number;
  articlesFound: number;
  articlesPersisted: number;
  articlesExtracted: number;
  articlesFailed: number;
  symbolFailures: string[];
}

@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);

  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(NewsItem) private readonly newsRepo: Repository<NewsItem>,
    private readonly yahoo: YahooMarketDataService,
    private readonly ai: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async runDailyPull(): Promise<NewsPullResult> {
    return this.metrics.time(
      METRIC_CATEGORY,
      "daily-pull",
      async () => {
        const assets = await this.assetRepo.find({ where: { isActive: true } });
        const watchlist = new Set(assets.map((a) => a.symbol));
        let articlesFound = 0;
        let articlesPersisted = 0;
        let articlesExtracted = 0;
        let articlesFailed = 0;
        const symbolFailures: string[] = [];

        for (const asset of assets) {
          try {
            const articles = await this.yahoo.fetchNews(asset.symbol, ARTICLES_PER_SYMBOL);
            for (const article of articles) {
              articlesFound++;
              const persisted = await this.ingestArticle(article, watchlist);
              if (persisted === "skipped") continue;
              articlesPersisted++;
              if (persisted === "extracted") articlesExtracted++;
              else articlesFailed++;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Yahoo news fetch failed for ${asset.symbol}: ${message}`);
            symbolFailures.push(asset.symbol);
          }
        }

        return {
          symbolsProcessed: assets.length,
          articlesFound,
          articlesPersisted,
          articlesExtracted,
          articlesFailed,
          symbolFailures,
        };
      },
      (result) => result.articlesPersisted * BYTES_PER_NEWS_ROW,
    );
  }

  private async ingestArticle(
    article: YahooNewsArticle,
    watchlist: Set<string>,
  ): Promise<"skipped" | "extracted" | "failed"> {
    const urlHash = hashArticle(article.link, article.title);
    const existing = await this.newsRepo.findOne({ where: { urlHash } });
    if (existing) return "skipped";

    // Pre-Gemini filter: Yahoo's per-ticker news endpoint surfaces
    // related/trending market news, not just articles about the queried
    // ticker. ~43% of the May 15 first-run articles had Yahoo-tagged
    // tickers that didn't overlap any watchlist symbol (e.g. BMW.DE,
    // GETY, KEX, AGIO). Skipping them here avoids the Gemini call entirely.
    // Articles with empty relatedTickers fall through to Gemini so we can
    // still capture general market commentary that Gemini extracts into
    // affectedSymbols — the post-Gemini filter below drops the residue.
    if (article.relatedTickers.length > 0 && !hasOverlap(article.relatedTickers, watchlist)) {
      return "skipped";
    }

    const created = this.newsRepo.create({
      urlHash,
      url: article.link,
      title: article.title,
      source: article.publisher,
      publishedAt: article.providerPublishTime,
      relatedSymbols: article.relatedTickers,
      extractionStatus: "pending",
    });
    const saved = await this.newsRepo.save(created);

    try {
      const extraction = await this.extractWithGemini(article);
      const themes = [...extraction.affectedSectors, ...extraction.affectedCommodities];
      const symbolUnion = unique([...article.relatedTickers, ...extraction.affectedSymbols]);
      // Post-Gemini filter: catches the "empty Yahoo tickers + Gemini
      // didn't extract a watchlist symbol either" case ("India hikes fuel
      // prices..." style general macro). Delete the pending row so we
      // don't leave orphans for the signal engine to scan.
      if (!hasOverlap(symbolUnion, watchlist)) {
        await this.newsRepo.delete(saved.id);
        return "skipped";
      }
      await this.newsRepo.update(saved.id, {
        summary: extraction.event,
        relatedSymbols: symbolUnion,
        relatedThemes: themes,
        sentiment: extraction.sentiment.toFixed(3),
        impactLevel: extraction.impactLevel,
        shortTermImplication: extraction.shortTermImplication,
        mediumTermImplication: extraction.mediumTermImplication,
        extractedAt: now().toJSDate(),
        extractionStatus: "extracted",
      });
      return "extracted";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Gemini extraction failed for "${article.title}": ${message}`);
      await this.newsRepo.update(saved.id, {
        extractionStatus: "failed",
        extractionError: message,
      });
      return "failed";
    }
  }

  private async extractWithGemini(article: YahooNewsArticle): Promise<ExtractedNewsFields> {
    const systemPrompt =
      "You analyse financial news headlines for a paper-trading signal engine. Return ONLY a JSON object — no markdown, no commentary.";
    const userMessage = `Headline: ${article.title}
Publisher: ${article.publisher}
Related tickers: ${article.relatedTickers.length > 0 ? article.relatedTickers.join(", ") : "(none)"}

Return JSON with this exact shape:
{
  "event": "one sentence describing the event",
  "affectedSymbols": ["TICKER1", "TICKER2"],
  "affectedSectors": ["banking", "mining"],
  "affectedCommodities": ["gold", "oil"],
  "sentiment": 0.0,
  "impactLevel": "low",
  "shortTermImplication": "one sentence about 1-7 day price effect",
  "mediumTermImplication": "one sentence about 1-3 month structural effect"
}

Rules:
- sentiment must be a number from -1.0 (very bearish) to 1.0 (very bullish); 0 = neutral
- impactLevel must be exactly one of: "low", "medium", "high"
- affectedSymbols, affectedSectors, affectedCommodities are arrays (empty array if N/A)
- All implication strings must be non-empty
- Output ONLY the JSON object, no surrounding text or code fences`;

    const result = await this.ai.chat([{ role: "user", content: userMessage }], systemPrompt);
    return parseGeminiResponse(result.content);
  }
}

function hashArticle(url: string, title: string): string {
  const key = `${url}|${title.toLowerCase().trim()}`;
  return createHash("sha256").update(key).digest("hex");
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter((s) => typeof s === "string" && s.length > 0)));
}

function hasOverlap(candidates: string[], watchlist: Set<string>): boolean {
  for (const c of candidates) {
    if (typeof c === "string" && watchlist.has(c)) return true;
  }
  return false;
}

function parseGeminiResponse(raw: string): ExtractedNewsFields {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const sentiment = parsed.sentiment;
  if (typeof sentiment !== "number" || Number.isNaN(sentiment)) {
    throw new Error(`Invalid sentiment: ${String(sentiment)}`);
  }
  const impactLevel = parsed.impactLevel;
  if (
    typeof impactLevel !== "string" ||
    !VALID_IMPACT_LEVELS.includes(impactLevel as NewsImpactLevel)
  ) {
    throw new Error(`Invalid impactLevel: ${String(impactLevel)}`);
  }

  const event = typeof parsed.event === "string" ? parsed.event : "";
  const shortTerm =
    typeof parsed.shortTermImplication === "string" ? parsed.shortTermImplication : "";
  const mediumTerm =
    typeof parsed.mediumTermImplication === "string" ? parsed.mediumTermImplication : "";

  return {
    event,
    affectedSymbols: stringArray(parsed.affectedSymbols),
    affectedSectors: stringArray(parsed.affectedSectors),
    affectedCommodities: stringArray(parsed.affectedCommodities),
    sentiment: Math.max(-1, Math.min(1, sentiment)),
    impactLevel: impactLevel as NewsImpactLevel,
    shortTermImplication: shortTerm,
    mediumTermImplication: mediumTerm,
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}
