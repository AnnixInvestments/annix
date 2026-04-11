import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

export interface DatasheetExtractionResult {
  data: Record<string, unknown>;
  model: string;
  notes: string | null;
}

@Injectable()
export class DatasheetExtractionService {
  private readonly logger = new Logger(DatasheetExtractionService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  async extractFromBuffer(buffer: Buffer, mimeType: string): Promise<DatasheetExtractionResult> {
    if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
      throw new Error(
        `Unsupported datasheet mime type "${mimeType}" — expected application/pdf or image/*`,
      );
    }

    const systemPrompt = `You are a chemical and materials datasheet parser. You receive product datasheets (TDS, SDS, or MSDS) for rubber compounds, paint products, or test solutions, and you extract structured information.

Return a JSON object with these top-level keys (omit any you cannot find):

For rubber compounds:
  - compoundFamily: one of NR|SBR|NBR|EPDM|CR|FKM|IIR|BR|CSM|PU|other
  - shoreHardness: integer
  - densityKgPerM3: number
  - specificGravity: number
  - tempRangeMinC: number
  - tempRangeMaxC: number
  - elongationAtBreakPct: number
  - tensileStrengthMpa: number
  - chemicalResistance: array of strings
  - defaultColour: string

For paint products:
  - coverageM2PerLitre: number
  - dryFilmThicknessUm: integer
  - wetFilmThicknessUm: integer
  - coatType: one of primer|intermediate|finish|sealer|banding
  - paintSystem: one of epoxy|polyurethane|alkyd|zinc_rich|acrylic|other
  - numberOfParts: integer (1 or 2)
  - mixingRatio: string
  - potLifeMinutes: integer
  - colourCode: string
  - glossLevel: string
  - vocContentGPerL: number
  - densityKgPerL: number
  - shelfLifeMonths: integer
  - surfacePrepRequirement: string
  - minApplicationTempC: number
  - maxApplicationTempC: number

For solutions:
  - activeIngredient: string
  - concentrationPct: number
  - densityKgPerL: number
  - hazardClassification: string
  - shelfLifeMonths: integer

Output ONLY the JSON object. No prose. No markdown fences.`;

    const userMessage = "Extract structured data from this datasheet.";
    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );
      const cleaned = this.stripCodeFences(response.content);
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      return {
        data: parsed,
        model: "gemini",
        notes: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Datasheet extraction failed: ${message}`);
      throw new Error(`Datasheet extraction failed: ${message}`);
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
