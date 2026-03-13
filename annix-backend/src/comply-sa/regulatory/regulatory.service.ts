import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { fromISO, now } from "../lib/datetime";
import { ComplySaRegulatoryUpdate } from "./entities/regulatory-update.entity";

interface ExtractedUpdate {
  title: string;
  summary: string;
  category: string;
  effectiveDate: string | null;
  sourceUrl: string;
  affectedRequirementCodes: string[];
}

const REGULATORY_SOURCES = [
  {
    name: "SARS",
    url: "https://www.sars.gov.za/legal-counsel/secondary-legislation/",
  },
  {
    name: "CIPC",
    url: "https://www.cipc.co.za/",
  },
  {
    name: "Government Gazette",
    url: "https://www.gpwonline.co.za/",
  },
] as const;

const VALID_CATEGORIES = ["SARS", "CIPC", "POPIA", "Labour", "OHS", "B-BBEE"] as const;

const TITLE_SIMILARITY_THRESHOLD = 0.85;

const EXTRACTION_SYSTEM_PROMPT = `You are a South African regulatory analyst. Extract regulatory updates relevant to SMEs from the provided HTML content. Return a JSON array of updates. Each update must have:
- "title": concise title of the regulatory change
- "summary": 2-3 sentence plain-English summary of what changed and how it affects SMEs
- "category": one of SARS, CIPC, POPIA, Labour, OHS, B-BBEE
- "effectiveDate": ISO date string if mentioned, or null
- "affectedRequirementCodes": array of relevant regulation/act reference codes (e.g. ["ITA s11(e)", "VAT Act s16(3)"])

Only include genuinely new regulatory changes, amendments, or notices. Ignore navigation, ads, and boilerplate content. If no relevant updates are found, return an empty array [].
Return ONLY valid JSON, no markdown fencing or explanation.`;

@Injectable()
export class ComplySaRegulatoryService {
  private readonly logger = new Logger(ComplySaRegulatoryService.name);

  constructor(
    @InjectRepository(ComplySaRegulatoryUpdate)
    private readonly regulatoryUpdateRepository: Repository<ComplySaRegulatoryUpdate>,
    private readonly aiChatService: AiChatService,
  ) {}

  async recentUpdates(limit: number): Promise<ComplySaRegulatoryUpdate[]> {
    return this.regulatoryUpdateRepository.find({
      order: { publishedAt: "DESC" },
      take: limit,
    });
  }

  async updatesByCategory(category: string): Promise<ComplySaRegulatoryUpdate[]> {
    return this.regulatoryUpdateRepository.find({
      where: { category },
      order: { publishedAt: "DESC" },
    });
  }

  async createUpdate(data: {
    title: string;
    summary: string;
    category: string;
    effectiveDate?: string | null;
    sourceUrl?: string | null;
    affectedRequirementCodes?: string[] | null;
  }): Promise<ComplySaRegulatoryUpdate> {
    const effectiveDate =
      typeof data.effectiveDate === "string" ? fromISO(data.effectiveDate).toJSDate() : null;

    const update = this.regulatoryUpdateRepository.create({
      ...data,
      effectiveDate,
      sourceUrl: data.sourceUrl ?? null,
      affectedRequirementCodes: data.affectedRequirementCodes ?? null,
    });
    return this.regulatoryUpdateRepository.save(update);
  }

  @Cron("0 5 * * *", { timeZone: "Africa/Johannesburg" })
  async syncRegulatoryUpdates(): Promise<void> {
    this.logger.log("Starting daily regulatory update sync");
    const startedAt = now();

    const results = await Promise.allSettled(
      REGULATORY_SOURCES.map((source) => this.scrapeSource(source.name, source.url)),
    );

    const summary = results.reduce(
      (acc, result, index) => {
        if (result.status === "fulfilled") {
          return { ...acc, inserted: acc.inserted + result.value };
        } else {
          this.logger.error(`Failed to scrape ${REGULATORY_SOURCES[index].name}: ${result.reason}`);
          return { ...acc, failed: acc.failed + 1 };
        }
      },
      { inserted: 0, failed: 0 },
    );

    const elapsed = now().diff(startedAt, "seconds").seconds;
    this.logger.log(
      `Regulatory sync complete in ${elapsed}s: ${summary.inserted} new updates, ${summary.failed} source failures`,
    );
  }

