import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { pdfToPng } from "pdf-to-png-converter";
import { In, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  ChatMessage,
  ImageContent,
  TextContent,
} from "../../nix/ai-providers/claude-chat.provider";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { JobCard } from "../entities/job-card.entity";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";

interface ExtractedDimension {
  description: string;
  diameterMm: number | null;
  lengthM: number | null;
  quantity: number;
  itemType: string | null;
  externalSurfaceM2: number | null;
  internalSurfaceM2: number | null;
}

interface TankExtractionData {
  assemblyType: "tank" | "chute" | "hopper" | "underpan" | "custom";
  drawingReference: string | null;
  overallLengthMm: number | null;
  overallWidthMm: number | null;
  overallHeightMm: number | null;
  liningType: string | null;
  liningThicknessMm: number | null;
  liningAreaM2: number | null;
  coatingAreaM2: number | null;
  coatingSystem: string | null;
  surfacePrepStandard: string | null;
  plateParts: Array<{
    mark: string;
    description: string;
    thicknessMm: number;
    quantity: number;
  }>;
}

export interface DrawingExtractionResult {
  drawingType: "pipe" | "tank_chute";
  dimensions: ExtractedDimension[];
  tankData: TankExtractionData | null;
  totalExternalM2: number;
  totalInternalM2: number;
  totalLiningM2: number;
  totalCoatingM2: number;
  rawText: string;
  confidence: number;
}

const DRAWING_EXTRACTION_PROMPT = `You are an expert at analysing engineering drawing images. You can handle both pipe drawings and welded steel plate structure drawings (tanks, chutes, hoppers, underpans).

You are viewing high-resolution images of engineering drawing pages. Read all dimension annotations, BOM tables, title blocks, and specification notes visible in the images.

First, determine the drawing type:
- "pipe" — pipe spools, piping isometrics, pipe fabrication drawings
- "tank_chute" — welded steel plate assemblies: tanks, chutes, hoppers, underpans, bins

For PIPE drawings, return:
{
  "drawingType": "pipe",
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

For TANK/CHUTE drawings, return:
{
  "drawingType": "tank_chute",
  "tankData": {
    "assemblyType": "tank" | "chute" | "hopper" | "underpan" | "custom",
    "drawingReference": "GPW-017",
    "overallLengthMm": 7238,
    "overallWidthMm": 5241,
    "overallHeightMm": 2852,
    "liningType": "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake" | null,
    "liningThicknessMm": 6,
    "liningAreaM2": 75.00,
    "coatingAreaM2": 82.50,
    "coatingSystem": "Epoxy primer + polyurethane topcoat",
    "surfacePrepStandard": "Sa 2.5",
    "plateParts": [
      { "mark": "P1", "description": "Side plate", "thicknessMm": 10, "quantity": 2 }
    ]
  },
  "dimensions": [],
  "confidence": 0.90
}

Rules:
- Determine drawing type from title block, BOM content, and drawing conventions
- Tank drawings typically show: plate BOM tables, rubber lining specs (m² area, thickness), overall assembly dimensions, drawing numbers like "GPW-xxx"
- For tanks: liningAreaM2 is the internal rubber/ceramic lining surface area from the drawing
- For tanks: coatingAreaM2 is the external paint/coating surface area from the drawing
- For pipes: extract diameters in NB or mm, lengths in m or mm (convert to m)
- Set confidence based on clarity of extracted data (0.0 to 1.0)
- Default quantity to 1 if not specified
- Return valid JSON only, no additional text`;

