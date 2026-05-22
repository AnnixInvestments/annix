import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PDFDocument } from "pdf-lib";
import { Repository } from "typeorm";
import { extractTextFromPdf } from "../../lib/document-extraction";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { CompanyType, RubberCompany } from "../entities/rubber-company.entity";
import { DeliveryNoteStatus, RubberDeliveryNote } from "../entities/rubber-delivery-note.entity";
import { RubberSupplierCoc } from "../entities/rubber-supplier-coc.entity";
import { RubberTaxInvoice } from "../entities/rubber-tax-invoice.entity";
import {
  AuRubberDocumentType,
  AuRubberPartyType,
  auRubberDocumentPath,
  isAuRubberInboxPath,
  sanitizeAuRubberDocNumber,
} from "../lib/au-rubber-document-paths";
import { PdfPageCacheService } from "./pdf-page-cache.service";
import { PdfSlicerService } from "./pdf-slicer.service";

interface FileDeliveryNoteSlicesArgs {
  parentDocumentPath: string;
  deliveryNoteIds: number[];
}

@Injectable()
export class AuRubberDocumentFilerService {
  private readonly logger = new Logger(AuRubberDocumentFilerService.name);

  constructor(
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly pdfSlicerService: PdfSlicerService,
    private readonly pdfPageCacheService: PdfPageCacheService,
    @InjectRepository(RubberDeliveryNote)
    private readonly deliveryNoteRepository: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberCompany)
    private readonly companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberTaxInvoice)
    private readonly taxInvoiceRepository: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberSupplierCoc)
    private readonly supplierCocRepository: Repository<RubberSupplierCoc>,
  ) {}

  async fileDeliveryNoteSlices(args: FileDeliveryNoteSlicesArgs): Promise<void> {
    const { parentDocumentPath, deliveryNoteIds } = args;
    if (deliveryNoteIds.length === 0) return;

    const notes = await this.deliveryNoteRepository.findByIds(deliveryNoteIds);
    const eligible = notes.filter(
      (n) =>
        n.documentPath === parentDocumentPath &&
        Array.isArray(n.sourcePageNumbers) &&
        (n.sourcePageNumbers?.length ?? 0) > 0,
    );
    if (eligible.length === 0) {
      this.logger.log(
        `No DN slices to file for ${parentDocumentPath} — no rows with sourcePageNumbers; skipping`,
      );
      return;
    }

    const isPdf = parentDocumentPath.toLowerCase().endsWith(".pdf");
    const sourceBuffer = await this.storageService.download(parentDocumentPath);

    const supplierIds = Array.from(new Set(eligible.map((n) => n.supplierCompanyId)));
    const companies = await this.companyRepository.findByIds(supplierIds);
    const partyByCompanyId = new Map(
      companies.map((c) => [
        c.id,
        c.companyType === CompanyType.CUSTOMER
          ? ("customers" as AuRubberPartyType)
          : ("suppliers" as AuRubberPartyType),
      ]),
    );

    await Promise.all(
      eligible.map(async (note) => {
        const party = partyByCompanyId.get(note.supplierCompanyId) ?? "suppliers";
        const safeNumber = sanitizeAuRubberDocNumber(note.deliveryNoteNumber);
        const slicedBuffer = isPdf
          ? await this.pdfSlicerService.slicePages(sourceBuffer, note.sourcePageNumbers ?? [])
          : sourceBuffer;
        const ext = isPdf ? "pdf" : this.extensionFromPath(parentDocumentPath);
        const filename = `${safeNumber}.${ext}`;
        const targetPath = auRubberDocumentPath(
          party,
          AuRubberDocumentType.DELIVERY_NOTE,
          note.deliveryNoteNumber,
          filename,
        );
        // storageService.upload() always writes the file under a generated
        // UUID filename and returns the real storage key. documentPath MUST be
        // that returned key — recording the computed targetPath instead leaves
        // documentPath pointing at an object that was never written, which
        // surfaces later as "File not found" when the slice is opened.
        const uploaded = await this.storageService.upload(
          this.bufferAsMulter(slicedBuffer, filename, isPdf ? "application/pdf" : "image/png"),
          targetPath.substring(0, targetPath.lastIndexOf("/")),
        );
        await this.deliveryNoteRepository.update(note.id, { documentPath: uploaded.path });
        this.pdfPageCacheService.invalidate(parentDocumentPath);
        this.pdfPageCacheService.invalidate(uploaded.path);
        this.logger.log(
          `Filed DN ${note.deliveryNoteNumber} (#${note.id}) → ${uploaded.path} (${slicedBuffer.length} bytes, ${note.sourcePageNumbers?.length ?? 0} page(s))`,
        );
      }),
    );
  }

  /**
   * Retroactive repair: a CDN created via the bulk analyze-create flow before
   * per-DN slicing was wired up has the WHOLE multi-DN bundle as its document,
   * so opening it shows every other DN's pages. This re-slices such a CDN down
   * to only the pages whose text contains its own DN number.
   *
   * Returns the number of pages kept, or null if nothing changed (single-page
   * doc, no match, or already correctly sliced).
   */
  async resliceCustomerDnByDnNumber(deliveryNoteId: number): Promise<number | null> {
    const note = await this.deliveryNoteRepository.findOne({ where: { id: deliveryNoteId } });
    if (!note?.documentPath) return null;
    if (!note.documentPath.toLowerCase().endsWith(".pdf")) return null;

    const dnNumber = (note.deliveryNoteNumber || "").trim();
    if (dnNumber.length === 0) return null;

    let sourceBuffer: Buffer;
    try {
      sourceBuffer = await this.storageService.download(note.documentPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `reslice DN ${deliveryNoteId}: cannot download ${note.documentPath}: ${message}`,
      );
      return null;
    }

    const sourcePdf = await PDFDocument.load(sourceBuffer);
    const totalPages = sourcePdf.getPageCount();
    if (totalPages <= 1) return null; // single page — nothing to slice

    // Per-page text scan: keep pages whose text mentions this DN number.
    const matchingPages: number[] = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const onePage = await PDFDocument.create();
      const [copied] = await onePage.copyPages(sourcePdf, [pageNum - 1]);
      onePage.addPage(copied);
      const pageBuffer = Buffer.from(await onePage.save());
      const text = await extractTextFromPdf(pageBuffer);
      if (this.pageTextMentionsDn(text, dnNumber)) {
        matchingPages.push(pageNum);
      }
    }

    // No match, or every page matches → either we can't improve it or it's
    // already a single-DN document. Leave it alone.
    if (matchingPages.length === 0 || matchingPages.length === totalPages) {
      this.logger.log(
        `reslice DN ${dnNumber} (#${deliveryNoteId}): ${matchingPages.length}/${totalPages} pages match — no change`,
      );
      return null;
    }

    const slicedBuffer = await this.pdfSlicerService.slicePages(sourceBuffer, matchingPages);
    const company = await this.companyRepository.findOne({ where: { id: note.supplierCompanyId } });
    const party: AuRubberPartyType =
      company?.companyType === CompanyType.CUSTOMER ? "customers" : "suppliers";
    const filename = `${sanitizeAuRubberDocNumber(note.deliveryNoteNumber)}.pdf`;
    const targetPath = auRubberDocumentPath(
      party,
      AuRubberDocumentType.DELIVERY_NOTE,
      note.deliveryNoteNumber,
      filename,
    );
    const uploaded = await this.storageService.upload(
      this.bufferAsMulter(slicedBuffer, filename, "application/pdf"),
      targetPath.substring(0, targetPath.lastIndexOf("/")),
    );
    await this.deliveryNoteRepository.update(note.id, {
      documentPath: uploaded.path,
      sourcePageNumbers: matchingPages,
    });
    this.pdfPageCacheService.invalidate(note.documentPath);
    this.pdfPageCacheService.invalidate(uploaded.path);
    this.logger.log(
      `Re-sliced CDN ${dnNumber} (#${deliveryNoteId}) from ${totalPages}-page bundle → ${matchingPages.length} page(s) [${matchingPages.join(",")}] → ${uploaded.path}`,
    );
    return matchingPages.length;
  }

  /**
   * Bulk version: re-slice every customer-side DN whose document is a
   * multi-page PDF (likely a full bundle). Idempotent — single-DN docs and
   * already-sliced docs are skipped.
   */
  async resliceAllCustomerDnBundles(): Promise<{ checked: number; resliced: number[] }> {
    const customerCompanies = await this.companyRepository.find({
      where: { companyType: CompanyType.CUSTOMER },
    });
    const customerIds = customerCompanies.map((c) => c.id);
    if (customerIds.length === 0) return { checked: 0, resliced: [] };
    const notes = await this.deliveryNoteRepository.find({
      where: customerIds.map((id) => ({ supplierCompanyId: id })),
    });
    const candidates = notes.filter(
      (n) =>
        n.documentPath?.toLowerCase().endsWith(".pdf") && n.status !== DeliveryNoteStatus.FAILED,
    );
    const resliced: number[] = [];
    for (const note of candidates) {
      try {
        const kept = await this.resliceCustomerDnByDnNumber(note.id);
        if (kept !== null) resliced.push(note.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`reslice DN ${note.id} failed: ${message}`);
      }
    }
    return { checked: candidates.length, resliced };
  }

  // A page "mentions" the DN if its number appears as a standalone token.
  // Guards against 1337 matching 13370 / 21337 by requiring non-digit (or
  // string) boundaries on both sides.
  private pageTextMentionsDn(text: string, dnNumber: string): boolean {
    if (!text || dnNumber.length === 0) return false;
    const escaped = dnNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundaryRe = new RegExp(`(^|[^0-9A-Za-z])${escaped}([^0-9A-Za-z]|$)`);
    return boundaryRe.test(text);
  }

  private extensionFromPath(path: string): string {
    const idx = path.lastIndexOf(".");
    return idx >= 0 ? path.substring(idx + 1).toLowerCase() : "bin";
  }

  private bufferAsMulter(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
  ): Express.Multer.File {
    return {
      fieldname: "file",
      originalname,
      mimetype,
      buffer,
      size: buffer.length,
      encoding: "7bit",
      stream: undefined as unknown as never,
      destination: "",
      filename: originalname,
      path: "",
    } as unknown as Express.Multer.File;
  }

  isInboxPath(path: string | null | undefined): boolean {
    return path != null && isAuRubberInboxPath(path);
  }
}
