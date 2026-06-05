import { Inject, Injectable, Logger } from "@nestjs/common";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import {
  extractTextFromExcel,
  extractTextFromPdf,
  extractTextFromWord,
} from "../../lib/document-extraction";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import {
  CANDIDATE_SENIORITY_LEVELS,
  type CandidateSeniority,
  ExtractedCvData,
} from "../entities/candidate.entity";
import { CV_EXTRACTION_SYSTEM_PROMPT, cvExtractionPrompt } from "../prompts/cv-analysis.prompt";

type SupportedCvFormat = "pdf" | "docx" | "xlsx" | "unsupported";

const CV_OCR_PROMPT =
  "Transcribe ALL readable text from this CV/résumé document verbatim, preserving the natural reading order (headings, sections, bullet points, dates). The document may be written in English, Afrikaans, isiZulu, or another South African language. Output plain text only — no commentary, no markdown.";

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

  async extractTextFromCv(storagePath: string): Promise<string> {
    const format = detectCvFormat(storagePath);
    if (format === "unsupported") {
      throw new Error(
        "Unsupported CV file format. Please upload a PDF, Word (.docx), or Excel (.xlsx) file.",
      );
    }

    const buffer = await this.storageService.download(storagePath);

    if (format === "docx") return extractTextFromWord(buffer);
    if (format === "xlsx") return extractTextFromExcel(buffer);

    const pdfText = await extractTextFromPdf(buffer);
    if (pdfText.trim().length > 0) {
      return pdfText;
    }

    this.logger.warn(`No text layer in PDF ${storagePath} — falling back to Gemini vision OCR.`);
    return this.ocrPdf(buffer);
  }

  private async ocrPdf(buffer: Buffer): Promise<string> {
    try {
      const { content, providerUsed, tokensUsed } = await this.aiChatService.chatWithImage(
        buffer.toString("base64"),
        "application/pdf",
        CV_OCR_PROMPT,
      );

      this.aiUsageService.log({
        app: AiApp.ANNIX_ORBIT,
        actionType: "cv-ocr",
        provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
        model: providerUsed,
        tokensUsed,
      });

      return content.trim();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini vision OCR failed for CV PDF: ${msg}`);
      return "";
    }
  }

  async extractDataFromCv(cvText: string): Promise<ExtractedCvData> {
    try {
      const { content, providerUsed, tokensUsed } = await this.aiChatService.chat(
        [{ role: "user", content: cvExtractionPrompt(cvText) }],
        CV_EXTRACTION_SYSTEM_PROMPT,
        "gemini",
      );

      this.aiUsageService.log({
        app: AiApp.ANNIX_ORBIT,
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

    const asPositiveRand = (val: unknown): number | null =>
      typeof val === "number" && Number.isFinite(val) && val > 0 ? Math.round(val) : null;

    const asSeniority = (val: unknown): CandidateSeniority | null =>
      typeof val === "string" && (CANDIDATE_SENIORITY_LEVELS as readonly string[]).includes(val)
        ? (val as CandidateSeniority)
        : null;

    const rawSalaryMin = asPositiveRand(raw.suggestedSalaryMin);
    const rawSalaryMax = asPositiveRand(raw.suggestedSalaryMax);
    // Keep the band ordered: if Nix returns them inverted, swap rather than drop.
    const suggestedSalaryMin =
      rawSalaryMin !== null && rawSalaryMax !== null
        ? Math.min(rawSalaryMin, rawSalaryMax)
        : rawSalaryMin;
    const suggestedSalaryMax =
      rawSalaryMin !== null && rawSalaryMax !== null
        ? Math.max(rawSalaryMin, rawSalaryMax)
        : rawSalaryMax;

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
      seniority: asSeniority(raw.seniority),
      suggestedSalaryMin,
      suggestedSalaryMax,
    };
  }
}
