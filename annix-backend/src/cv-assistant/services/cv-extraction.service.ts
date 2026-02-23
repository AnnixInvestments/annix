import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import pdfParse from "pdf-parse";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ExtractedCvData } from "../entities/candidate.entity";
import { CV_EXTRACTION_SYSTEM_PROMPT, cvExtractionPrompt } from "../prompts/cv-analysis.prompt";

@Injectable()
export class CvExtractionService {
  private readonly logger = new Logger(CvExtractionService.name);

  constructor(private readonly aiChatService: AiChatService) {}

  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const dataBuffer = fs.readFileSync(absolutePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } catch (error) {
      this.logger.error(`Failed to extract text from PDF: ${error.message}`);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  async extractDataFromCv(cvText: string): Promise<ExtractedCvData> {
    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: cvExtractionPrompt(cvText) }],
        CV_EXTRACTION_SYSTEM_PROMPT,
        "gemini",
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const extractedData = JSON.parse(jsonMatch[0]) as ExtractedCvData;

      return {
        candidateName: extractedData.candidateName || null,
        email: extractedData.email || null,
        phone: extractedData.phone || null,
        experienceYears: extractedData.experienceYears || null,
        skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
        education: Array.isArray(extractedData.education) ? extractedData.education : [],
        certifications: Array.isArray(extractedData.certifications)
          ? extractedData.certifications
          : [],
        references: Array.isArray(extractedData.references) ? extractedData.references : [],
        summary: extractedData.summary || null,
      };
    } catch (error) {
      this.logger.error(`Failed to extract CV data: ${error.message}`);
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
      };
    }
  }

  async processCV(filePath: string): Promise<{ text: string; data: ExtractedCvData }> {
    const text = await this.extractTextFromPdf(filePath);
    const data = await this.extractDataFromCv(text);
    return { text, data };
  }
}
