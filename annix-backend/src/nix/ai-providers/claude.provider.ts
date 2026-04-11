import { Injectable, Logger } from "@nestjs/common";
import {
  AiExtractionRequest,
  AiExtractionResponse,
  AiProvider,
  AiProviderConfig,
  EXTRACTION_SYSTEM_PROMPT,
} from "./ai-provider.interface";

@Injectable()
export class ClaudeProvider implements AiProvider {
  readonly name = "claude";
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  // eslint-disable-next-line no-restricted-syntax -- canonical Claude fallback provider per CLAUDE.md AI Provider Policy
  private readonly baseUrl = "https://api.anthropic.com/v1";

  constructor(config?: AiProviderConfig) {
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.model = config?.model || "claude-3-haiku-20240307";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async extractItems(request: AiExtractionRequest): Promise<AiExtractionResponse> {
    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 8192,
          temperature: 0.1,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Claude API error: ${response.status} - ${errorText}`);
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        this.logger.warn("No content in Claude response");
        return this.emptyResponse(startTime);
      }

      const parsed = this.parseResponse(content);
      parsed.processingTimeMs = Date.now() - startTime;
      parsed.tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

      this.logger.log(
        `Claude extracted ${parsed.items.length} items in ${parsed.processingTimeMs}ms`,
      );

      return parsed;
    } catch (error) {
      this.logger.error(`Claude extraction failed: ${error.message}`);
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
        this.logger.warn("No JSON found in Claude response");
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
          ...(this.normalizeItemType(item.itemType) === "tank_chute"
            ? {
                assemblyType: this.normalizeAssemblyType(item.assemblyType),
                drawingReference: item.drawingReference || null,
                overallLengthMm: item.overallLengthMm ? Number(item.overallLengthMm) : null,
                overallWidthMm: item.overallWidthMm ? Number(item.overallWidthMm) : null,
                overallHeightMm: item.overallHeightMm ? Number(item.overallHeightMm) : null,
                totalSteelWeightKg: item.totalSteelWeightKg
                  ? Number(item.totalSteelWeightKg)
                  : null,
                liningType: item.liningType || null,
                liningThicknessMm: item.liningThicknessMm ? Number(item.liningThicknessMm) : null,
                liningAreaM2: item.liningAreaM2 ? Number(item.liningAreaM2) : null,
                coatingSystem: item.coatingSystem || null,
                coatingAreaM2: item.coatingAreaM2 ? Number(item.coatingAreaM2) : null,
                surfacePrepStandard: item.surfacePrepStandard || null,
                plateBom: Array.isArray(item.plateBom)
                  ? item.plateBom.map((row: any) => ({
                      mark: row.mark || null,
                      description: row.description || null,
                      thicknessMm: row.thicknessMm ? Number(row.thicknessMm) : null,
                      lengthMm: row.lengthMm ? Number(row.lengthMm) : null,
                      widthMm: row.widthMm ? Number(row.widthMm) : null,
                      quantity: row.quantity ? Number(row.quantity) : 1,
                      weightKg: row.weightKg ? Number(row.weightKg) : null,
                      areaM2: row.areaM2 ? Number(row.areaM2) : null,
                    }))
                  : null,
              }
            : {}),
        })),
        specifications: parsed.specifications || {},
        metadata: parsed.metadata || {},
      };
    } catch (error) {
      this.logger.error(`Failed to parse Claude response: ${error.message}`);
      this.logger.debug(`Response content: ${content.substring(0, 500)}`);
      return this.emptyResponse(0);
    }
  }

  private normalizeItemType(type: string): AiExtractionResponse["items"][0]["itemType"] {
    const normalized = (type || "").toLowerCase();
    const validTypes = [
      "pipe",
      "bend",
      "reducer",
      "tee",
      "flange",
      "expansion_joint",
      "tank_chute",
    ];
    if (validTypes.includes(normalized)) {
      return normalized as any;
    }
    if (normalized.includes("elbow")) return "bend";
    if (normalized.includes("reducing")) return "reducer";
    if (
      normalized.includes("tank") ||
      normalized.includes("chute") ||
      normalized.includes("hopper") ||
      normalized.includes("underpan")
    ) {
      return "tank_chute";
    }
    return "unknown";
  }

  private normalizeAssemblyType(
    type: string,
  ): "tank" | "chute" | "hopper" | "underpan" | "custom" | undefined {
    const normalized = (type || "").toLowerCase();
    const validTypes = ["tank", "chute", "hopper", "underpan", "custom"];
    if (validTypes.includes(normalized)) {
      return normalized as any;
    }
    return undefined;
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
