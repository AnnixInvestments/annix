import { randomBytes } from "node:crypto";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import {
  ExtractedStatementLineItem,
  ReconciliationStatus,
  RubberStatementReconciliation,
} from "./entities/rubber-statement-reconciliation.entity";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "./entities/rubber-tax-invoice.entity";
import {
  STATEMENT_EXTRACTION_SYSTEM_PROMPT,
  STATEMENT_EXTRACTION_USER_PROMPT,
} from "./prompts/rubber-statement.prompt";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfToPngModule = require("pdf-to-png-converter");
const pdfToPng = pdfToPngModule.pdfToPng ?? pdfToPngModule;

export enum MatchResultType {
  MATCHED = "MATCHED",
  AMOUNT_DISCREPANCY = "AMOUNT_DISCREPANCY",
  NOT_IN_SYSTEM = "NOT_IN_SYSTEM",
  NOT_ON_STATEMENT = "NOT_ON_STATEMENT",
}

export interface ReconciliationMatchItem {
  invoiceNumber: string;
  statementAmount: number | null;
  systemAmount: number | null;
  matchResult: MatchResultType;
  difference: number | null;
}

export interface ReconciliationDetailDto {
  id: number;
  firebaseUid: string;
  companyId: number;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  originalFilename: string;
  extractedData: ExtractedStatementLineItem[] | null;
  status: string;
  matchSummary: { matched: number; unmatched: number; discrepancies: number } | null;
  matchItems: ReconciliationMatchItem[];
  resolvedBy: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationListDto {
  id: number;
  firebaseUid: string;
  companyId: number;
  companyName: string;
  periodYear: number;
  periodMonth: number;
  originalFilename: string;
  status: string;
  matchSummary: { matched: number; unmatched: number; discrepancies: number } | null;
  createdAt: string;
}

@Injectable()
export class RubberStatementReconciliationService {
  private readonly logger = new Logger(RubberStatementReconciliationService.name);
  private readonly geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private readonly geminiModel = "gemini-2.0-flash";
  private readonly apiKey: string;

  constructor(
    @InjectRepository(RubberStatementReconciliation)
    private readonly reconciliationRepository: Repository<RubberStatementReconciliation>,
    @InjectRepository(RubberTaxInvoice)
    private readonly taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiUsageService: AiUsageService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured - statement extraction will be unavailable");
    }
  }

  async uploadStatement(
    companyId: number,
    file: Express.Multer.File,
    year: number,
    month: number,
  ): Promise<ReconciliationListDto> {
    const subPath = `${StorageArea.AU_RUBBER}/reconciliation/${companyId}/${year}-${String(month).padStart(2, "0")}`;
    const uploadResult = await this.storageService.upload(file, subPath);

    const firebaseUid = randomBytes(16).toString("hex");
    const recon = this.reconciliationRepository.create({
      firebaseUid,
      companyId,
      periodYear: year,
      periodMonth: month,
      statementPath: uploadResult.path,
      originalFilename: file.originalname,
    });

    const saved = await this.reconciliationRepository.save(recon);
    this.logger.log(`Uploaded statement for company ${companyId}, period ${year}-${month}`);

    const withCompany = await this.reconciliationRepository.findOne({
      where: { id: saved.id },
      relations: ["company"],
    });
    return this.mapToListDto(withCompany || saved);
  }

  async extractStatement(reconciliationId: number): Promise<ReconciliationDetailDto> {
    const recon = await this.reconciliationRepository.findOne({
      where: { id: reconciliationId },
      relations: ["company"],
    });
    if (!recon) {
      throw new NotFoundException("Reconciliation not found");
    }

    recon.status = ReconciliationStatus.EXTRACTING;
    await this.reconciliationRepository.save(recon);

    const pdfBuffer = await this.storageService.download(recon.statementPath);
    const images = await this.convertPdfToImages(pdfBuffer);

    const extractedData = await this.callGeminiWithImages(
      STATEMENT_EXTRACTION_SYSTEM_PROMPT,
      STATEMENT_EXTRACTION_USER_PROMPT,
      images,
    );

    recon.extractedData = extractedData;
    recon.status = ReconciliationStatus.PENDING;
    await this.reconciliationRepository.save(recon);

    this.logger.log(
      `Extracted ${extractedData.length} line items from statement ${reconciliationId}`,
    );
    return this.mapToDetailDto(recon, []);
  }

