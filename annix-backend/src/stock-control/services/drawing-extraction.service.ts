import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");

interface ExtractedDimension {
  description: string;
  diameterMm: number | null;
  lengthM: number | null;
  quantity: number;
  itemType: string | null;
  externalSurfaceM2: number | null;
  internalSurfaceM2: number | null;
}

interface DrawingExtractionResult {
  dimensions: ExtractedDimension[];
  totalExternalM2: number;
  totalInternalM2: number;
  rawText: string;
  confidence: number;
}

const DRAWING_EXTRACTION_PROMPT = `You are a pipe fabrication drawing dimension extractor. Extract pipe dimensions from the provided drawing text.

Return JSON only with this structure:
{
  "dimensions": [
    {
      "description": "300NB x 6m Straight Pipe",
      "diameterMm": 300,
      "lengthM": 6,
      "quantity": 2,
      "itemType": "pipe" | "bend" | "tee" | "reducer" | "flange" | "other"
    }
  ],
  "confidence": 0.85
}

Rules:
- Extract ALL pipe items mentioned with their dimensions
- Parse diameters in NB (Nominal Bore) or mm format
- Parse lengths in metres (m) or millimetres (mm) - convert mm to m
- Identify item types: pipe, bend, tee, reducer, flange, other
- Set confidence based on clarity of extracted data (0.0 to 1.0)
- If diameter or length cannot be determined, set to null
- Default quantity to 1 if not specified
- Return valid JSON only, no additional text`;

@Injectable()
export class DrawingExtractionService {
  private readonly logger = new Logger(DrawingExtractionService.name);

  constructor(
    @InjectRepository(JobCardAttachment)
    private readonly attachmentRepo: Repository<JobCardAttachment>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async uploadAttachment(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    uploadedBy: string | null,
    notes: string | null,
  ): Promise<JobCardAttachment> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const uploadResult = await this.storageService.upload(file, "stock-control/job-card-drawings");

    const attachment = this.attachmentRepo.create({
      jobCardId,
      companyId,
      filePath: uploadResult.path,
      originalFilename: file.originalname,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      uploadedBy,
      notes,
      extractionStatus: ExtractionStatus.PENDING,
      extractedData: {},
    });

    const saved = await this.attachmentRepo.save(attachment);
    this.logger.log(`Uploaded attachment ${saved.id} for job card ${jobCardId}`);

    const signedUrl = await this.storageService.getPresignedUrl(saved.filePath, 3600);
    return { ...saved, filePath: signedUrl };
  }

