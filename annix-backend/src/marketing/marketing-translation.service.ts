import {
  DEFAULT_MARKETING_LOCALE,
  type MarketingLocale,
  type MarketingSiteContent as MarketingSiteContentTree,
  normaliseMarketingLocale,
} from "@annix/product-data/marketing";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { cloneDeep } from "es-toolkit/compat";
import { ExtractionMetricService } from "../metrics/extraction-metric.service";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { MarketingSiteContentService } from "./marketing-site-content.service";

const LANGUAGE_NAMES: Record<Exclude<MarketingLocale, "en">, string> = {
  af: "Afrikaans",
  zu: "Zulu (isiZulu)",
  fr: "French",
  pt: "Portuguese (European)",
  es: "Spanish",
};

// Field names that hold identifiers, URLs, assets, codes or colours — never prose.
const SKIP_KEYS = new Set<string>([
  "iconSlot",
  "slug",
  "detailSlug",
  "appKey",
  "portalCode",
  "accentColor",
  "flag",
  "platform",
  "href",
  "url",
  "imageUrl",
  "logoUrl",
  "wordmarkImageUrl",
  "leadImageUrl",
  "storyImageUrl",
  "missionImageUrl",
  "backgroundImageUrl",
  "designedByLogoUrl",
  "hostedByLogoUrl",
  "designedByUrl",
  "hostedByUrl",
  "ctaUrl",
  "productSlug",
  "lastUpdated",
  "wordmark",
]);

interface StringSlot {
  container: Record<string, unknown>;
  key: string;
  text: string;
}

function looksUntranslatable(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") {
    return true;
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("@")
  ) {
    return true;
  }
  if (trimmed.startsWith("#") && trimmed.length <= 9) {
    return true;
  }
  if (/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(trimmed)) {
    return true;
  }
  return false;
}

function collectSlots(node: unknown, slots: StringSlot[]): void {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectSlots(entry, slots));
    return;
  }
  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    Object.entries(record).forEach(([key, value]) => {
      if (typeof value === "string") {
        if (!SKIP_KEYS.has(key) && !looksUntranslatable(value)) {
          slots.push({ container: record, key, text: value });
        }
      } else if (value && typeof value === "object") {
        collectSlots(value, slots);
      }
    });
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  return items.reduce<T[][]>((acc, item, index) => {
    if (index % size === 0) {
      acc.push([]);
    }
    acc[acc.length - 1].push(item);
    return acc;
  }, []);
}

