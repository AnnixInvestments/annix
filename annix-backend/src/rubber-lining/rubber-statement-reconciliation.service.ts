import { randomBytes } from "node:crypto";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isNumber } from "es-toolkit/compat";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { CompanyType } from "./entities/rubber-company.entity";
import {
  ExtractedStatementLineItem,
  ReconciliationStatus,
  RubberStatementReconciliation,
} from "./entities/rubber-statement-reconciliation.entity";
import { RubberTaxInvoice } from "./entities/rubber-tax-invoice.entity";
import {
  STATEMENT_EXTRACTION_SYSTEM_PROMPT,
  STATEMENT_EXTRACTION_USER_PROMPT,
} from "./prompts/rubber-statement.prompt";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberStatementReconciliationRepository } from "./repositories/rubber-statement-reconciliation.repository";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";

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
  taxInvoiceId: number | null;
  statementAmount: number | null;
  systemAmount: number | null;
  matchResult: MatchResultType;
  difference: number | null;
  linkedDeliveryNoteRef: string | null;
  linkedDeliveryNotePresent: boolean | null;
  linkedDeliveryNoteId: number | null;
  linkedSupplierCocPresent: boolean | null;
  linkedSupplierCocId: number | null;
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
  matchSummary: {
    matched: number;
    unmatched: number;
    discrepancies: number;
    dnGaps?: number;
    cocGaps?: number;
  } | null;
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
  matchSummary: {
    matched: number;
    unmatched: number;
    discrepancies: number;
    dnGaps?: number;
    cocGaps?: number;
  } | null;
  createdAt: string;
}

@Injectable()
export class RubberStatementReconciliationService {
  private readonly logger = new Logger(RubberStatementReconciliationService.name);
  private readonly geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private readonly geminiModel = "gemini-2.5-flash";
  private readonly apiKey: string;

