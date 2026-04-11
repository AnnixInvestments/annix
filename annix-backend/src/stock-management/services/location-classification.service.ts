import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IssuableProduct } from "../entities/issuable-product.entity";

const UNASSIGNED_LOCATION_NAME = "Unassigned";

export interface LocationCandidate {
  id: number;
  name: string;
  description?: string | null;
}

export interface LocationClassificationSuggestion {
  productId: number;
  productSku: string;
  productName: string;
  suggestedLocationId: number | null;
  alternativeLocationIds: number[];
  confidence: number;
  reasoning: string;
  signals: string[];
}

const HIGH_CONFIDENCE = 0.85;
const MEDIUM_CONFIDENCE = 0.6;

@Injectable()
export class LocationClassificationService {
  private readonly logger = new Logger(LocationClassificationService.name);

  constructor(
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    private readonly aiChatService: AiChatService,
    private readonly dataSource: DataSource,
  ) {}

  async ensureUnassignedLocation(companyId: number): Promise<{ id: number; name: string }> {
    const existing = await this.dataSource.query(
      "SELECT id, name FROM stock_control_locations WHERE company_id = $1 AND name = $2 LIMIT 1",
      [companyId, UNASSIGNED_LOCATION_NAME],
    );
    if (existing.length > 0) {
      return { id: Number(existing[0].id), name: existing[0].name };
    }
    const inserted = await this.dataSource.query(
      `INSERT INTO stock_control_locations (company_id, name, description, active, created_at, updated_at)
       VALUES ($1, $2, $3, true, now(), now())
       RETURNING id, name`,
      [
        companyId,
        UNASSIGNED_LOCATION_NAME,
        "Auto-generated fallback for products with no confident classification",
      ],
    );
    this.logger.log(
      `Created Unassigned fallback location ${inserted[0].id} for company ${companyId}`,
    );
    return { id: Number(inserted[0].id), name: inserted[0].name };
  }

  async assignToUnassigned(companyId: number, productIds: number[]): Promise<{ updated: number }> {
    if (productIds.length === 0) {
      return { updated: 0 };
    }
    const fallback = await this.ensureUnassignedLocation(companyId);
    const result = await this.productRepo.update(
      { id: In(productIds), companyId },
      { locationId: fallback.id },
    );
    const affected = result.affected;
    return { updated: affected == null ? 0 : affected };
  }

  async classifyUnassignedProducts(
    companyId: number,
    locations: ReadonlyArray<LocationCandidate>,
  ): Promise<LocationClassificationSuggestion[]> {
    if (locations.length === 0) {
      return [];
    }
    const unassigned = await this.productRepo.find({
      where: { companyId, locationId: IsNull(), active: true },
    });
    if (unassigned.length === 0) {
      return [];
    }

    const ruleResults = unassigned.map((product) => this.classifyByRules(product, locations));
    const ambiguous = ruleResults.filter(
      (result) => result.confidence < HIGH_CONFIDENCE && result.confidence >= MEDIUM_CONFIDENCE,
    );
    if (ambiguous.length === 0) {
      return ruleResults;
    }

    const aiResults = await this.aiClassifyAmbiguous(unassigned, ambiguous, locations);
    const aiMap = new Map(aiResults.map((r) => [r.productId, r]));
    return ruleResults.map((result) => aiMap.get(result.productId) ?? result);
  }

  private classifyByRules(
    product: IssuableProduct,
    locations: ReadonlyArray<LocationCandidate>,
  ): LocationClassificationSuggestion {
    const signals: string[] = [];
    const productLower = `${product.name} ${product.sku}`.toLowerCase();

    const matches = locations
      .map((location) => {
        const locationLower = location.name.toLowerCase();
        const tokens = locationLower.split(/[\s\-_/]+/).filter((t) => t.length > 2);
        const overlap = tokens.filter((token) => productLower.includes(token)).length;
        return { location, score: overlap };
      })
      .sort((a, b) => b.score - a.score);

    const top = matches[0];
    if (top && top.score > 0) {
      signals.push(`name overlap with location "${top.location.name}" (${top.score} tokens)`);
      const confidence = Math.min(0.9, 0.5 + top.score * 0.15);
      const alternativeIds = matches
        .slice(1, 4)
        .filter((m) => m.score > 0)
        .map((m) => m.location.id);
      return {
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        suggestedLocationId: top.location.id,
        alternativeLocationIds: alternativeIds,
        confidence,
        reasoning: `Token overlap: ${signals.join("; ")}`,
        signals,
      };
    }

    return {
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      suggestedLocationId: null,
      alternativeLocationIds: locations.slice(0, 3).map((l) => l.id),
      confidence: 0,
      reasoning: "No strong signal from rule-based classifier",
      signals: ["no rule match"],
    };
  }

  private async aiClassifyAmbiguous(
    allProducts: IssuableProduct[],
    ambiguousResults: LocationClassificationSuggestion[],
    locations: ReadonlyArray<LocationCandidate>,
  ): Promise<LocationClassificationSuggestion[]> {
    const ambiguousProducts = ambiguousResults
      .map((r) => allProducts.find((p) => p.id === r.productId))
      .filter((p): p is IssuableProduct => p !== undefined);

    const systemPrompt = `You are a warehouse location classification assistant. You receive a list of unassigned stock products and a list of physical warehouse locations. For each product, choose the most likely location and a confidence score.

Output a JSON array. Each entry must have:
- productId: integer
- locationId: integer or null
- confidence: number 0-1
- reasoning: one-sentence explanation

Output only the JSON array. No prose. No markdown fences.`;

    const userPrompt = `LOCATIONS:\n${locations
      .map((l) => `id=${l.id} name="${l.name}" desc="${l.description ?? ""}"`)
      .join("\n")}

PRODUCTS:
${ambiguousProducts
  .map(
    (p) =>
      `id=${p.id} type=${p.productType} sku=${p.sku} name="${p.name}" desc="${p.description ?? ""}"`,
  )
  .join("\n")}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userPrompt }],
        systemPrompt,
      );
      const cleaned = this.stripCodeFences(response.content);
      const parsed = JSON.parse(cleaned) as Array<{
        productId: number;
        locationId: number | null;
        confidence: number;
        reasoning: string;
      }>;
      return parsed.map((row) => {
        const product = allProducts.find((p) => p.id === row.productId);
        return {
          productId: row.productId,
          productSku: product?.sku ?? `?-${row.productId}`,
          productName: product?.name ?? "?",
          suggestedLocationId: row.locationId,
          alternativeLocationIds: [],
          confidence: row.confidence,
          reasoning: row.reasoning,
          signals: ["AI classification"],
        };
      });
    } catch (err) {
      this.logger.error(
        `AI location classification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return ambiguousResults;
    }
  }

  async applyClassifications(
    companyId: number,
    decisions: ReadonlyArray<{ productId: number; locationId: number | null }>,
  ): Promise<{ updated: number }> {
    let updated = 0;
    for (const decision of decisions) {
      if (decision.locationId === null) continue;
      await this.productRepo.update(
        { id: decision.productId, companyId },
        { locationId: decision.locationId },
      );
      updated += 1;
    }
    return { updated };
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