function parseJsonRecord(content: string): Record<string, string> {
  const fenced = content.replace(/```(?:json)?/gi, "").trim();
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Translation response was not valid JSON");
  }
  const parsed = JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
  return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

@Injectable()
export class MarketingTranslationService {
  private readonly logger = new Logger(MarketingTranslationService.name);
  private readonly batchSize = 40;
  // Long markdown bodies (legal policies, full resource articles) don't survive a
  // shared JSON map cleanly, so anything above this is translated on its own as
  // plain text. Short strings are still batched.
  private readonly largeFieldThreshold = 1000;
  // How many Gemini calls run at once. AiChatService already retries on transient
  // rate limits, so a small pool is safe and cuts wall-clock several-fold.
  private readonly concurrency = 4;

  constructor(
    private readonly marketingService: MarketingSiteContentService,
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async translateDraftInto(locale: string | null): Promise<MarketingSiteContentTree> {
    const target = normaliseMarketingLocale(locale);
    if (target === DEFAULT_MARKETING_LOCALE) {
      throw new BadRequestException(
        "English is the source language and cannot be auto-translated.",
      );
    }
    const languageName = LANGUAGE_NAMES[target];

    return this.metrics.time("marketing", "translate-content", async () => {
      const source = await this.marketingService.draftContent(DEFAULT_MARKETING_LOCALE);
      const tree = cloneDeep(source);
      const slots: StringSlot[] = [];
      collectSlots(tree, slots);

      const smallSlots = slots.filter((slot) => slot.text.length <= this.largeFieldThreshold);
      const largeSlots = slots.filter((slot) => slot.text.length > this.largeFieldThreshold);

      const tasks: Array<() => Promise<void>> = [
        ...chunk(smallSlots, this.batchSize).map((batch) => async () => {
          const translations = await this.translateSmallBatch(batch, languageName);
          batch.forEach((slot, index) => {
            const translated = translations[String(index)];
            if (translated && translated.trim() !== "") {
              slot.container[slot.key] = translated;
            }
          });
        }),
        ...largeSlots.map((slot) => async () => {
          const translated = await this.translateLargeText(slot.text, languageName);
          if (translated && translated.trim() !== "") {
            slot.container[slot.key] = translated;
          }
        }),
      ];

      await this.runTasks(tasks, this.concurrency);
      this.logger.log(
        `Translated ${smallSlots.length} short + ${largeSlots.length} long strings into ${target}`,
      );

      return this.marketingService.saveDraft(tree, target);
    });
  }

  private async runTasks(tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> {
    // Run in waves of `concurrency` — simpler than a worker pool and avoids
    // firing every Gemini call at once.
    await chunk(tasks, concurrency).reduce(async (previous, wave) => {
      await previous;
      await Promise.all(wave.map((task) => task()));
    }, Promise.resolve());
  }

  private async translateLargeText(text: string, languageName: string): Promise<string | null> {
    const systemPrompt = [
      "You are a professional translator for Annix, an industrial software brand.",
      `Translate the supplied marketing copy from English into ${languageName}.`,
      "Rules:",
      "- Preserve meaning, tone and ALL markdown / headings / line breaks exactly.",
      `- Do NOT translate brand or product names (anything containing "Annix"), proper nouns, URLs, email addresses, or code.`,
      "- Return ONLY the translated text — no quotes, no JSON, no commentary.",
    ].join("\n");
    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user" as const, content: text }],
        systemPrompt,
        "gemini",
      );
      const cleaned = content.trim();
      return cleaned === "" ? null : cleaned;
    } catch (error) {
      this.logger.warn(
        `Long-field translation failed (${text.length} chars) — keeping English: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      return null;
    }
  }

  private async translateSmallBatch(
    batch: StringSlot[],
    languageName: string,
  ): Promise<Record<string, string>> {
    try {
      return await this.requestTranslations(
        batch.map((slot) => slot.text),
        languageName,
      );
    } catch (error) {
      this.logger.warn(
        `Batch translation failed (${batch.length} strings) — falling back to per-string: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
      const result: Record<string, string> = {};
      await batch.reduce(async (previous, slot, index) => {
        await previous;
        try {
          const single = await this.requestTranslations([slot.text], languageName);
          const translated = single["0"];
          if (translated && translated.trim() !== "") {
            result[String(index)] = translated;
          }
        } catch {
          // Keep the English original for this string.
        }
      }, Promise.resolve());
      return result;
    }
  }

  private async requestTranslations(
    texts: string[],
    languageName: string,
  ): Promise<Record<string, string>> {
    const payload = texts.reduce<Record<string, string>>((acc, text, index) => {
      acc[String(index)] = text;
      return acc;
    }, {});

    const systemPrompt = [
      "You are a professional translator for Annix, an industrial software brand.",
      `Translate the supplied marketing copy from English into ${languageName}.`,
      "Rules:",
      "- Preserve meaning, tone and any markdown / line breaks exactly.",
      `- Do NOT translate brand or product names (anything containing "Annix"), proper nouns, URLs, email addresses, or code.`,
      "- Keep numbers, units and punctuation.",
      "- Return ONLY a JSON object that maps each input key to its translated string, with the same keys.",
    ].join("\n");

    const userPrompt = `Translate every value into ${languageName}. Input JSON:\n${JSON.stringify(
      payload,
    )}`;

    const { content } = await this.aiChatService.chat(
      [{ role: "user" as const, content: userPrompt }],
      systemPrompt,
      "gemini",
    );
    return parseJsonRecord(content);
  }
}
