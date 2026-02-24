import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { ClaudeChatProvider } from "../../nix/ai-providers/claude-chat.provider";
import { IdentifiedItem, IdentifyItemResponse } from "../dto/identify-item.dto";
import { StockItem } from "../entities/stock-item.entity";

@Injectable()
export class ItemIdentificationService {
  private readonly logger = new Logger(ItemIdentificationService.name);
  private readonly claudeProvider: ClaudeChatProvider;

  constructor(
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
  ) {
    this.claudeProvider = new ClaudeChatProvider({
      maxTokens: 2048,
      temperature: 0.3,
    });
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
      const response = await this.claudeProvider.chatWithImage(
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

    const matchingItems: Map<number, { item: StockItem; score: number }> = new Map();

    for (const term of uniqueTerms) {
      if (!term || term.length < 2) continue;

      const items = await this.stockItemRepo.find({
        where: [
          { companyId, name: ILike(`%${term}%`) },
          { companyId, category: ILike(`%${term}%`) },
          { companyId, description: ILike(`%${term}%`) },
        ],
        take: 10,
      });

      for (const item of items) {
        const existing = matchingItems.get(item.id);
        const termScore = this.calculateSimilarity(term, item.name);
        if (existing) {
          existing.score = Math.max(existing.score, termScore);
        } else {
          matchingItems.set(item.id, { item, score: termScore });
        }
      }
    }

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

    let matchedWords = 0;
    for (const termWord of termWords) {
      if (
        textWords.some((textWord) => textWord.includes(termWord) || termWord.includes(textWord))
      ) {
        matchedWords++;
      }
    }

    return matchedWords / Math.max(termWords.length, textWords.length);
  }
}
