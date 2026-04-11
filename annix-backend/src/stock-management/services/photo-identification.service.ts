import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IssuableProduct } from "../entities/issuable-product.entity";

export type PhotoIdentificationKind = "paint" | "consumable" | "rubber_roll" | "other";

export interface PhotoIdentificationResult {
  kind: PhotoIdentificationKind;
  extracted: {
    productName: string | null;
    sku: string | null;
    batchNumber: string | null;
    rollNumber: string | null;
    weightKg: number | null;
    widthMm: number | null;
    thicknessMm: number | null;
    lengthM: number | null;
    compoundCode: string | null;
    colour: string | null;
  };
  confidence: number;
  matches: Array<{
    productId: number;
    sku: string;
    name: string;
    productType: string;
    similarity: number;
  }>;
  reasoning: string;
}

@Injectable()
export class PhotoIdentificationService {
  private readonly logger = new Logger(PhotoIdentificationService.name);

  constructor(
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    private readonly aiChatService: AiChatService,
  ) {}

  async identify(
    companyId: number,
    imageBase64: string,
    mimeType: string,
  ): Promise<PhotoIdentificationResult> {
    if (!mimeType.startsWith("image/")) {
      throw new Error(`Unsupported image mime type "${mimeType}" — expected image/*`);
    }

    const classification = await this.classifyAndExtract(imageBase64, mimeType);
    const matches = await this.findMatchingProducts(companyId, classification);

    return {
      kind: classification.kind,
      extracted: classification.extracted,
      confidence: classification.confidence,
      matches,
      reasoning: classification.reasoning,
    };
  }

  private async classifyAndExtract(
    _imageBase64: string,
    _mimeType: string,
  ): Promise<{
    kind: PhotoIdentificationKind;
    extracted: PhotoIdentificationResult["extracted"];
    confidence: number;
    reasoning: string;
  }> {
    const systemPrompt = `You are a stock control photo identification assistant. You receive a photo of an item from a warehouse and you classify it into one of: paint, consumable, rubber_roll, or other. You also extract any visible identifiers.

Return a JSON object with these fields:
- kind: one of "paint" | "consumable" | "rubber_roll" | "other"
- productName: visible product name on the label/tag (string or null)
- sku: visible SKU code (string or null)
- batchNumber: visible batch number (string or null)
- rollNumber: visible roll number (rubber rolls only, string or null)
- weightKg: weight if printed on the tag (number or null)
- widthMm: width if printed (number or null)
- thicknessMm: thickness if printed (number or null)
- lengthM: length if printed (number or null)
- compoundCode: rubber compound code if printed (string or null)
- colour: visible colour of the item (string or null)
- confidence: 0.0 to 1.0
- reasoning: one-sentence explanation of the classification

Output only the JSON object. No prose. No markdown fences.`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: "Identify and extract data from this stock item photo." }],
        systemPrompt,
      );
      const cleaned = this.stripCodeFences(response.content);
      const parsed = JSON.parse(cleaned) as {
        kind: PhotoIdentificationKind;
        productName: string | null;
        sku: string | null;
        batchNumber: string | null;
        rollNumber: string | null;
        weightKg: number | null;
        widthMm: number | null;
        thicknessMm: number | null;
        lengthM: number | null;
        compoundCode: string | null;
        colour: string | null;
        confidence: number;
        reasoning: string;
      };
      return {
        kind: parsed.kind,
        extracted: {
          productName: parsed.productName,
          sku: parsed.sku,
          batchNumber: parsed.batchNumber,
          rollNumber: parsed.rollNumber,
          weightKg: parsed.weightKg,
          widthMm: parsed.widthMm,
          thicknessMm: parsed.thicknessMm,
          lengthM: parsed.lengthM,
          compoundCode: parsed.compoundCode,
          colour: parsed.colour,
        },
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (err) {
      this.logger.error(
        `Photo identification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        kind: "other",
        extracted: {
          productName: null,
          sku: null,
          batchNumber: null,
          rollNumber: null,
          weightKg: null,
          widthMm: null,
          thicknessMm: null,
          lengthM: null,
          compoundCode: null,
          colour: null,
        },
        confidence: 0,
        reasoning: "AI extraction failed",
      };
    }
  }

  private async findMatchingProducts(
    companyId: number,
    classification: {
      kind: PhotoIdentificationKind;
      extracted: PhotoIdentificationResult["extracted"];
    },
  ): Promise<PhotoIdentificationResult["matches"]> {
    const candidates: IssuableProduct[] = [];
    const searchTerms = [
      classification.extracted.sku,
      classification.extracted.productName,
      classification.extracted.rollNumber,
    ].filter((t): t is string => typeof t === "string" && t.length > 0);

    for (const term of searchTerms) {
      const bySku = await this.productRepo.find({
        where: { companyId, sku: ILike(`%${term}%`) },
        take: 5,
      });
      const byName = await this.productRepo.find({
        where: { companyId, name: ILike(`%${term}%`) },
        take: 5,
      });
      candidates.push(...bySku, ...byName);
    }

    const seen = new Set<number>();
    const unique = candidates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return unique.slice(0, 10).map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      productType: p.productType,
      similarity: this.computeSimilarity(p, classification.extracted),
    }));
  }

  private computeSimilarity(
    product: IssuableProduct,
    extracted: PhotoIdentificationResult["extracted"],
  ): number {
    let score = 0;
    const productLower = `${product.sku} ${product.name}`.toLowerCase();
    if (extracted.sku && productLower.includes(extracted.sku.toLowerCase())) {
      score += 0.5;
    }
    if (extracted.productName && productLower.includes(extracted.productName.toLowerCase())) {
      score += 0.3;
    }
    if (extracted.rollNumber && productLower.includes(extracted.rollNumber.toLowerCase())) {
      score += 0.4;
    }
    return Math.min(1, score);
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
