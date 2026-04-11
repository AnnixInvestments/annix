import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

export interface LegacyStockItemForClassification {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  supplierName?: string | null;
}

export type ClassificationLabel = "paint" | "consumable" | "unsure";

export interface ClassificationSuggestion {
  legacyStockItemId: number;
  label: ClassificationLabel;
  confidence: number;
  signals: ReadonlyArray<string>;
  reasoning: string;
}

const PAINT_KEYWORDS = [
  "paint",
  "primer",
  "topcoat",
  "intermediate coat",
  "finish coat",
  "sealer",
  "banding",
  "epoxy",
  "polyurethane",
  "zinc rich",
  "enamel",
  "alkyd",
  "acrylic",
  "coating",
];

const PAINT_NAME_REGEX =
  /\b(paint|primer|topcoat|sealer|epoxy|polyurethane|zinc[- ]rich|enamel|coating|banding|undercoat)\b/i;
const RAL_REGEX = /\bRAL\s*\d{4}\b/i;
const LITRES_REGEX = /\b(\d+(?:\.\d+)?)\s*(?:l|ltr|litre|liter|litres|liters)\b/i;

@Injectable()
export class PaintClassificationService {
  private readonly logger = new Logger(PaintClassificationService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  classifyByRules(item: LegacyStockItemForClassification): ClassificationSuggestion {
    const signals: string[] = [];
    let score = 0;

    const categoryLower = (item.category ?? "").toLowerCase();
    if (PAINT_KEYWORDS.some((keyword) => categoryLower.includes(keyword))) {
      signals.push("category contains paint keyword");
      score += 40;
    }

    const nameLower = item.name.toLowerCase();
    if (PAINT_NAME_REGEX.test(nameLower)) {
      signals.push("name matches paint pattern");
      score += 35;
    }

    if (RAL_REGEX.test(item.name) || RAL_REGEX.test(item.description ?? "")) {
      signals.push("contains RAL colour code");
      score += 25;
    }

    if (item.unitOfMeasure.toLowerCase().match(/^(l|ltr|litre|liter|litres|liters)$/)) {
      signals.push("unit of measure is litres");
      score += 15;
    }

    if (LITRES_REGEX.test(item.name) || LITRES_REGEX.test(item.description ?? "")) {
      signals.push("description references litres");
      score += 10;
    }

    if (item.supplierName) {
      const supplierLower = item.supplierName.toLowerCase();
      const paintSuppliers = ["jotun", "hempel", "international", "sigma", "ppg", "sherwin"];
      if (paintSuppliers.some((s) => supplierLower.includes(s))) {
        signals.push(`supplier is known paint manufacturer (${item.supplierName})`);
        score += 30;
      }
    }

    const confidence = Math.min(1, score / 100);
    if (score >= 60) {
      return {
        legacyStockItemId: item.id,
        label: "paint",
        confidence,
        signals,
        reasoning: `Rule-based score ${score}/100 — strong paint signals: ${signals.join("; ") || "n/a"}`,
      };
    }
    if (score >= 30) {
      return {
        legacyStockItemId: item.id,
        label: "unsure",
        confidence,
        signals,
        reasoning: `Rule-based score ${score}/100 — ambiguous, consider AI review`,
      };
    }
    return {
      legacyStockItemId: item.id,
      label: "consumable",
      confidence: 1 - confidence,
      signals,
      reasoning: `Rule-based score ${score}/100 — defaulting to consumable`,
    };
  }

  async classifyBatchWithAi(
    items: ReadonlyArray<LegacyStockItemForClassification>,
  ): Promise<ClassificationSuggestion[]> {
    const ruleResults = items.map((item) => this.classifyByRules(item));
    const ambiguous = ruleResults.filter((result) => result.label === "unsure");
    if (ambiguous.length === 0) {
      return ruleResults;
    }

    const ambiguousItems = ambiguous
      .map((result) => items.find((item) => item.id === result.legacyStockItemId))
      .filter((item): item is LegacyStockItemForClassification => item !== undefined);

    const aiResults = await this.aiClassifyOnly(ambiguousItems);
    const aiMap = new Map(aiResults.map((r) => [r.legacyStockItemId, r]));
    return ruleResults.map((result) => aiMap.get(result.legacyStockItemId) ?? result);
  }

  private async aiClassifyOnly(
    items: ReadonlyArray<LegacyStockItemForClassification>,
  ): Promise<ClassificationSuggestion[]> {
    if (items.length === 0) {
      return [];
    }
    const systemPrompt = `You are a stock control classification assistant. Your job is to look at a list of stock items and classify each as either "paint" or "consumable". Paint includes primers, topcoats, intermediate coats, sealers, epoxies, polyurethanes, zinc-rich coatings, enamels, banding paints, and any other surface-protection coating. Consumable is everything else (tools, brushes, rags, fasteners, abrasives, PPE, cleaning supplies, etc.).

Respond with a JSON array. Each entry must have:
- id: the stock item's id
- label: "paint" or "consumable"
- confidence: a number between 0.0 and 1.0
- reasoning: a one-sentence explanation

Output only the JSON array. No prose. No markdown fences.`;

    const userPrompt = `Classify these stock items:\n\n${items
      .map(
        (item) =>
          `id=${item.id} | sku=${item.sku} | name=${item.name} | category=${item.category ?? "?"} | uom=${item.unitOfMeasure} | desc=${item.description ?? "?"}`,
      )
      .join("\n")}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userPrompt }],
        systemPrompt,
      );
      const cleaned = this.stripCodeFences(response.content);
      const parsed = JSON.parse(cleaned) as Array<{
        id: number;
        label: ClassificationLabel;
        confidence: number;
        reasoning: string;
      }>;
      return parsed.map((row) => ({
        legacyStockItemId: row.id,
        label: row.label,
        confidence: row.confidence,
        signals: ["AI classification"],
        reasoning: row.reasoning,
      }));
    } catch (err) {
      this.logger.error(
        `AI classification failed for batch of ${items.length} items: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return items.map((item) => ({
        legacyStockItemId: item.id,
        label: "unsure",
        confidence: 0,
        signals: ["AI classification failed"],
        reasoning: "AI call failed; manual review required",
      }));
    }
  }

  private stripCodeFences(content: string): string {
    const trimmed = content.trim();
    if (trimmed.startsWith("```")) {
      const withoutFirstFence = trimmed.replace(/^```(?:json)?\s*/i, "");
      return withoutFirstFence.replace(/```$/, "").trim();
    }
    return trimmed;
  }
}
