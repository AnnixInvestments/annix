import { randomBytes } from "node:crypto";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isNumber } from "es-toolkit/compat";
import { Repository } from "typeorm";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../ai-usage/entities/ai-usage-log.entity";
import { now } from "../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
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
  // STI primary key when the invoice exists in our system (MATCHED,
  // AMOUNT_DISCREPANCY, NOT_ON_STATEMENT). null on NOT_IN_SYSTEM rows.
  // Used by the frontend to make each row click through to the STI detail
  // page from the reconciliation view.
  taxInvoiceId: number | null;
  statementAmount: number | null;
  systemAmount: number | null;
  matchResult: MatchResultType;
  difference: number | null;
  // Cascade audit (Phase 1). Populated when the STI exists in our system —
  // i.e. matchResult is MATCHED, AMOUNT_DISCREPANCY, or NOT_ON_STATEMENT.
  // For NOT_IN_SYSTEM rows all three are null (we can't cascade from an STI
  // we don't have). null on the *Present fields means "not applicable".
  linkedDeliveryNoteRef: string | null;
  linkedDeliveryNotePresent: boolean | null;
  // When the linked SDN exists in our system, this is its DB id so the
  // frontend can render a clickable link straight to the SDN detail page.
  // null when there's no SDN linked or it isn't in the system yet.
  linkedDeliveryNoteId: number | null;
  linkedSupplierCocPresent: boolean | null;
  // Same for the supplier CoC — populated when the STI has a CoC link
  // (RubberTaxInvoice.linkedCalenderRollCocId is set).
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
    @InjectRepository(RubberStatementReconciliation)
    private readonly reconciliationRepository: Repository<RubberStatementReconciliation>,
    @InjectRepository(RubberTaxInvoice)
    private readonly taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberDeliveryNote)
    private readonly deliveryNoteRepository: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberCompany)
    private readonly companyRepository: Repository<RubberCompany>,
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

  /**
   * Auto-detect upload: figure out the issuing supplier (from the
   * letterhead) and the statement period (from the STATEMENT DATE label) via
   * Gemini, then file the statement against the matching company. Triggers
   * extraction + reconciliation in the background so the API returns as soon
   * as the row exists; the frontend polls status to know when the pipeline
   * is complete.
   */
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
    if (!metadata || !metadata.supplierName) {
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

    // Fall back to "now" if the statement date could not be read — the
    // reconcile step needs a year/month to scope its STI query, but the user
    // can correct the period later via the existing detail page.
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

    // No date filter on the STI lookup: a supplier statement routinely
    // includes invoices from earlier periods that are still outstanding
    // (e.g. an April statement listing IN177322 dated 18 March because the
    // user hasn't paid it yet). Filtering by the recon's period_year /
    // period_month hides legitimate matches and surfaces them as "STI
    // missing" when in fact the STI was captured weeks ago. Also include
    // EXTRACTED rows alongside APPROVED — an extracted STI is "in the
    // system" for reconciliation purposes; the user wants visibility, not
    // gating. PENDING (file uploaded, no OCR yet) and FAILED are excluded
    // since they have no amount data to compare against.
    const systemInvoices = await this.taxInvoiceRepository
      .createQueryBuilder("inv")
      .where("inv.company_id = :companyId", { companyId: recon.companyId })
      .andWhere("inv.invoice_type = :type", { type: TaxInvoiceType.SUPPLIER })
      .andWhere("inv.status IN (:...statuses)", {
        statuses: [TaxInvoiceStatus.APPROVED, TaxInvoiceStatus.EXTRACTED],
      })
      .andWhere("inv.version_status = :vs", { vs: "ACTIVE" })
      .getMany();

    const systemInvoiceByKey = new Map(
      systemInvoices.map((inv) => [inv.invoiceNumber.trim().toLowerCase(), inv]),
    );

    // Statement lines with isCredit=true are reversal/payment journal entries
    // (e.g. S&N's recurring "31030006" rows that clear each paid invoice).
    // They are not invoices and have no STI in our system — including them in
    // the per-row match loop inflates the "unmatched" count and surfaces
    // ghost "missing STI" warnings. Filter to debit (invoice) rows only.
    const invoiceLines = recon.extractedData.filter((item) => !item.isCredit);

    const statementMap = new Map(
      invoiceLines.map((item) => [item.invoiceNumber.trim().toLowerCase(), item.amount]),
    );

    // Cascade pre-fetch: collect every candidate SDN number we might want to
    // look up — explicit STI.deliveryNoteRef (e.g. S&N's "3057", "14126"),
    // each STI's own invoice_number (Impilo-style unified numbering), AND
    // every statement-line invoice_number for rows where we don't have an
    // STI yet (so the user still sees ✓ when only the SDN has landed).
    // A DN is considered "present" if any non-rejected, non-superseded
    // version exists — including PENDING_AUTHORIZATION, because the user
    // legitimately wants the upload reflected immediately, not after
    // approval.
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
    // The Supplier CoC linkage lives on the SDN row (rubber_delivery_notes.
    // linked_coc_id), not on the STI's linkedCalenderRollCocId (which is the
    // AU-side calendar-roll CoC — a different document). Track per SDN
    // number → supplier-CoC id so the cascade can flip SCoC to ✓.
    const cocIdBySdnNumber = new Map<string, number>();
    // OCR-tolerant fallback: Gemini routinely misreads SDN prefixes (the
    // real "D08516" gets read as "DN08516" when the STI's delivery-note
    // ref is scanned). When the exact lookup misses, we fall back to a
    // digit-only key — both refs strip to "08516" and match. Track the
    // canonical (case-original) SDN number per digit-sequence so the
    // cascade can render the right ref text in the UI.
    const presentDnByDigits = new Map<
      string,
      { number: string; id: number; cocId: number | null }
    >();
    // Pull ALL non-excluded SDNs for this supplier (typically dozens, not
    // thousands) so the digit-only fallback has the full set to consult.
    // The prior optimization of filtering by `delivery_note_number IN
    // (:...candidateDnRefs)` excluded rows whose number didn't exactly
    // match any candidate — defeating the fuzzy fallback entirely.
    const allSupplierDns = await this.deliveryNoteRepository
      .createQueryBuilder("dn")
      .select("dn.id", "id")
      .addSelect("dn.delivery_note_number", "deliveryNoteNumber")
      .addSelect("dn.linked_coc_id", "linkedCocId")
      .addSelect("dn.version_status", "versionStatus")
      .where("dn.supplier_company_id = :companyId", { companyId: recon.companyId })
      .andWhere("dn.version_status NOT IN (:...excluded)", {
        excluded: ["REJECTED", "SUPERSEDED"],
      })
      // ACTIVE outranks PENDING_AUTHORIZATION so the canonical row wins
      // when both versions exist for the same number.
      .orderBy("CASE WHEN dn.version_status = 'ACTIVE' THEN 0 ELSE 1 END", "ASC")
      .addOrderBy("dn.id", "DESC")
      .getRawMany();
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
      // Digit-only fallback key — empty string when the number is purely
      // alpha (rare); skip those since they'd cross-match every other
      // alpha-only number.
      const digits = numberStr.replace(/\D/g, "");
      if (digits.length > 0 && !presentDnByDigits.has(digits)) {
        presentDnByDigits.set(digits, { number: numberStr, id: Number(row.id), cocId });
      }
    }
    // Resolve a raw DN ref against the supplier's SDN set. Returns the
    // canonical SDN number (so the UI can render the right text), its id,
    // and its linked supplier-CoC id — or null if neither exact nor
    // digit-only fallback matches.
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
    // Silence the "candidateDnRefs is unused" lint — the variable used to
    // drive the IN-filter prefetch; we still build it as documentation /
    // future filtering hook.
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
      // Prefer the STI's explicit deliveryNoteRef (separate-numbering suppliers
      // like S&N). When the STI carries none (unified-numbering suppliers like
      // Impilo where the SDN number equals the invoice number), fall back to
      // the invoice number itself. After fallback we still emit ✓/✗ — a known
      // candidate that doesn't exist in our SDN table is a real gap, not "n/a".
      // Prefer the STI's explicit deliveryNoteRef; fall back to the STI's
      // own invoice number for unified-numbering suppliers (Impilo).
      const rawDnRef = inv.extractedData?.deliveryNoteRef;
      const explicitRef = rawDnRef && rawDnRef.trim().length > 0 ? rawDnRef.trim() : null;
      const fallbackRef = inv.invoiceNumber ? inv.invoiceNumber.trim() : null;
      // Try the explicit ref first (with OCR-tolerant fallback), then the
      // invoice-number fallback for unified-numbering suppliers.
      const resolved =
        (explicitRef ? resolveSdn(explicitRef) : null) ||
        (fallbackRef ? resolveSdn(fallbackRef) : null);
      // Render-time DN reference: prefer the canonical SDN number when
      // resolved (so the UI shows the real SDN, not the OCR misread). If
      // unresolved, fall back to whatever the STI declared.
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
        // No matching STI in the system — but the SDN might still be there
        // (Impilo-style unified numbering, or the SDN landed before the STI).
        // Resolve through resolveSdn so OCR drift (e.g. "DN08516" vs the
        // stored "D08516") still finds the row via digit-only fallback.
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

  // Hard-delete a reconciliation (and its underlying statement PDF) so the
  // user can re-upload from scratch. Used when an OCR-misread row can't be
  // fixed by Re-extract and the easier path is "delete, drop the PDF again".
  async deleteReconciliation(id: number): Promise<number> {
    const recon = await this.reconciliationRepository.findOne({ where: { id } });
    if (!recon) {
      throw new NotFoundException("Reconciliation not found");
    }
    // Best-effort delete the PDF — if it's already gone (e.g. on the wrong
    // bucket), don't block the DB delete the user actually asked for.
    if (recon.statementPath) {
      try {
        await this.storageService.delete(recon.statementPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `deleteReconciliation: failed to delete statement file ${recon.statementPath} — ${message}; deleting DB row anyway`,
        );
      }
    }
    await this.reconciliationRepository.delete({ id });
    return id;
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
    // matchItems are computed, not persisted — re-run the reconcile on read
    // so the detail page can show per-row status (MATCHED / DISCREPANCY /
    // NOT_IN_SYSTEM / cascade flags) without the user clicking a button.
    // Skips when extraction has not run yet (nothing to match against).
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

  /**
   * Cheap focused Gemini call (page 1 only) that reads the issuing supplier
   * name off the letterhead and the STATEMENT DATE label. Returns null on
   * anything we can't parse — the caller treats null as "could not detect".
   */
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
              // 256 tokens truncates mid-string on some letterheads;
              // the actual JSON payload is tiny but Gemini's internal
              // reasoning eats into the budget.
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

  /**
   * Match a free-form supplier name (as Gemini read it off a letterhead) to a
   * known SUPPLIER company id. Keyword-first for the known issuers, then a
   * case-insensitive exact-name fallback.
   */
  private async findSupplierIdByName(supplierName: string): Promise<number | null> {
    const norm = supplierName.toLowerCase();
    const suppliers = await this.companyRepository.find({
      where: { companyType: CompanyType.SUPPLIER },
    });

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

  /**
   * Fire-and-forget pipeline for a freshly-uploaded statement: extract line
   * items, then reconcile against the system's STIs (with the Phase-1 DN +
   * SCoC cascade). Errors are logged; the row remains in whatever status the
   * pipeline reached.
   */
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