  async reconcileStatement(reconciliationId: number): Promise<ReconciliationDetailDto> {
    const recon = await this.reconciliationRepository.findOne({
      where: { id: reconciliationId },
      relations: ["company"],
    });
    if (!recon) {
      throw new NotFoundException("Reconciliation not found");
    }
    if (!recon.extractedData || recon.extractedData.length === 0) {
      throw new NotFoundException("No extracted data - run extraction first");
    }

    const startDate = `${recon.periodYear}-${String(recon.periodMonth).padStart(2, "0")}-01`;
    const endMonth = recon.periodMonth === 12 ? 1 : recon.periodMonth + 1;
    const endYear = recon.periodMonth === 12 ? recon.periodYear + 1 : recon.periodYear;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const systemInvoices = await this.taxInvoiceRepository
      .createQueryBuilder("inv")
      .where("inv.company_id = :companyId", { companyId: recon.companyId })
      .andWhere("inv.invoice_type = :type", { type: TaxInvoiceType.SUPPLIER })
      .andWhere("inv.status = :status", {
        status: TaxInvoiceStatus.APPROVED,
      })
      .andWhere("inv.invoice_date >= :startDate", { startDate })
      .andWhere("inv.invoice_date < :endDate", { endDate })
      .andWhere("inv.version_status = :vs", { vs: "ACTIVE" })
      .getMany();

    const systemMap = new Map(
      systemInvoices.map((inv) => [
        inv.invoiceNumber.trim().toLowerCase(),
        parseFloat(inv.totalAmount || "0"),
      ]),
    );

    const statementMap = new Map(
      recon.extractedData.map((item) => [item.invoiceNumber.trim().toLowerCase(), item.amount]),
    );

    const matchItems: ReconciliationMatchItem[] = [];
    let matched = 0;
    let discrepancies = 0;
    let unmatched = 0;

    recon.extractedData.forEach((item) => {
      const key = item.invoiceNumber.trim().toLowerCase();
      const systemAmount = systemMap.get(key);
      if (systemAmount === undefined) {
        matchItems.push({
          invoiceNumber: item.invoiceNumber,
          statementAmount: item.amount,
          systemAmount: null,
          matchResult: MatchResultType.NOT_IN_SYSTEM,
          difference: null,
        });
        unmatched++;
      } else {
        const diff = Math.abs(systemAmount - item.amount);
        if (diff <= 0.01) {
          matchItems.push({
            invoiceNumber: item.invoiceNumber,
            statementAmount: item.amount,
            systemAmount,
            matchResult: MatchResultType.MATCHED,
            difference: 0,
          });
          matched++;
        } else {
          matchItems.push({
            invoiceNumber: item.invoiceNumber,
            statementAmount: item.amount,
            systemAmount,
            matchResult: MatchResultType.AMOUNT_DISCREPANCY,
            difference: systemAmount - item.amount,
          });
          discrepancies++;
        }
      }
    });

    systemInvoices.forEach((inv) => {
      const key = inv.invoiceNumber.trim().toLowerCase();
      if (!statementMap.has(key)) {
        matchItems.push({
          invoiceNumber: inv.invoiceNumber,
          statementAmount: null,
          systemAmount: parseFloat(inv.totalAmount || "0"),
          matchResult: MatchResultType.NOT_ON_STATEMENT,
          difference: null,
        });
        unmatched++;
      }
    });

    recon.matchSummary = { matched, unmatched, discrepancies };
    recon.status =
      discrepancies > 0 || unmatched > 0
        ? ReconciliationStatus.DISCREPANCY
        : ReconciliationStatus.MATCHED;
    await this.reconciliationRepository.save(recon);

    this.logger.log(
      `Reconciled statement ${reconciliationId}: ${matched} matched, ${discrepancies} discrepancies, ${unmatched} unmatched`,
    );
    return this.mapToDetailDto(recon, matchItems);
  }

