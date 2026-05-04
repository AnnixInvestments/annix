import { Inject, Injectable, Logger } from "@nestjs/common";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import * as XLSX from "xlsx";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { ExtractedCvData } from "../entities/candidate.entity";
import { CV_EXTRACTION_SYSTEM_PROMPT, cvExtractionPrompt } from "../prompts/cv-analysis.prompt";

type SupportedCvFormat = "pdf" | "docx" | "xlsx" | "unsupported";

function detectCvFormat(filePath: string): SupportedCvFormat {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  return "unsupported";
}

@Injectable()
export class CvExtractionService {
  private readonly logger = new Logger(CvExtractionService.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  async extractTextFromPdf(storagePath: string): Promise<string> {
    try {
      const dataBuffer = await this.storageService.download(storagePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to extract text from PDF: ${msg}`);
      throw new Error(`Failed to extract text from PDF: ${msg}`);
    }
  }

  async extractTextFromDocx(storagePath: string): Promise<string> {
    try {
      const dataBuffer = await this.storageService.download(storagePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to extract text from Word document: ${msg}`);
      throw new Error(`Failed to extract text from Word document: ${msg}`);
    }
  }

  async extractTextFromXlsx(storagePath: string): Promise<string> {
    try {
      const dataBuffer = await this.storageService.download(storagePath);
      const workbook = XLSX.read(dataBuffer, { type: "buffer" });
      const sheetTexts = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
        return `--- Sheet: ${name} ---\n${csv}`;
      });
      return sheetTexts.join("\n\n");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to extract text from spreadsheet: ${msg}`);
      throw new Error(`Failed to extract text from spreadsheet: ${msg}`);
    }
  }

  async extractTextFromCv(storagePath: string): Promise<string> {
    const format = detectCvFormat(storagePath);
    if (format === "pdf") return this.extractTextFromPdf(storagePath);
    if (format === "docx") return this.extractTextFromDocx(storagePath);
    if (format === "xlsx") return this.extractTextFromXlsx(storagePath);
    throw new Error(
      "Unsupported CV file format. Please upload a PDF, Word (.docx), or Excel (.xlsx) file.",
    );
  }

  async extractDataFromCv(cvText: string): Promise<ExtractedCvData> {
    try {
      const { content, providerUsed, tokensUsed } = await this.aiChatService.chat(
        [{ role: "user", content: cvExtractionPrompt(cvText) }],
        CV_EXTRACTION_SYSTEM_PROMPT,
        "gemini",
      );

      this.aiUsageService.log({
        app: AiApp.CV_ASSISTANT,
        actionType: "cv-extraction",
        provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
        model: providerUsed,
        tokensUsed,
      });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const raw = JSON.parse(jsonMatch[0]);

      return this.validateExtractedData(raw);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to extract CV data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        candidateName: null,
        email: null,
        phone: null,
        experienceYears: null,
        skills: [],
        education: [],
        certifications: [],
        references: [],
        summary: null,
        detectedLanguage: null,
        professionalRegistrations: [],
        saQualifications: [],
        location: null,
      };
    }
  }

  async processCV(filePath: string): Promise<{ text: string; data: ExtractedCvData }> {
    const text = await this.extractTextFromCv(filePath);
    const data = await this.extractDataFromCv(text);
    return { text, data };
  }

  private validateExtractedData(raw: Record<string, unknown>): ExtractedCvData {
    const asString = (val: unknown): string | null =>
      typeof val === "string" && val.length > 0 ? val : null;

    const asStringArray = (val: unknown): string[] =>
      Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : [];

    const asNumber = (val: unknown): number | null =>
      typeof val === "number" && !Number.isNaN(val) ? val : null;

    return {
      candidateName: asString(raw.candidateName),
      email: asString(raw.email),
      phone: asString(raw.phone),
      experienceYears: asNumber(raw.experienceYears),
      skills: asStringArray(raw.skills),
      education: asStringArray(raw.education),
      certifications: asStringArray(raw.certifications),
      references: Array.isArray(raw.references) ? raw.references : [],
      summary: asString(raw.summary),
      detectedLanguage: asString(raw.detectedLanguage),
      professionalRegistrations: asStringArray(raw.professionalRegistrations),
      saQualifications: asStringArray(raw.saQualifications),
      location: asString(raw.location),
    };
  }
}
