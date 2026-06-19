import { Inject, Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import {
  extractTextFromExcel,
  extractTextFromPdf,
  extractTextFromWord,
} from "../../lib/document-extraction";
import { LibreOfficeConversionService } from "../../lib/libreoffice-conversion.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import {
  CANDIDATE_SENIORITY_LEVELS,
  type CandidateSeniority,
  ExtractedCvData,
} from "../entities/candidate.entity";
import { CV_EXTRACTION_SYSTEM_PROMPT, cvExtractionPrompt } from "../prompts/cv-analysis.prompt";

type SupportedCvFormat = "pdf" | "docx" | "doc" | "rtf" | "odt" | "xlsx" | "image" | "unsupported";

type VisionMediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

const CV_OCR_PROMPT =
  "Transcribe ALL readable text from this CV/résumé document verbatim, preserving the natural reading order (headings, sections, bullet points, dates). The document may be written in English, Afrikaans, isiZulu, or another South African language. Output plain text only — no commentary, no markdown.";

// CVs are front-loaded: name, contact, summary, skills and recent roles sit in
// the first few pages, while pages 5+ are usually references, portfolios or
// publication lists. Vision OCR bills input tokens per page, so cap the pages
// sent to Gemini rather than transcribing an entire 30-page portfolio.
const MAX_OCR_PAGES = 5;

// Vision needs legible glyphs, not print resolution. Phone/scanner CV images
// arrive at 3000-4000px; downscaling the long edge to ~1500px keeps text sharp
// while cutting the base64 payload (and the vision input-token bill) sharply.
const MAX_OCR_IMAGE_DIMENSION = 1500;

function detectCvFormat(filePath: string): SupportedCvFormat {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".doc")) return "doc";
  if (lower.endsWith(".rtf")) return "rtf";
  if (lower.endsWith(".odt")) return "odt";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  if (/\.(jpe?g|png|webp)$/.test(lower)) return "image";
  return "unsupported";
}

function imageMediaType(filePath: string): VisionMediaType | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

@Injectable()
export class CvExtractionService {
  private readonly logger = new Logger(CvExtractionService.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
    private readonly aiUsageService: AiUsageService,
    private readonly libreOffice: LibreOfficeConversionService,
  ) {}

  async extractTextFromCv(storagePath: string): Promise<string> {
    const format = detectCvFormat(storagePath);
    if (format === "unsupported") {
      throw new Error(
        "Unsupported CV file format. Please upload a PDF, Word (.doc/.docx), or image (JPG/PNG) file.",
      );
    }

    const buffer = await this.storageService.download(storagePath);

    if (format === "xlsx") return extractTextFromExcel(buffer);

    if (format === "image") {
      const mediaType = imageMediaType(storagePath);
      return mediaType ? this.ocrViaVision(buffer, mediaType) : "";
    }

    if (format === "pdf") return this.extractFromPdfBuffer(buffer);

    // Modern .docx has a real text layer — read it directly before paying for a
    // conversion. Empty means an image-only docx, so fall through to LibreOffice.
    if (format === "docx") {
      const native = (await extractTextFromWord(buffer)).trim();
      if (native.length > 0) return native;
      this.logger.warn(`No text in .docx ${storagePath} — converting via LibreOffice.`);
    }

    // Legacy .doc / .rtf / .odt (and image-only .docx): mammoth can't read these,
    // so convert to PDF with LibreOffice, then extract the text layer (OCR if scanned).
    const pdf = await this.libreOffice.convertToPdf(buffer, format);
    if (pdf) {
      return this.extractFromPdfBuffer(pdf);
    }

    // LibreOffice unavailable (e.g. local dev without soffice) — last-ditch native parse.
    if (format === "doc" || format === "docx") {
      return (await extractTextFromWord(buffer)).trim();
    }
    this.logger.warn(`Could not convert ${format} CV ${storagePath} — LibreOffice unavailable.`);
    return "";
  }