  constructor(
    private readonly reconciliationRepository: RubberStatementReconciliationRepository,
    private readonly taxInvoiceRepository: RubberTaxInvoiceRepository,
    private readonly deliveryNoteRepository: RubberDeliveryNoteRepository,
    private readonly companyRepository: RubberCompanyRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiUsageService: AiUsageService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured - statement extraction will be unavailable");
    }
  }

  async uploadStatementAutoDetect(
    file: Express.Multer.File,
  ): Promise<ReconciliationListDto & { detectedSupplierName: string }> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const images = await this.convertPdfToImages(file.buffer);
    if (images.length === 0) {
      throw new BadRequestException("Could not read pages from the uploaded PDF");
    }

    const metadata = await this.detectStatementMetadata(images);
    if (!metadata?.supplierName) {
      throw new BadRequestException(
        "Could not detect supplier from statement letterhead — please verify the document is a supplier statement",
      );
    }

    const companyId = await this.findSupplierIdByName(metadata.supplierName);
    if (!companyId) {
      throw new BadRequestException(
        `Detected supplier "${metadata.supplierName}" does not match any company in the system`,
      );
    }

    const today = now();
    const periodYear = metadata.periodYear != null ? metadata.periodYear : today.year;
    const periodMonth = metadata.periodMonth != null ? metadata.periodMonth : today.month;

    const listDto = await this.uploadStatement(companyId, file, periodYear, periodMonth);

    void this.runStatementPipeline(listDto.id);

    this.logger.log(
      `Auto-detected statement: supplier="${metadata.supplierName}" (id ${companyId}), period ${periodYear}-${String(periodMonth).padStart(2, "0")}, reconciliation #${listDto.id}`,
    );

    return { ...listDto, detectedSupplierName: metadata.supplierName };
  }

  private async runStatementPipeline(reconciliationId: number): Promise<void> {
    try {
      await this.extractStatement(reconciliationId);
      await this.reconcileStatement(reconciliationId);
    } catch (err) {
      this.logger.error(
        `Statement pipeline failed for reconciliation ${reconciliationId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async findSupplierIdByName(supplierName: string): Promise<number | null> {
    const norm = supplierName.toLowerCase();
    const suppliers = await this.companyRepository.findByCompanyType(CompanyType.SUPPLIER);

    if (norm.includes("impilo")) {
      const c = suppliers.find((s) => s.name.toLowerCase().includes("impilo"));
      if (c) return c.id;
    }
    if (norm.includes("s&n") || norm.includes("s & n") || norm.includes("sandrubber")) {
      const c = suppliers.find(
        (s) => s.name.toLowerCase().includes("s&n") || s.name.toLowerCase().includes("s & n"),
      );
      if (c) return c.id;
    }

    const exact = suppliers.find((s) => s.name.toLowerCase() === norm);
    if (exact) return exact.id;
    const contains = suppliers.find(
      (s) => norm.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(norm),
    );
    return contains ? contains.id : null;
  }

  private async detectStatementMetadata(images: Buffer[]): Promise<{
    supplierName: string | null;
    periodYear: number | null;
    periodMonth: number | null;
  } | null> {
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not configured - statement metadata detection skipped");
      return null;
    }
    const firstImage = images[0];
    if (!firstImage) return null;

    const prompt = `You are reading page 1 of a supplier statement (a monthly invoicing summary issued BY a supplier TO their customer).

Return JSON of this EXACT shape (no commentary, no markdown fence):
{
  "supplierName": "<the issuing supplier's full company name from the letterhead at the top of the page>",
  "statementDate": "<the value labelled STATEMENT DATE / Statement Date, in YYYY-MM-DD format>"
}

Rules:
1. supplierName is the ISSUER (top of page, biggest text, letterhead) — NOT the customer the statement is addressed "To:".
2. statementDate is usually labelled "STATEMENT DATE" or "Statement Date" in the header box; convert any format (DD/MM/YYYY, MM/DD/YYYY, "5 May 2026") to YYYY-MM-DD.
3. If either field cannot be read with full confidence, use null for that field.`;

    const imageParts = [
      {
        inline_data: {
          mime_type: "image/png",
          data: firstImage.toString("base64"),
        },
      },
    ];

    try {
      const response = await fetch(
        `${this.geminiBaseUrl}/models/${this.geminiModel}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, ...imageParts] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const tokensUsed =
        (data.usageMetadata?.promptTokenCount || 0) +
        (data.usageMetadata?.candidatesTokenCount || 0);
      try {
        this.aiUsageService.log({
          app: AiApp.AU_RUBBER,
          actionType: "STATEMENT_METADATA_DETECTION",
          provider: AiProvider.GEMINI,
          model: this.geminiModel,
          tokensUsed,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        this.logger.warn(`Failed to log AI usage: ${msg}`);
      }

      const cleaned = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleaned) as {
        supplierName: string | null;
        statementDate: string | null;
      };

      const supplierName = parsed.supplierName ? parsed.supplierName.trim() : null;
      let periodYear: number | null = null;
      let periodMonth: number | null = null;
      const rawStatementDate = parsed.statementDate;
      if (rawStatementDate) {
        const match = rawStatementDate.match(/^(\d{4})-(\d{2})/);
        if (match) {
          periodYear = parseInt(match[1], 10);
          periodMonth = parseInt(match[2], 10);
        }
      }
      return { supplierName, periodYear, periodMonth };
    } catch (err) {
      this.logger.warn(
        `Statement metadata detection failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async deleteReconciliation(id: number): Promise<number> {
    const recon = await this.reconciliationRepository.findById(id);
    if (!recon) {
      throw new NotFoundException("Reconciliation not found");
    }
    if (recon.statementPath) {
      try {
        await this.storageService.delete(recon.statementPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `deleteReconciliation: failed to delete statement file ${recon.statementPath} - ${message}; deleting DB row anyway`,
        );
      }
    }
    await this.reconciliationRepository.remove(recon);
    return id;
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
    const recon = this.reconciliationRepository.build({
      firebaseUid,
      companyId,
      periodYear: year,
      periodMonth: month,
      statementPath: uploadResult.path,
      originalFilename: file.originalname,
    });

    const saved = await this.reconciliationRepository.save(recon);
    this.logger.log(`Uploaded statement for company ${companyId}, period ${year}-${month}`);

    const withCompany = await this.reconciliationRepository.findByIdWithCompany(saved.id);
    return this.mapToListDto(withCompany || saved);
  }

  async extractStatement(reconciliationId: number): Promise<ReconciliationDetailDto> {
    const recon = await this.reconciliationRepository.findByIdWithCompany(reconciliationId);
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
    const recon = await this.reconciliationRepository.findByIdWithCompany(reconciliationId);
    if (!recon) {
      throw new NotFoundException("Reconciliation not found");
    }
    if (!recon.extractedData || recon.extractedData.length === 0) {
      throw new NotFoundException("No extracted data - run extraction first");
    }

    const systemInvoices =
      await this.taxInvoiceRepository.findActiveSupplierInvoicesForReconciliation(recon.companyId);

    const systemInvoiceByKey = new Map(
      systemInvoices.map((inv) => [inv.invoiceNumber.trim().toLowerCase(), inv]),
    );

    const invoiceLines = recon.extractedData.filter((item) => !item.isCredit);

    const statementMap = new Map(
      invoiceLines.map((item) => [item.invoiceNumber.trim().toLowerCase(), item.amount]),
    );

    const explicitDnRefs = systemInvoices
      .map((inv) => inv.extractedData?.deliveryNoteRef)
      .filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0)
      .map((ref) => ref.trim());
    const systemInvoiceNumbers = systemInvoices
      .map((inv) => inv.invoiceNumber)
      .filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0)
      .map((ref) => ref.trim());
    const statementLineNumbers = invoiceLines
      .map((item) => item.invoiceNumber)
      .filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0)
      .map((ref) => ref.trim());
    const candidateDnRefs = Array.from(
      new Set([...explicitDnRefs, ...systemInvoiceNumbers, ...statementLineNumbers]),
    );
    const presentDnNumbers = new Set<string>();
    const dnIdByNumber = new Map<string, number>();
    const cocIdBySdnNumber = new Map<string, number>();
    const presentDnByDigits = new Map<
      string,
      { number: string; id: number; cocId: number | null }
    >();
    const allSupplierDns = await this.deliveryNoteRepository.findSupplierDnReconciliationRows(
      recon.companyId,
    );
    for (const row of allSupplierDns) {
      const numberStr = String(row.deliveryNoteNumber).trim();
      if (numberStr.length === 0) continue;
      const key = numberStr.toLowerCase();
      const cocId = row.linkedCocId == null ? null : Number(row.linkedCocId);
      presentDnNumbers.add(key);
      if (!dnIdByNumber.has(key)) {
        dnIdByNumber.set(key, Number(row.id));
      }
      if (!cocIdBySdnNumber.has(key) && cocId != null) {
        cocIdBySdnNumber.set(key, cocId);
      }
      const digits = numberStr.replace(/\D/g, "");
      if (digits.length > 0 && !presentDnByDigits.has(digits)) {
        presentDnByDigits.set(digits, { number: numberStr, id: Number(row.id), cocId });
      }
    }
    const resolveSdn = (
      rawRef: string,
    ): { number: string; id: number; cocId: number | null } | null => {
      const trimmed = rawRef.trim();
      if (trimmed.length === 0) return null;
      const key = trimmed.toLowerCase();
      if (presentDnNumbers.has(key)) {
        const id = dnIdByNumber.get(key);
        if (isNumber(id)) {
          const cocId = cocIdBySdnNumber.get(key);
          return { number: trimmed, id, cocId: isNumber(cocId) ? cocId : null };
        }
      }
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length > 0) {
        const fallback = presentDnByDigits.get(digits);
        if (fallback) return fallback;
      }
      return null;
    };
    void candidateDnRefs;

    const cascadeForInvoice = (
      inv: RubberTaxInvoice | undefined,
    ): {
      linkedDeliveryNoteRef: string | null;
      linkedDeliveryNotePresent: boolean | null;
      linkedDeliveryNoteId: number | null;
      linkedSupplierCocPresent: boolean | null;
      linkedSupplierCocId: number | null;
    } => {
      if (!inv) {
        return {
          linkedDeliveryNoteRef: null,
          linkedDeliveryNotePresent: null,
          linkedDeliveryNoteId: null,
          linkedSupplierCocPresent: null,
          linkedSupplierCocId: null,
        };
      }
      const rawDnRef = inv.extractedData?.deliveryNoteRef;
      const explicitRef = rawDnRef && rawDnRef.trim().length > 0 ? rawDnRef.trim() : null;
      const fallbackRef = inv.invoiceNumber ? inv.invoiceNumber.trim() : null;
      const resolved =
        (explicitRef ? resolveSdn(explicitRef) : null) ||
        (fallbackRef ? resolveSdn(fallbackRef) : null);
      const linkedDeliveryNoteRefText = resolved ? resolved.number : explicitRef || fallbackRef;
      const hasDnCandidate = Boolean(explicitRef || fallbackRef);
      const linkedDeliveryNotePresent = hasDnCandidate ? resolved !== null : null;
      const linkedDeliveryNoteId = resolved ? resolved.id : null;
      const linkedSupplierCocPresent = resolved
        ? resolved.cocId !== null
        : hasDnCandidate
          ? false
          : null;
      const linkedSupplierCocId = resolved && resolved.cocId !== null ? resolved.cocId : null;
      return {
        linkedDeliveryNoteRef: linkedDeliveryNoteRefText,
        linkedDeliveryNotePresent,
        linkedDeliveryNoteId,
        linkedSupplierCocPresent,
        linkedSupplierCocId,
      };
    };

    const matchItems: ReconciliationMatchItem[] = [];
    let matched = 0;
    let discrepancies = 0;
    let unmatched = 0;
    let dnGaps = 0;
    let cocGaps = 0;

    const countCascadeGaps = (cascade: ReturnType<typeof cascadeForInvoice>): void => {
      if (cascade.linkedDeliveryNotePresent === false) dnGaps++;
      if (cascade.linkedSupplierCocPresent === false) cocGaps++;
    };

    invoiceLines.forEach((item) => {
      const key = item.invoiceNumber.trim().toLowerCase();
      const systemInv = systemInvoiceByKey.get(key);
      if (!systemInv) {
        const sdnMatch = resolveSdn(item.invoiceNumber);
        matchItems.push({
          invoiceNumber: item.invoiceNumber,
          taxInvoiceId: null,
          statementAmount: item.amount,
          systemAmount: null,
          matchResult: MatchResultType.NOT_IN_SYSTEM,
          difference: null,
          linkedDeliveryNoteRef: sdnMatch ? sdnMatch.number : null,
          linkedDeliveryNotePresent: sdnMatch ? true : null,
          linkedDeliveryNoteId: sdnMatch ? sdnMatch.id : null,
          linkedSupplierCocPresent: sdnMatch ? sdnMatch.cocId !== null : null,
          linkedSupplierCocId: sdnMatch ? sdnMatch.cocId : null,
        });
        unmatched++;
        return;
      }
      const systemAmount = parseFloat(systemInv.totalAmount || "0");
      const diff = Math.abs(systemAmount - item.amount);
      const cascade = cascadeForInvoice(systemInv);
      if (diff <= 0.01) {
        matchItems.push({
          invoiceNumber: item.invoiceNumber,
          taxInvoiceId: systemInv.id,
          statementAmount: item.amount,
          systemAmount,
          matchResult: MatchResultType.MATCHED,
          difference: 0,
          ...cascade,
        });
        matched++;
      } else {
        matchItems.push({
          invoiceNumber: item.invoiceNumber,
          taxInvoiceId: systemInv.id,
          statementAmount: item.amount,
          systemAmount,
          matchResult: MatchResultType.AMOUNT_DISCREPANCY,
          difference: systemAmount - item.amount,
          ...cascade,
        });
        discrepancies++;
      }
      countCascadeGaps(cascade);
    });

    systemInvoices.forEach((inv) => {
      const key = inv.invoiceNumber.trim().toLowerCase();
      if (statementMap.has(key)) return;
      const cascade = cascadeForInvoice(inv);
      matchItems.push({
        invoiceNumber: inv.invoiceNumber,
        taxInvoiceId: inv.id,
        statementAmount: null,
        systemAmount: parseFloat(inv.totalAmount || "0"),
        matchResult: MatchResultType.NOT_ON_STATEMENT,
        difference: null,
        ...cascade,
      });
      unmatched++;
      countCascadeGaps(cascade);
    });

    recon.matchSummary = { matched, unmatched, discrepancies, dnGaps, cocGaps };
    recon.status =
      discrepancies > 0 || unmatched > 0 || dnGaps > 0 || cocGaps > 0
        ? ReconciliationStatus.DISCREPANCY
        : ReconciliationStatus.MATCHED;
    await this.reconciliationRepository.save(recon);

    this.logger.log(
      `Reconciled statement ${reconciliationId}: ${matched} matched, ${discrepancies} discrepancies, ${unmatched} unmatched, ${dnGaps} DN gap(s), ${cocGaps} CoC gap(s)`,
    );
    return this.mapToDetailDto(recon, matchItems);
  }

  async resolveDiscrepancy(
    id: number,
    resolvedBy: string,
    notes: string,
  ): Promise<ReconciliationDetailDto> {
    const recon = await this.reconciliationRepository.findByIdWithCompany(id);
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
    const results = await this.reconciliationRepository.findAllWithCompanyOrdered(filters);
    return results.map((r) => this.mapToListDto(r));
  }

  async reconciliationById(id: number): Promise<ReconciliationDetailDto | null> {
    const recon = await this.reconciliationRepository.findByIdWithCompany(id);
    if (!recon) return null;
    if (recon.extractedData && recon.extractedData.length > 0) {
      try {
        return await this.reconcileStatement(id);
      } catch (err) {
        this.logger.warn(
          `Inline reconcile during detail fetch for ${id} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
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
