import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IdentifiedItem, IdentifyItemResponse } from "../dto/identify-item.dto";
import { StockItem } from "../entities/stock-item.entity";

@Injectable()
export class ItemIdentificationService {
  private readonly logger = new Logger(ItemIdentificationService.name);

  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    private readonly aiChatService: AiChatService,
  ) {}

  async identifyForIssuance(
    companyId: number,
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  ): Promise<{
    productName: string | null;
    batchNumber: string | null;
    confidence: number;
    analysis: string;
    matchingStockItems: IdentifyItemResponse["matchingStockItems"];
  }> {
    const systemPrompt = `You are an expert at reading product labels and packaging in industrial/commercial settings.
Your job is to extract the product name and batch/lot number from photos of items being issued from a store.

Respond in JSON format:
{
  "productName": "the product name as shown on the label",
  "batchNumber": "the batch number, lot number, or serial number visible on the label",
  "confidence": 0.0-1.0,
  "analysis": "brief description of what you see"
}

Rules:
- Look for batch numbers, lot numbers, serial numbers, manufacture dates that serve as batch identifiers
- The product name should match what is printed on the label/packaging
- If you cannot find a batch number, set it to null
- If you cannot identify the product, set productName to null
- Be precise with numbers and characters — do not guess`;

    try {
      const { content: response } = await this.aiChatService.chatWithImage(
        imageBase64,
        mediaType,
        "Please identify the product name and batch/lot number from this photo of a stock item.",
        systemPrompt,
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed: Record<string, unknown> = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      const productName = (parsed.productName as string) || null;
      const batchNumber = (parsed.batchNumber as string) || null;
      const confidence = (parsed.confidence as number) || 0;
      const analysis = (parsed.analysis as string) || "";

      const matchingStockItems = productName
        ? await this.findMatchingStockItems(companyId, [
            {
              name: productName,
              category: "",
              description: "",
              confidence,
              suggestedSku: "",
            },
          ])
        : [];

      return { productName, batchNumber, confidence, analysis, matchingStockItems };
    } catch (error) {
      this.logger.error(`Issuance photo identification failed: ${error.message}`);
      throw error;
    }
  }

  async identifyFromPhoto(
    companyId: number,
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
    context?: string,
  ): Promise<IdentifyItemResponse> {
    const systemPrompt = `You are an expert at identifying industrial materials, parts, and supplies from photos.
Your job is to analyze images and identify items that might be found in a stock control system.

Respond in JSON format with the following structure:
{
  "items": [
    {
      "name": "descriptive name of the item",
      "category": "category (e.g., Paint, Coating, Fastener, Pipe Fitting, Safety Equipment, etc.)",
      "description": "brief description including any visible specifications",
      "confidence": 0.0-1.0,
      "suggestedSku": "suggested SKU code based on common naming conventions"
    }
  ],
  "analysis": "brief explanation of what you see in the image"
}

If you cannot identify any items or the image is unclear, return an empty items array with an explanation in the analysis field.`;

    const prompt = context
      ? `Please identify the items in this image. Additional context: ${context}`
      : "Please identify the items in this image.";

    try {
      const { content: response } = await this.aiChatService.chatWithImage(
        imageBase64,
        mediaType,
        prompt,
        systemPrompt,
      );

      const parsed = this.parseJsonResponse(response);
      const identifiedItems: IdentifiedItem[] = parsed.items || [];

      const matchingStockItems = await this.findMatchingStockItems(companyId, identifiedItems);

      return {
        identifiedItems,
        matchingStockItems,
        rawAnalysis: parsed.analysis || "",
      };
    } catch (error) {
      this.logger.error(`Item identification failed: ${error.message}`);
      throw error;
    }
  }

  private parseJsonResponse(response: string): { items: IdentifiedItem[]; analysis: string } {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn("No JSON found in response");
      return { items: [], analysis: response };
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.warn(`Failed to parse JSON response: ${error.message}`);
      return { items: [], analysis: response };
    }
  }

  private async findMatchingStockItems(
    companyId: number,
    identifiedItems: IdentifiedItem[],
  ): Promise<IdentifyItemResponse["matchingStockItems"]> {
    if (identifiedItems.length === 0) {
      return [];
    }

    const searchTerms = identifiedItems.flatMap((item) => [
      item.name,
      item.category,
      ...item.name.split(" ").filter((word) => word.length > 2),
    ]);

    const uniqueTerms = [...new Set(searchTerms)];

    const validTerms = uniqueTerms.filter((term) => term && term.length >= 2);

    const matchingItems = await validTerms.reduce(async (accPromise, term) => {
      const acc = await accPromise;
      const items = await this.stockItemRepo.find({
        where: [
          { companyId, name: ILike(`%${term}%`) },
          { companyId, category: ILike(`%${term}%`) },
          { companyId, description: ILike(`%${term}%`) },
        ],
        take: 10,
      });

      return items.reduce((innerAcc, item) => {
        const existing = innerAcc.get(item.id);
        const termScore = this.calculateSimilarity(term, item.name);
        if (existing) {
          return new Map([
            ...innerAcc,
            [item.id, { item, score: Math.max(existing.score, termScore) }],
          ]);
        }
        return new Map([...innerAcc, [item.id, { item, score: termScore }]]);
      }, acc);
    }, Promise.resolve(new Map<number, { item: StockItem; score: number }>()));

    return Array.from(matchingItems.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ item, score }) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        similarity: Math.round(score * 100) / 100,
      }));
  }

  private calculateSimilarity(term: string, text: string): number {
    const normalizedTerm = term.toLowerCase();
    const normalizedText = text.toLowerCase();

    if (normalizedText === normalizedTerm) return 1.0;
    if (normalizedText.includes(normalizedTerm)) {
      return 0.8 + (normalizedTerm.length / normalizedText.length) * 0.2;
    }

    const termWords = normalizedTerm.split(/\s+/);
    const textWords = normalizedText.split(/\s+/);

    const matchedWords = termWords.filter((termWord) =>
      textWords.some((textWord) => textWord.includes(termWord) || termWord.includes(textWord)),
    ).length;

    return matchedWords / Math.max(termWords.length, textWords.length);
  }
}
