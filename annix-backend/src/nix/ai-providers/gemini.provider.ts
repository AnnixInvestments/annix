import { Injectable, Logger } from "@nestjs/common";
import {
  AiExtractionRequest,
  AiExtractionResponse,
  AiProvider,
  AiProviderConfig,
  EXTRACTION_SYSTEM_PROMPT,
} from "./ai-provider.interface";

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(config?: AiProviderConfig) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || "";
    this.model = config?.model || "gemini-1.5-flash";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async extractItems(request: AiExtractionRequest): Promise<AiExtractionResponse> {
    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: EXTRACTION_SYSTEM_PROMPT }, { text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error: ${response.status} - ${errorText}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        this.logger.warn("No content in Gemini response");
        return this.emptyResponse(startTime);
      }

      const parsed = this.parseResponse(content);
      parsed.processingTimeMs = Date.now() - startTime;
      parsed.tokensUsed = data.usageMetadata?.totalTokenCount;

      this.logger.log(
        `Gemini extracted ${parsed.items.length} items in ${parsed.processingTimeMs}ms`,
      );

      return parsed;
    } catch (error) {
      this.logger.error(`Gemini extraction failed: ${error.message}`);
      throw error;
    }
  }

  private buildUserPrompt(request: AiExtractionRequest): string {
    let prompt = `Document: ${request.documentName || "Unknown"}\n\n`;

    if (request.hints?.projectContext) {
      prompt += `Context: ${request.hints.projectContext}\n\n`;
    }

    if (request.hints?.expectedItemTypes?.length) {
      prompt += `Expected item types: ${request.hints.expectedItemTypes.join(", ")}\n\n`;
    }

    prompt += `--- DOCUMENT TEXT ---\n${request.text}\n--- END DOCUMENT ---`;

    return prompt;
  }

  private parseResponse(content: string): AiExtractionResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn("No JSON found in Gemini response");
        return this.emptyResponse(0);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        items: (parsed.items || []).map((item: any) => ({
          itemNumber: item.itemNumber || null,
          description: item.description || "",
          itemType: this.normalizeItemType(item.itemType),
          material: item.material || null,
          materialGrade: item.materialGrade || null,
          diameter: item.diameter ? Number(item.diameter) : null,
          diameterUnit: item.diameterUnit || "mm",
          secondaryDiameter: item.secondaryDiameter ? Number(item.secondaryDiameter) : null,
          length: item.length ? Number(item.length) : null,
          wallThickness: item.wallThickness ? Number(item.wallThickness) : null,
          schedule: item.schedule || null,
          angle: item.angle ? Number(item.angle) : null,
          flangeConfig: this.normalizeFlangeConfig(item.flangeConfig),
          quantity: item.quantity ? Number(item.quantity) : 1,
          unit: item.unit || "ea",
          confidence: item.confidence ? Number(item.confidence) : 0.8,
          rawText: item.rawText || null,
        })),
        specifications: parsed.specifications || {},
        metadata: parsed.metadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini response: ${error.message}`);
      this.logger.debug(`Response content: ${content.substring(0, 500)}`);
      return this.emptyResponse(0);
    }
  }

  private normalizeItemType(type: string): AiExtractionResponse["items"][0]["itemType"] {
    const normalized = (type || "").toLowerCase();
    const validTypes = ["pipe", "bend", "reducer", "tee", "flange", "expansion_joint"];
    if (validTypes.includes(normalized)) {
      return normalized as any;
    }
    if (normalized.includes("elbow")) return "bend";
    if (normalized.includes("reducing")) return "reducer";
    return "unknown";
  }

  private normalizeFlangeConfig(config: string): AiExtractionResponse["items"][0]["flangeConfig"] {
    const normalized = (config || "").toLowerCase().replace(/\s+/g, "_");
    const validConfigs = ["none", "one_end", "both_ends", "puddle", "blind"];
    if (validConfigs.includes(normalized)) {
      return normalized as any;
    }
    return undefined;
  }

  private emptyResponse(startTime: number): AiExtractionResponse {
    return {
      items: [],
      specifications: {},
      metadata: {},
      processingTimeMs: Date.now() - startTime,
    };
  }
}