  private async scrapeSource(sourceName: string, url: string): Promise<number> {
    this.logger.log(`Scraping ${sourceName} from ${url}`);

    const html = await this.fetchHtml(url);
    if (!html) {
      this.logger.warn(`No content fetched from ${sourceName}`);
      return 0;
    }

    const truncatedHtml = html.slice(0, 50000);
    const extractedUpdates = await this.extractUpdatesViaAi(truncatedHtml, url);

    if (extractedUpdates.length === 0) {
      this.logger.log(`No regulatory updates extracted from ${sourceName}`);
      return 0;
    }

    const newUpdates = await this.deduplicateUpdates(extractedUpdates);

    if (newUpdates.length === 0) {
      this.logger.log(`All updates from ${sourceName} already exist`);
      return 0;
    }

    const entities = newUpdates.map((update) =>
      this.regulatoryUpdateRepository.create({
        title: update.title,
        summary: update.summary,
        category: update.category,
        effectiveDate:
          update.effectiveDate !== null ? fromISO(update.effectiveDate).toJSDate() : null,
        sourceUrl: update.sourceUrl,
        affectedRequirementCodes:
          update.affectedRequirementCodes.length > 0 ? update.affectedRequirementCodes : null,
        publishedAt: now().toJSDate(),
      }),
    );

    await this.regulatoryUpdateRepository.save(entities);
    this.logger.log(`Inserted ${entities.length} new updates from ${sourceName}`);
    return entities.length;
  }

  private async fetchHtml(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ComplySA-RegulatorySync/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(`HTTP ${response.status} from ${url}`);
        return null;
      }

      return await response.text();
    } catch (error) {
      this.logger.error(
        `Fetch error for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async extractUpdatesViaAi(html: string, sourceUrl: string): Promise<ExtractedUpdate[]> {
    try {
      const result = await this.aiChatService.chat(
        [
          {
            role: "user",
            content: `Extract regulatory updates from the following HTML content scraped from ${sourceUrl}:\n\n${html}`,
          },
        ],
        EXTRACTION_SYSTEM_PROMPT,
      );

      const parsed = JSON.parse(result.content) as unknown[];

      if (!Array.isArray(parsed)) {
        this.logger.warn("AI response was not an array");
        return [];
      }

      return parsed
        .filter(
          (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
        )
        .filter(
          (item) =>
            typeof item.title === "string" &&
            typeof item.summary === "string" &&
            typeof item.category === "string",
        )
        .map((item) => ({
          title: String(item.title).slice(0, 255),
          summary: String(item.summary),
          category: this.normalizeCategory(String(item.category)),
          effectiveDate: typeof item.effectiveDate === "string" ? item.effectiveDate : null,
          sourceUrl,
          affectedRequirementCodes: Array.isArray(item.affectedRequirementCodes)
            ? (item.affectedRequirementCodes as unknown[]).filter(
                (code): code is string => typeof code === "string",
              )
            : [],
        }));
    } catch (error) {
      this.logger.error(
        `AI extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  private normalizeCategory(category: string): string {
    const match = VALID_CATEGORIES.find((valid) => valid.toLowerCase() === category.toLowerCase());
    return match ?? "SARS";
  }

  private async deduplicateUpdates(updates: ExtractedUpdate[]): Promise<ExtractedUpdate[]> {
    const existingTitles = await this.existingTitleIndex();

    return updates.filter((update) => {
      const isDuplicate = existingTitles.some(
        (existing) => this.titleSimilarity(existing, update.title) >= TITLE_SIMILARITY_THRESHOLD,
      );
      return !isDuplicate;
    });
  }

  private async existingTitleIndex(): Promise<string[]> {
    const recent = await this.regulatoryUpdateRepository.find({
      select: ["title"],
      order: { publishedAt: "DESC" },
      take: 500,
    });

    return recent.map((r) => r.title);
  }

  private titleSimilarity(a: string, b: string): number {
    const normalizedA = a.toLowerCase().trim();
    const normalizedB = b.toLowerCase().trim();

    if (normalizedA === normalizedB) {
      return 1.0;
    }

    const tokensA = new Set(normalizedA.split(/\s+/));
    const tokensB = new Set(normalizedB.split(/\s+/));
    const intersection = [...tokensA].filter((token) => tokensB.has(token));
    const union = new Set([...tokensA, ...tokensB]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.length / union.size;
  }
}
