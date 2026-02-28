import { Injectable, Logger } from "@nestjs/common";
import { ExtractedDeliveryNoteData } from "./entities/rubber-delivery-note.entity";
import { ExtractedCocData, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import {
  CALENDARER_COC_SYSTEM_PROMPT,
  COMPOUNDER_COC_SYSTEM_PROMPT,
  calendererCocExtractionPrompt,
  compounderCocExtractionPrompt,
  DELIVERY_NOTE_SYSTEM_PROMPT,
  deliveryNoteExtractionPrompt,
} from "./prompts/rubber-coc.prompt";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

@Injectable()
export class RubberCocExtractionService {
  private readonly logger = new Logger(RubberCocExtractionService.name);
  private readonly apiKey: string;
  private readonly model = "gemini-2.0-flash";
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured - CoC extraction will be unavailable");
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async extractCompounderCoc(pdfText: string): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log("Extracting compounder CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      COMPOUNDER_COC_SYSTEM_PROMPT,
      compounderCocExtractionPrompt(pdfText),
    );

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(`Compounder CoC extracted in ${processingTimeMs}ms`);

    return {
      data: response.data as ExtractedCocData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractCalendererCoc(pdfText: string): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log("Extracting calenderer CoC data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      CALENDARER_COC_SYSTEM_PROMPT,
      calendererCocExtractionPrompt(pdfText),
    );

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(`Calenderer CoC extracted in ${processingTimeMs}ms`);

    return {
      data: response.data as ExtractedCocData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractDeliveryNote(pdfText: string): Promise<{
    data: ExtractedDeliveryNoteData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    this.logger.log("Extracting delivery note data...");

    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await this.callGemini(
      DELIVERY_NOTE_SYSTEM_PROMPT,
      deliveryNoteExtractionPrompt(pdfText),
    );

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(`Delivery note extracted in ${processingTimeMs}ms`);

    return {
      data: response.data as ExtractedDeliveryNoteData,
      tokensUsed: response.tokensUsed,
      processingTimeMs,
    };
  }

  async extractByType(
    cocType: SupplierCocType,
    pdfText: string,
  ): Promise<{
    data: ExtractedCocData;
    tokensUsed?: number;
    processingTimeMs: number;
  }> {
    return cocType === SupplierCocType.COMPOUNDER
      ? this.extractCompounderCoc(pdfText)
      : this.extractCalendererCoc(pdfText);
  }

  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ data: Record<string, unknown>; tokensUsed?: number }> {
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
              parts: [{ text: systemPrompt }, { text: userPrompt }],
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

    const data: GeminiResponse = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      this.logger.warn("No content in Gemini response");
      return { data: {}, tokensUsed: data.usageMetadata?.totalTokenCount };
    }

    const parsed = this.parseJsonResponse(content);
    return {
      data: parsed,
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  }

  private parseJsonResponse(content: string): Record<string, unknown> {
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${error.message}`);
      this.logger.debug(`Raw content: ${content.substring(0, 500)}`);
      return {};
    }
  }
}