  async resolveDiscrepancy(
    id: number,
    resolvedBy: string,
    notes: string,
  ): Promise<ReconciliationDetailDto> {
    const recon = await this.reconciliationRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!recon) {
      throw new NotFoundException("Reconciliation not found");
    }
    recon.status = ReconciliationStatus.RESOLVED;
    recon.resolvedBy = resolvedBy;
    recon.resolvedAt = now().toJSDate();
    recon.notes = notes;
    await this.reconciliationRepository.save(recon);
    return this.mapToDetailDto(recon, []);
  }

  async allReconciliations(filters?: {
    companyId?: number;
    status?: ReconciliationStatus;
    year?: number;
    month?: number;
  }): Promise<ReconciliationListDto[]> {
    const query = this.reconciliationRepository
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.company", "company")
      .orderBy("r.created_at", "DESC");

    if (filters?.companyId) {
      query.andWhere("r.company_id = :companyId", {
        companyId: filters.companyId,
      });
    }
    if (filters?.status) {
      query.andWhere("r.status = :status", { status: filters.status });
    }
    if (filters?.year) {
      query.andWhere("r.period_year = :year", { year: filters.year });
    }
    if (filters?.month) {
      query.andWhere("r.period_month = :month", { month: filters.month });
    }

    const results = await query.getMany();
    return results.map((r) => this.mapToListDto(r));
  }

  async reconciliationById(id: number): Promise<ReconciliationDetailDto | null> {
    const recon = await this.reconciliationRepository.findOne({
      where: { id },
      relations: ["company"],
    });
    if (!recon) return null;
    return this.mapToDetailDto(recon, []);
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    const pdfInput = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    const pages = await pdfToPng(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 1.5,
    });
    return pages
      .filter((page: { content: Buffer | undefined }) => page.content !== undefined)
      .map((page: { content: Buffer }) => page.content as Buffer);
  }

  private async callGeminiWithImages(
    systemPrompt: string,
    userPrompt: string,
    images: Buffer[],
  ): Promise<ExtractedStatementLineItem[]> {
    const imageParts = images.map((img) => ({
      inline_data: {
        mime_type: "image/png",
        data: img.toString("base64"),
      },
    }));

    const response = await fetch(
      `${this.geminiBaseUrl}/models/${this.geminiModel}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemPrompt }, { text: userPrompt }, ...imageParts],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 32768,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const tokensUsed =
      (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0);

    try {
      this.aiUsageService.log({
        app: AiApp.AU_RUBBER,
        actionType: "STATEMENT_EXTRACTION",
        provider: AiProvider.GEMINI,
        model: this.geminiModel,
        tokensUsed,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`Failed to log AI usage: ${msg}`);
    }

    return this.parseJsonResponse(content);
  }

  private parseJsonResponse(content: string): ExtractedStatementLineItem[] {
    const cleaned = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  }

  private mapToListDto(recon: RubberStatementReconciliation): ReconciliationListDto {
    return {
      id: recon.id,
      firebaseUid: recon.firebaseUid,
      companyId: recon.companyId,
      companyName: recon.company?.name || "",
      periodYear: recon.periodYear,
      periodMonth: recon.periodMonth,
      originalFilename: recon.originalFilename,
      status: recon.status,
      matchSummary: recon.matchSummary,
      createdAt: recon.createdAt.toISOString(),
    };
  }

  private mapToDetailDto(
    recon: RubberStatementReconciliation,
    matchItems: ReconciliationMatchItem[],
  ): ReconciliationDetailDto {
    return {
      id: recon.id,
      firebaseUid: recon.firebaseUid,
      companyId: recon.companyId,
      companyName: recon.company?.name || "",
      periodYear: recon.periodYear,
      periodMonth: recon.periodMonth,
      originalFilename: recon.originalFilename,
      extractedData: recon.extractedData,
      status: recon.status,
      matchSummary: recon.matchSummary,
      matchItems,
      resolvedBy: recon.resolvedBy,
      resolvedAt: recon.resolvedAt ? recon.resolvedAt.toISOString() : null,
      notes: recon.notes,
      createdAt: recon.createdAt.toISOString(),
      updatedAt: recon.updatedAt.toISOString(),
    };
  }
}
