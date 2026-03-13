import { Inject, Injectable, Logger } from "@nestjs/common";
import pdfParse from "pdf-parse";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { ExtractedCvData } from "../entities/candidate.entity";
import { CV_EXTRACTION_SYSTEM_PROMPT, cvExtractionPrompt } from "../prompts/cv-analysis.prompt";

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
    const text = await this.extractTextFromPdf(filePath);
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