  private async extractFromPdfBuffer(buffer: Buffer): Promise<string> {
    const pdfText = await extractTextFromPdf(buffer);
    if (pdfText.trim().length > 0) {
      return pdfText;
    }
    this.logger.warn("No text layer in PDF — falling back to Gemini vision OCR.");
    return this.ocrViaVision(buffer, "application/pdf");
  }

  async extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
    const format = detectCvFormat(filename);
    if (format === "unsupported") {
      throw new Error(
        "Unsupported CV file format. Please upload a PDF, Word (.docx), or Excel (.xlsx) file.",
      );
    }
    if (format === "docx") return extractTextFromWord(buffer);
    if (format === "xlsx") return extractTextFromExcel(buffer);
    const pdfText = await extractTextFromPdf(buffer);
    if (pdfText.trim().length > 0) {
      return pdfText;
    }
    this.logger.warn("No text layer in uploaded CV PDF — falling back to Gemini vision OCR.");
    return this.ocrViaVision(buffer, "application/pdf");
  }

  async processBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<{ text: string; data: ExtractedCvData }> {
    const text = await this.extractTextFromBuffer(buffer, filename);
    const data = await this.extractDataFromCv(text);
    return { text, data };
  }

  private async capPdfPages(buffer: Buffer): Promise<Buffer> {
    try {
      const source = await PDFDocument.load(buffer);
      const totalPages = source.getPageCount();
      if (totalPages <= MAX_OCR_PAGES) {
        return buffer;
      }
      const capped = await PDFDocument.create();
      const indices = Array.from({ length: MAX_OCR_PAGES }, (_, i) => i);
      const copied = await capped.copyPages(source, indices);
      copied.forEach((page) => capped.addPage(page));
      const cappedBytes = await capped.save();
      this.logger.warn(
        `Capping CV vision OCR to first ${MAX_OCR_PAGES} of ${totalPages} pages to limit input tokens.`,
      );
      return Buffer.from(cappedBytes);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not cap CV PDF pages, sending full document: ${msg}`);
      return buffer;
    }
  }

  private async downscaleImage(buffer: Buffer, mediaType: VisionMediaType): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const longestEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
      if (longestEdge <= MAX_OCR_IMAGE_DIMENSION) {
        return buffer;
      }
      const resized = image.resize(MAX_OCR_IMAGE_DIMENSION, MAX_OCR_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
      const encoded =
        mediaType === "image/png"
          ? await resized.png({ compressionLevel: 9 }).toBuffer()
          : mediaType === "image/webp"
            ? await resized.webp({ quality: 85 }).toBuffer()
            : await resized.jpeg({ quality: 85, progressive: true }).toBuffer();
      this.logger.warn(
        `Downscaling CV vision image from ${longestEdge}px to ${MAX_OCR_IMAGE_DIMENSION}px to limit input tokens.`,
      );
      return encoded;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not downscale CV image, sending original: ${msg}`);
      return buffer;
    }
  }

  private async reduceVisionInput(buffer: Buffer, mediaType: VisionMediaType): Promise<Buffer> {
    if (mediaType === "application/pdf") {
      return this.capPdfPages(buffer);
    }
    return this.downscaleImage(buffer, mediaType);
  }

  private async ocrViaVision(buffer: Buffer, mediaType: VisionMediaType): Promise<string> {
    try {
      const visionBuffer = await this.reduceVisionInput(buffer, mediaType);
      const { content, providerUsed, tokensUsed } = await this.aiChatService.chatWithImage(
        visionBuffer.toString("base64"),
        mediaType,
        CV_OCR_PROMPT,
        undefined,
        { model: "gemini-2.5-flash" },
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
      this.logger.error(`Gemini vision OCR failed for CV (${mediaType}): ${msg}`);
      return "";
    }
  }

  async extractDataFromCv(cvText: string): Promise<ExtractedCvData> {
    try {
      const { content, providerUsed, tokensUsed } = await this.aiChatService.chat(
        [{ role: "user", content: cvExtractionPrompt(cvText) }],
        CV_EXTRACTION_SYSTEM_PROMPT,
        "gemini",
        { model: "gemini-2.5-flash" },
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