const MULTI_DOC_EXTRACTION_PROMPT = `You are an expert at analysing engineering drawing images. You are viewing pages from multiple engineering documents for the same fabrication job. Cross-reference information across documents.

You are viewing high-resolution images of engineering drawing pages. Read all dimension annotations, BOM tables, title blocks, and specification notes visible in the images.

BOM tables in one document may reference detail dimensions in another. Drawing reference numbers (e.g., GPW-017) may appear across documents — use these to link related sheets. Combine all findings into a single extraction result. Do not duplicate items that appear in multiple documents.

Prioritise BOM tables and schedules for quantities and material specs. Use detail drawings for dimensions that are not clear on GA drawings. Handle drawing number cross-references (e.g., "See Detail A on Sheet 3").

First, determine the drawing type:
- "pipe" — pipe spools, piping isometrics, pipe fabrication drawings
- "tank_chute" — welded steel plate assemblies: tanks, chutes, hoppers, underpans, bins

For PIPE drawings, return:
{
  "drawingType": "pipe",
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

For TANK/CHUTE drawings, return:
{
  "drawingType": "tank_chute",
  "tankData": {
    "assemblyType": "tank" | "chute" | "hopper" | "underpan" | "custom",
    "drawingReference": "GPW-017",
    "overallLengthMm": 7238,
    "overallWidthMm": 5241,
    "overallHeightMm": 2852,
    "liningType": "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake" | null,
    "liningThicknessMm": 6,
    "liningAreaM2": 75.00,
    "coatingAreaM2": 82.50,
    "coatingSystem": "Epoxy primer + polyurethane topcoat",
    "surfacePrepStandard": "Sa 2.5",
    "plateParts": [
      { "mark": "P1", "description": "Side plate", "thicknessMm": 10, "quantity": 2 }
    ]
  },
  "dimensions": [],
  "confidence": 0.90
}

Rules:
- Determine drawing type from title block, BOM content, and drawing conventions
- Tank drawings typically show: plate BOM tables, rubber lining specs (m² area, thickness), overall assembly dimensions, drawing numbers like "GPW-xxx"
- For tanks: liningAreaM2 is the internal rubber/ceramic lining surface area from the drawing
- For tanks: coatingAreaM2 is the external paint/coating surface area from the drawing
- For pipes: extract diameters in NB or mm, lengths in m or mm (convert to m)
- Set confidence based on clarity of extracted data (0.0 to 1.0)
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
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
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

      await this.updateLineItemsFromExtraction(companyId, jobCardId, result);

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

  async extractAllFromJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<DrawingExtractionResult> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const allAttachments = await this.attachmentRepo.find({
      where: {
        jobCardId,
        companyId,
        extractionStatus: In([
          ExtractionStatus.PENDING,
          ExtractionStatus.ANALYSED,
          ExtractionStatus.FAILED,
        ]),
      },
    });

    if (allAttachments.length === 0) {
      this.logger.log(`No extractable attachments for job card ${jobCardId}`);
      return this.emptyResult();
    }

    await this.attachmentRepo.update(
      allAttachments.map((a) => a.id),
      { extractionStatus: ExtractionStatus.PROCESSING },
    );

    try {
      const contentParts: (TextContent | ImageContent)[] = [];

      for (const attachment of allAttachments) {
        const isDxf = this.isDxfFile(attachment);
        const isPdf = this.isPdfFile(attachment);

        if (isPdf) {
          contentParts.push({
            type: "text",
            text: `--- Pages from: ${attachment.originalFilename} ---`,
          });
          const normalizedPath = this.normalizeStoragePath(attachment.filePath);
          const pdfBuffer = await this.storageService.download(normalizedPath);
          const images = await this.convertPdfToImages(pdfBuffer);
          const imageContents = images.map(
            (img): ImageContent => ({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: img.toString("base64"),
              },
            }),
          );
          contentParts.push(...imageContents);
        } else if (isDxf) {
          const normalizedPath = this.normalizeStoragePath(attachment.filePath);
          const fileBuffer = await this.storageService.download(normalizedPath);
          const dxfText = this.parseDxfFile(fileBuffer);
          contentParts.push({
            type: "text",
            text: `--- DXF data from: ${attachment.originalFilename} ---\n${dxfText}`,
          });
        }
      }

      if (contentParts.length === 0) {
        await this.attachmentRepo.update(
          allAttachments.map((a) => a.id),
          { extractionStatus: ExtractionStatus.PENDING },
        );
        return this.emptyResult();
      }

      contentParts.push({
        type: "text",
        text: "Analyse all the above engineering drawing pages and DXF data. Cross-reference information across documents. Respond with JSON only.",
      });

      const isMultiDoc = allAttachments.length > 1;
      const prompt = isMultiDoc ? MULTI_DOC_EXTRACTION_PROMPT : DRAWING_EXTRACTION_PROMPT;

      const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
      const { content: response } = await this.aiChatService.chat(messages, prompt, "claude");
      const aiResult = this.parseAiResponse(response);
      const result = this.buildExtractionResult(aiResult);

      const updateTime = now().toJSDate();
      const updatedAttachments = allAttachments.map((a) => ({
        ...a,
        extractionStatus: ExtractionStatus.ANALYSED,
        extractedData: result as unknown as Record<string, unknown>,
        extractedAt: updateTime,
        extractionError: null,
      }));
      await this.attachmentRepo.save(updatedAttachments);

      await this.updateLineItemsFromExtraction(companyId, jobCardId, result);

      this.logger.log(
        `Multi-doc extraction complete for job card ${jobCardId}: ${allAttachments.length} attachments processed`,
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.attachmentRepo.update(
        allAttachments.map((a) => a.id),
        {
          extractionStatus: ExtractionStatus.FAILED,
          extractionError: message,
        },
      );
      this.logger.error(`Multi-doc extraction failed for job card ${jobCardId}: ${message}`);
      throw err;
    }
  }

  private async extractFromAttachment(
    attachment: JobCardAttachment,
  ): Promise<DrawingExtractionResult> {
    const isPdf = this.isPdfFile(attachment);
    const isDxf = this.isDxfFile(attachment);

    if (!isPdf && !isDxf) {
      return this.emptyResult();
    }

    const normalizedPath = this.normalizeStoragePath(attachment.filePath);
    const fileBuffer = await this.storageService.download(normalizedPath);

    if (isDxf) {
      const dxfText = this.parseDxfFile(fileBuffer);
      const messages: ChatMessage[] = [
        {
          role: "user",
          content: `Extract dimensions from this DXF drawing data:\n\n${dxfText}\n\nRespond with JSON only.`,
        },
      ];
      const { content: response } = await this.aiChatService.chat(
        messages,
        DRAWING_EXTRACTION_PROMPT,
      );
      const aiResult = this.parseAiResponse(response);
      return this.buildExtractionResult(aiResult);
    }

    const images = await this.convertPdfToImages(fileBuffer);
    const aiResult = await this.extractDimensionsWithVision(images);
    return this.buildExtractionResult(aiResult);
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    this.logger.log("Converting PDF to images for vision extraction...");
    const pdfInput = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    const pages = await pdfToPng(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 2.0,
    });
    this.logger.log(`Converted PDF to ${pages.length} image(s)`);

    const allImages = pages
      .filter((page) => page.content !== undefined)
      .map((page) => page.content as Buffer);

    if (allImages.length <= 20) {
      return allImages;
    }

    this.logger.warn(`PDF has ${allImages.length} pages, capping at 20 (first 10 + last 10)`);
    return [...allImages.slice(0, 10), ...allImages.slice(-10)];
  }

  private async extractDimensionsWithVision(images: Buffer[]): Promise<{
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  }> {
    if (images.length === 0) {
      return { drawingType: "pipe", dimensions: [], tankData: null, confidence: 0 };
    }

    const contentParts: (TextContent | ImageContent)[] = images.map(
      (img): ImageContent => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: img.toString("base64"),
        },
      }),
    );

    contentParts.push({
      type: "text",
      text: "Analyse these engineering drawing pages. Extract all dimensions, BOM data, and specifications. Respond with JSON only.",
    });

    const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
    const { content: response } = await this.aiChatService.chat(
      messages,
      DRAWING_EXTRACTION_PROMPT,
      "claude",
    );

    return this.parseAiResponse(response);
  }

  private parseDxfFile(fileBuffer: Buffer): string {
    try {
      const DxfParser = require("dxf-parser");
      const dxfString = fileBuffer.toString("utf-8");
      const parser = new DxfParser();
      const dxf = parser.parseSync(dxfString);

      if (!dxf || !dxf.entities) {
        return dxfString.substring(0, 15000);
      }

      const textEntries: string[] = dxf.entities
        .filter((entity: any) => ["TEXT", "MTEXT", "DIMENSION"].includes(entity.type))
        .map((entity: any) => {
          const layer = entity.layer ? `[Layer: ${entity.layer}]` : "";
          const text = entity.text || entity.string || entity.value || "";
          return `${layer} ${text}`.trim();
        })
        .filter((text: string) => text.length > 0);

      const blockRefs: string[] = dxf.entities
        .filter((entity: any) => entity.type === "INSERT")
        .map((entity: any) => `[Block: ${entity.name || "unnamed"}]`);

      const combined = [...textEntries, ...blockRefs].join("\n");
      return combined || dxfString.substring(0, 15000);
    } catch (err) {
      this.logger.warn(
        `DXF parsing failed, using raw text: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      return fileBuffer.toString("utf-8").substring(0, 15000);
    }
  }

  private parseAiResponse(response: string): {
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  } {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn("AI response did not contain valid JSON for drawing extraction");
      return { drawingType: "pipe", dimensions: [], tankData: null, confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const drawingType = parsed.drawingType === "tank_chute" ? "tank_chute" : "pipe";

    if (drawingType === "tank_chute" && parsed.tankData) {
      const td = parsed.tankData;
      const tankData: TankExtractionData = {
        assemblyType: td.assemblyType || "custom",
        drawingReference: td.drawingReference || null,
        overallLengthMm: td.overallLengthMm ?? null,
        overallWidthMm: td.overallWidthMm ?? null,
        overallHeightMm: td.overallHeightMm ?? null,
        liningType: td.liningType || null,
        liningThicknessMm: td.liningThicknessMm ?? null,
        liningAreaM2: td.liningAreaM2 ?? null,
        coatingAreaM2: td.coatingAreaM2 ?? null,
        coatingSystem: td.coatingSystem || null,
        surfacePrepStandard: td.surfacePrepStandard || null,
        plateParts: Array.isArray(td.plateParts)
          ? td.plateParts.map((p: any) => ({
              mark: p.mark || "",
              description: p.description || "",
              thicknessMm: p.thicknessMm ?? 0,
              quantity: p.quantity ?? 1,
            }))
          : [],
      };

      return {
        drawingType: "tank_chute",
        dimensions: [],
        tankData,
        confidence: parsed.confidence || 0.5,
      };
    }

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
      drawingType: "pipe",
      dimensions,
      tankData: null,
      confidence: parsed.confidence || 0.5,
    };
  }

  private buildExtractionResult(aiResult: {
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  }): DrawingExtractionResult {
    if (aiResult.drawingType === "tank_chute" && aiResult.tankData) {
      const liningM2 = aiResult.tankData.liningAreaM2 ?? 0;
      const coatingM2 = aiResult.tankData.coatingAreaM2 ?? 0;

      return {
        drawingType: "tank_chute",
        dimensions: [],
        tankData: aiResult.tankData,
        totalExternalM2: coatingM2,
        totalInternalM2: liningM2,
        totalLiningM2: Math.round(liningM2 * 100) / 100,
        totalCoatingM2: Math.round(coatingM2 * 100) / 100,
        rawText: "",
        confidence: aiResult.confidence,
      };
    }

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
      drawingType: "pipe",
      dimensions: dimensionsWithSurface,
      tankData: null,
      totalExternalM2: Math.round(totalExternalM2 * 100) / 100,
      totalInternalM2: Math.round(totalInternalM2 * 100) / 100,
      totalLiningM2: 0,
      totalCoatingM2: 0,
      rawText: "",
      confidence: aiResult.confidence,
    };
  }

  private normalizeStoragePath(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      const urlWithoutQuery = pathOrUrl.split("?")[0];
      return urlWithoutQuery.replace(/^https?:\/\/[^/]+\//, "");
    }
    return pathOrUrl;
  }

  private isPdfFile(attachment: JobCardAttachment): boolean {
    return (
      attachment.mimeType === "application/pdf" ||
      attachment.originalFilename.toLowerCase().endsWith(".pdf")
    );
  }

  private isDxfFile(attachment: JobCardAttachment): boolean {
    return (
      attachment.mimeType === "application/dxf" ||
      attachment.mimeType === "application/x-dxf" ||
      attachment.originalFilename.toLowerCase().endsWith(".dxf")
    );
  }

  private emptyResult(): DrawingExtractionResult {
    return {
      drawingType: "pipe",
      dimensions: [],
      tankData: null,
      totalExternalM2: 0,
      totalInternalM2: 0,
      totalLiningM2: 0,
      totalCoatingM2: 0,
      rawText: "",
      confidence: 0,
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

  private async updateLineItemsFromExtraction(
    companyId: number,
    jobCardId: number,
    result: DrawingExtractionResult,
  ): Promise<void> {
    if (result.drawingType === "tank_chute" && result.tankData) {
      await this.createTankLineItems(companyId, jobCardId, result);
      return;
    }

    if (result.dimensions.length === 0) {
      return;
    }

    const lineItems = await this.lineItemRepo.find({
      where: { jobCardId, companyId },
      order: { sortOrder: "ASC" },
    });

    if (lineItems.length === 0) {
      return;
    }

    const updatedItems: JobCardLineItem[] = [];

    lineItems.forEach((lineItem) => {
      const description = (lineItem.itemDescription || "").toLowerCase();
      const matchedDim = this.findMatchingDimension(description, result.dimensions);

      if (matchedDim?.externalSurfaceM2) {
        const totalM2 = matchedDim.externalSurfaceM2 * (lineItem.quantity || 1);
        lineItem.m2 = Math.round(totalM2 * 100) / 100;
        updatedItems.push(lineItem);
      }
    });

    if (updatedItems.length > 0) {
      await this.lineItemRepo.save(updatedItems);
      this.logger.log(
        `Updated ${updatedItems.length} line items with m² from extraction for job card ${jobCardId}`,
      );
    }
  }

  private async createTankLineItems(
    companyId: number,
    jobCardId: number,
    result: DrawingExtractionResult,
  ): Promise<void> {
    const tankData = result.tankData;
    if (!tankData) return;

    const existingItems = await this.lineItemRepo.find({
      where: { jobCardId, companyId },
      order: { sortOrder: "ASC" },
    });

    const maxSortOrder = existingItems.reduce((max, item) => Math.max(max, item.sortOrder), 0);
    const newItems: Partial<JobCardLineItem>[] = [];
    let sortOrder = maxSortOrder;

    const assemblyLabel =
      tankData.assemblyType.charAt(0).toUpperCase() + tankData.assemblyType.slice(1);
    const drawingRef = tankData.drawingReference ? ` (${tankData.drawingReference})` : "";

    if (tankData.liningAreaM2 && tankData.liningAreaM2 > 0) {
      sortOrder += 1;
      const liningDesc = [
        `${assemblyLabel} Internal Lining${drawingRef}`,
        tankData.liningType ? `Type: ${tankData.liningType}` : null,
        tankData.liningThicknessMm ? `${tankData.liningThicknessMm}mm thick` : null,
      ]
        .filter(Boolean)
        .join(" - ");

      newItems.push({
        jobCardId,
        companyId,
        itemDescription: liningDesc,
        itemCode: tankData.drawingReference || null,
        quantity: 1,
        m2: Math.round(tankData.liningAreaM2 * 100) / 100,
        sortOrder,
      });
    }

    if (tankData.coatingAreaM2 && tankData.coatingAreaM2 > 0) {
      sortOrder += 1;
      const coatingDesc = [
        `${assemblyLabel} External Coating${drawingRef}`,
        tankData.coatingSystem || null,
        tankData.surfacePrepStandard ? `Prep: ${tankData.surfacePrepStandard}` : null,
      ]
        .filter(Boolean)
        .join(" - ");

      newItems.push({
        jobCardId,
        companyId,
        itemDescription: coatingDesc,
        itemCode: tankData.drawingReference || null,
        quantity: 1,
        m2: Math.round(tankData.coatingAreaM2 * 100) / 100,
        sortOrder,
      });
    }

    if (newItems.length > 0) {
      const created = this.lineItemRepo.create(newItems);
      await this.lineItemRepo.save(created);
      this.logger.log(
        `Created ${newItems.length} tank line items for job card ${jobCardId} (lining: ${tankData.liningAreaM2 ?? 0} m², coating: ${tankData.coatingAreaM2 ?? 0} m²)`,
      );
    }
  }

  private findMatchingDimension(
    lineItemDescription: string,
    dimensions: ExtractedDimension[],
  ): ExtractedDimension | null {
    const nbMatch = lineItemDescription.match(/(\d+)\s*nb/i);
    const lineItemNb = nbMatch ? parseInt(nbMatch[1], 10) : null;

    const isBend = /bend/i.test(lineItemDescription);
    const isPipe = /pipe|straight/i.test(lineItemDescription);
    const isTee = /tee/i.test(lineItemDescription);
    const isReducer = /reducer/i.test(lineItemDescription);

    const lineItemType = isBend
      ? "bend"
      : isPipe
        ? "pipe"
        : isTee
          ? "tee"
          : isReducer
            ? "reducer"
            : null;

    const matches = dimensions.filter((dim) => {
      if (lineItemNb && dim.diameterMm) {
        const dimNb = dim.diameterMm;
        if (Math.abs(dimNb - lineItemNb) > 25) {
          return false;
        }
      }

      if (lineItemType && dim.itemType) {
        if (dim.itemType.toLowerCase() !== lineItemType) {
          return false;
        }
      }

      return true;
    });

    return matches.length > 0 ? matches[0] : dimensions.length > 0 ? dimensions[0] : null;
  }
}
