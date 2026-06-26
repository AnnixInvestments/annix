import { Injectable, Logger } from "@nestjs/common";
import { ExtractionMetricService } from "../metrics/extraction-metric.service";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { parseAiJsonObject } from "../nix/ai-providers/ai-json";
import { ChemicalSupplierDocumentService } from "./chemical-supplier-document.service";
import type { ChemicalSupplierDocumentDto } from "./dto/chemical-supplier-document.dto";
import type { ChemicalDocExtractedData } from "./entities/chemical-supplier-document.entity";
import { CocProcessingStatus } from "./entities/rubber-supplier-coc.entity";
import {
  CHEMICAL_DOCUMENT_EXTRACTION_PROMPT,
  CHEMICAL_DOCUMENT_SYSTEM_PROMPT,
} from "./prompts/chemical-document.prompt";

export const CHEMICAL_DOC_EXTRACT_METRIC_CATEGORY = "chemical-doc-extract";

@Injectable()
export class ChemicalDocExtractionService {
  private readonly logger = new Logger(ChemicalDocExtractionService.name);

  constructor(
    private readonly documentService: ChemicalSupplierDocumentService,
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  async extractDocument(id: number): Promise<ChemicalSupplierDocumentDto> {
    const pdfBuffer = await this.documentService.documentBuffer(id);

    try {
      const extracted = await this.extractionMetricService.time(
        CHEMICAL_DOC_EXTRACT_METRIC_CATEGORY,
        "EXTRACT",
        () => this.runExtraction(pdfBuffer),
        pdfBuffer.length,
      );
      await this.documentService.applyExtraction(id, extracted, CocProcessingStatus.NEEDS_REVIEW);
      return this.documentService.byId(id);
    } catch (error) {
      this.logger.error(
        `Chemical document extraction failed for ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.documentService.markFailed(id);
      throw error;
    }
  }

  private async runExtraction(pdfBuffer: Buffer): Promise<ChemicalDocExtractedData> {
    const base64 = pdfBuffer.toString("base64");
    const response = await this.aiChatService.chatWithImage(
      base64,
      "application/pdf",
      CHEMICAL_DOCUMENT_EXTRACTION_PROMPT,
      CHEMICAL_DOCUMENT_SYSTEM_PROMPT,
    );

    const parsed = parseAiJsonObject(response.content) as ChemicalDocExtractedData;
    return this.normalise(parsed);
  }

  private normalise(data: ChemicalDocExtractedData): ChemicalDocExtractedData {
    const coaTestResults = Array.isArray(data.coaTestResults)
      ? data.coaTestResults
          .filter((row) => row && typeof row.test === "string" && row.test.trim().length > 0)
          .map((row) => ({
            test: row.test.trim(),
            unit: row.unit ?? null,
            result: row.result ?? null,
            method: row.method ?? null,
          }))
      : [];

    return {
      productName: data.productName ?? null,
      supplierName: data.supplierName ?? null,
      casNumber: data.casNumber ?? null,
      deliveryNoteNumber: data.deliveryNoteNumber ?? null,
      batchNumber: data.batchNumber ?? null,
      manufactureDate: data.manufactureDate ?? null,
      expiryDate: data.expiryDate ?? null,
      unNumber: data.unNumber ?? null,
      hazardClass: data.hazardClass ?? null,
      packingGroup: data.packingGroup ?? null,
      properShippingName: data.properShippingName ?? null,
      environmentalHazard: data.environmentalHazard ?? null,
      netMassKg: typeof data.netMassKg === "number" ? data.netMassKg : null,
      volume: data.volume ?? null,
      packagingType: data.packagingType ?? null,
      packageQuantity: typeof data.packageQuantity === "number" ? data.packageQuantity : null,
      coaTestResults,
    };
  }
}
