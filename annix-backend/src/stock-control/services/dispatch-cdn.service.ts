import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { CdnLineMatch, DispatchCdn } from "../entities/dispatch-cdn.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardJobFile } from "../entities/job-card-job-file.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";

const CDN_EXTRACTION_PROMPT = `You are a document extraction assistant for a piping/fabrication company.
You are analysing a Customer Delivery Note (CDN) document.

Extract:
1. The CDN/delivery note number (if visible)
2. All line items listed on the delivery note, including description and quantity

Return JSON only in this exact format:
{
  "cdnNumber": "string or null",
  "items": [
    { "description": "item description text", "quantity": number_or_null }
  ]
}

Return ONLY valid JSON, no markdown fences, no explanation.`;

interface CdnExtractionResult {
  cdnNumber: string | null;
  items: Array<{ description: string; quantity: number | null }>;
}

@Injectable()
export class DispatchCdnService {
  private readonly logger = new Logger(DispatchCdnService.name);

  constructor(
    @InjectRepository(DispatchCdn)
    private readonly cdnRepo: Repository<DispatchCdn>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @InjectRepository(JobCardJobFile)
    private readonly jobFileRepo: Repository<JobCardJobFile>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async uploadAndAnalyse(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    user: { id: number; name: string },
  ): Promise<DispatchCdn> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const storagePath = `${StorageArea.STOCK_CONTROL}/dispatch-cdns/company-${companyId}/jc-${jobCardId}`;
    const stored = await this.storageService.upload(file, storagePath);

    const cdn = this.cdnRepo.create({
      jobCardId,
      companyId,
      filePath: stored.path,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.cdnRepo.save(cdn);

    this.storeInJobFile(companyId, jobCardId, file, stored.path, user).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Failed to store CDN in job file: ${message}`);
    });

    this.analyseInBackground(saved.id, companyId, jobCardId, file).catch((err) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`CDN AI analysis failed: ${message}`);
    });

    return saved;
  }

  async cdnsForJobCard(companyId: number, jobCardId: number): Promise<DispatchCdn[]> {
    const cdns = await this.cdnRepo.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });

    return Promise.all(
      cdns.map(async (cdn) => {
        const url = await this.storageService.presignedUrl(cdn.filePath, 3600);
        return { ...cdn, filePath: url };
      }),
    );
  }

  async updateLineMatches(
    companyId: number,
    cdnId: number,
    lineMatches: CdnLineMatch[],
  ): Promise<DispatchCdn> {
    const cdn = await this.cdnRepo.findOne({
      where: { id: cdnId, companyId },
    });

    if (!cdn) {
      throw new NotFoundException(`CDN ${cdnId} not found`);
    }

    cdn.lineMatches = lineMatches;
    return this.cdnRepo.save(cdn);
  }

  async deleteCdn(companyId: number, cdnId: number): Promise<void> {
    const cdn = await this.cdnRepo.findOne({
      where: { id: cdnId, companyId },
    });

    if (!cdn) {
      throw new NotFoundException(`CDN ${cdnId} not found`);
    }

    await this.cdnRepo.remove(cdn);
  }

  async hasCdns(companyId: number, jobCardId: number): Promise<boolean> {
    const count = await this.cdnRepo.count({
      where: { jobCardId, companyId },
    });
    return count > 0;
  }

  private async storeInJobFile(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    filePath: string,
    user: { id: number; name: string },
  ): Promise<void> {
    const extension = file.originalname.split(".").pop() || "";
    const jobFile = this.jobFileRepo.create({
      jobCardId,
      companyId,
      filePath,
      originalFilename: file.originalname,
      aiGeneratedName: `Customer Delivery Note - ${file.originalname}`,
      fileType: extension.toLowerCase(),
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      uploadedById: user.id,
      uploadedByName: user.name,
    });
    await this.jobFileRepo.save(jobFile);
  }

  private async analyseInBackground(
    cdnId: number,
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
  ): Promise<void> {
    const lineItems = await this.lineItemRepo.find({
      where: { jobCardId, companyId },
      order: { sortOrder: "ASC" },
    });

    const lineItemContext = lineItems
      .map(
        (li, idx) =>
          `${idx + 1}. [ID:${li.id}] ${li.itemDescription || "No description"} (Qty: ${li.quantity || "N/A"})`,
      )
      .join("\n");

    const isPdf =
      file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    const isImage = file.mimetype.startsWith("image/");

    let extraction: CdnExtractionResult = { cdnNumber: null, items: [] };

    if (isPdf || isImage) {
      const imageBase64 = file.buffer.toString("base64");
      const mediaType = isPdf ? "application/pdf" : file.mimetype;

      const matchPrompt = `Extract the delivery note details from this document.

The job card has these line items:
${lineItemContext}

${CDN_EXTRACTION_PROMPT}`;

      try {
        const { content: response } = await this.aiChatService.chatWithImage(
          imageBase64,
          mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
          matchPrompt,
          CDN_EXTRACTION_PROMPT,
        );

        const cleaned = response
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        extraction = JSON.parse(cleaned) as CdnExtractionResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.warn(`CDN extraction failed for CDN ${cdnId}: ${message}`);
      }
    }

    const lineMatches: CdnLineMatch[] = extraction.items.map((cdnItem) => {
      const match = this.fuzzyMatchLineItem(cdnItem, lineItems);
      return {
        lineItemId: match.lineItem?.id || null,
        cdnDescription: cdnItem.description,
        cdnQuantity: cdnItem.quantity,
        matchedDescription: match.lineItem?.itemDescription || null,
        matchedQuantity: match.lineItem?.quantity ? Number(match.lineItem.quantity) : null,
        confidence: match.confidence,
        dispatched: false,
      };
    });

    await this.cdnRepo.update(cdnId, {
      cdnNumber: extraction.cdnNumber,
      lineMatches,
      aiRawResponse: JSON.stringify(extraction),
    });

    this.logger.log(
      `CDN ${cdnId} analysed: ${lineMatches.length} items matched for JC ${jobCardId}`,
    );
  }

  private fuzzyMatchLineItem(
    cdnItem: { description: string; quantity: number | null },
    lineItems: JobCardLineItem[],
  ): { lineItem: JobCardLineItem | null; confidence: number } {
    if (lineItems.length === 0) {
      return { lineItem: null, confidence: 0 };
    }

    const cdnDesc = cdnItem.description.toLowerCase().trim();
    let bestMatch: JobCardLineItem | null = null;
    let bestScore = 0;

    lineItems.forEach((li) => {
      const liDesc = (li.itemDescription || "").toLowerCase().trim();
      if (!liDesc) {
        return;
      }

      const cdnWords = cdnDesc.split(/\s+/);
      const liWords = liDesc.split(/\s+/);
      const commonWords = cdnWords.filter((w) => liWords.includes(w));
      const wordScore = commonWords.length / Math.max(cdnWords.length, liWords.length);

      const qtyBonus =
        cdnItem.quantity !== null &&
        li.quantity !== null &&
        Number(cdnItem.quantity) === Number(li.quantity)
          ? 0.2
          : 0;

      const score = Math.min(wordScore + qtyBonus, 1);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = li;
      }
    });

    return { lineItem: bestMatch, confidence: Math.round(bestScore * 100) / 100 };
  }
}