  async attachments(companyId: number, jobCardId: number): Promise<JobCardAttachment[]> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const attachmentRecords = await this.attachmentRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });

    const attachmentsWithUrls = await Promise.all(
      attachmentRecords.map(async (attachment) => {
        const normalizedPath = this.normalizeStoragePath(attachment.filePath);
        const signedUrl = await this.storageService.getPresignedUrl(normalizedPath, 3600);
        return { ...attachment, filePath: signedUrl };
      }),
    );

    return attachmentsWithUrls;
  }

  async attachmentById(
    companyId: number,
    jobCardId: number,
    attachmentId: number,
  ): Promise<JobCardAttachment> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId, jobCardId, companyId },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    return attachment;
  }

  async deleteAttachment(
    companyId: number,
    jobCardId: number,
    attachmentId: number,
  ): Promise<void> {
    const attachment = await this.attachmentById(companyId, jobCardId, attachmentId);
    await this.attachmentRepo.remove(attachment);
    this.logger.log(`Deleted attachment ${attachmentId} from job card ${jobCardId}`);
  }

  async triggerExtraction(
    companyId: number,
    jobCardId: number,
    attachmentId: number,
  ): Promise<JobCardAttachment> {
    const attachment = await this.attachmentById(companyId, jobCardId, attachmentId);

    attachment.extractionStatus = ExtractionStatus.PROCESSING;
    await this.attachmentRepo.save(attachment);

    try {
      const result = await this.extractFromAttachment(attachment);

      attachment.extractionStatus = ExtractionStatus.ANALYSED;
      attachment.extractedData = result as unknown as Record<string, unknown>;
      attachment.extractedAt = now().toJSDate();
      attachment.extractionError = null;

      const saved = await this.attachmentRepo.save(attachment);
      this.logger.log(
        `Extraction complete for attachment ${attachmentId}: ${result.dimensions.length} dimensions, totalExtM2=${result.totalExternalM2}`,
      );

      const signedUrl = await this.storageService.getPresignedUrl(saved.filePath, 3600);
      return { ...saved, filePath: signedUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      attachment.extractionStatus = ExtractionStatus.FAILED;
      attachment.extractionError = message;
      await this.attachmentRepo.save(attachment);
      this.logger.error(`Extraction failed for attachment ${attachmentId}: ${message}`);
      throw err;
    }
  }

  private async extractFromAttachment(
    attachment: JobCardAttachment,
  ): Promise<DrawingExtractionResult> {
    const isPdf =
      attachment.mimeType === "application/pdf" ||
      attachment.originalFilename.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return {
        dimensions: [],
        totalExternalM2: 0,
        totalInternalM2: 0,
        rawText: "",
        confidence: 0,
      };
    }

    const pdfText = await this.extractPdfText(attachment.filePath);
    const aiResult = await this.extractDimensionsWithAi(pdfText);
    const dimensionsWithSurface = aiResult.dimensions.map((dim) => this.calculateSurfaceArea(dim));

    const totalExternalM2 = dimensionsWithSurface.reduce(
      (sum, d) => sum + (d.externalSurfaceM2 ?? 0) * d.quantity,
      0,
    );
    const totalInternalM2 = dimensionsWithSurface.reduce(
      (sum, d) => sum + (d.internalSurfaceM2 ?? 0) * d.quantity,
      0,
    );

    return {
      dimensions: dimensionsWithSurface,
      totalExternalM2: Math.round(totalExternalM2 * 100) / 100,
      totalInternalM2: Math.round(totalInternalM2 * 100) / 100,
      rawText: pdfText.substring(0, 5000),
      confidence: aiResult.confidence,
    };
  }

  private async extractPdfText(storagePath: string): Promise<string> {
    const normalizedPath = this.normalizeStoragePath(storagePath);
    const dataBuffer = await this.storageService.download(normalizedPath);

    const parser = new PDFParse({ data: dataBuffer });
    await parser.load();
    const textResult = await parser.getText();
    return textResult?.text || "";
  }

  private normalizeStoragePath(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      const urlWithoutQuery = pathOrUrl.split("?")[0];
      return urlWithoutQuery.replace(/^https?:\/\/[^/]+\//, "");
    }
    return pathOrUrl;
  }

  private async extractDimensionsWithAi(pdfText: string): Promise<{
    dimensions: ExtractedDimension[];
    confidence: number;
  }> {
    if (!pdfText.trim()) {
      return { dimensions: [], confidence: 0 };
    }

    const truncatedText = pdfText.substring(0, 15000);

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Extract pipe dimensions from this drawing text:\n\n"${truncatedText}"\n\nRespond with JSON only.`,
      },
    ];

    const { content: response } = await this.aiChatService.chat(
      messages,
      DRAWING_EXTRACTION_PROMPT,
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn("AI response did not contain valid JSON for drawing extraction");
      return { dimensions: [], confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const dimensions: ExtractedDimension[] = (parsed.dimensions || []).map((dim: any) => ({
      description: dim.description || "Unknown item",
      diameterMm: dim.diameterMm ?? null,
      lengthM: dim.lengthM ?? null,
      quantity: dim.quantity || 1,
      itemType: dim.itemType || "other",
      externalSurfaceM2: null,
      internalSurfaceM2: null,
    }));

    return {
      dimensions,
      confidence: parsed.confidence || 0.5,
    };
  }

  private calculateSurfaceArea(dim: ExtractedDimension): ExtractedDimension {
    if (!dim.diameterMm || !dim.lengthM) {
      return dim;
    }

    const diameterM = dim.diameterMm / 1000;
    const circumference = Math.PI * diameterM;
    const externalSurfaceM2 = circumference * dim.lengthM;

    const wallThicknessMm = this.estimateWallThickness(dim.diameterMm);
    const internalDiameterM = (dim.diameterMm - 2 * wallThicknessMm) / 1000;
    const internalCircumference = Math.PI * internalDiameterM;
    const internalSurfaceM2 = internalCircumference * dim.lengthM;

    return {
      ...dim,
      externalSurfaceM2: Math.round(externalSurfaceM2 * 100) / 100,
      internalSurfaceM2: Math.round(internalSurfaceM2 * 100) / 100,
    };
  }

  private estimateWallThickness(diameterMm: number): number {
    if (diameterMm <= 50) return 3.2;
    if (diameterMm <= 100) return 4.5;
    if (diameterMm <= 200) return 6.3;
    if (diameterMm <= 400) return 8.0;
    if (diameterMm <= 600) return 9.5;
    return 12.7;
  }
}
