import { Inject, Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import { extractTextFromPdf } from "../../lib/document-extraction";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { CompanyType } from "../entities/rubber-company.entity";
import { DeliveryNoteStatus } from "../entities/rubber-delivery-note.entity";
import {
  AuRubberDocumentType,
  AuRubberPartyType,
  auRubberDocumentPath,
  isAuRubberInboxPath,
  sanitizeAuRubberDocNumber,
} from "../lib/au-rubber-document-paths";
import { RubberCompanyRepository } from "../repositories/rubber-company.repository";
import { RubberDeliveryNoteRepository } from "../repositories/rubber-delivery-note.repository";
import { RubberCocExtractionService } from "../rubber-coc-extraction.service";
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
    private readonly deliveryNoteRepository: RubberDeliveryNoteRepository,
    private readonly companyRepository: RubberCompanyRepository,
    private readonly cocExtractionService: RubberCocExtractionService,
  ) {}

  async fileDeliveryNoteSlices(args: FileDeliveryNoteSlicesArgs): Promise<void> {
    const { parentDocumentPath, deliveryNoteIds } = args;
    if (deliveryNoteIds.length === 0) return;

    const notes = await this.deliveryNoteRepository.findManyByIds(deliveryNoteIds);
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
        await this.deliveryNoteRepository.updateById(note.id, { documentPath: uploaded.path });
        this.pdfPageCacheService.invalidate(parentDocumentPath);
        this.pdfPageCacheService.invalidate(uploaded.path);
        this.logger.log(
          `Filed DN ${note.deliveryNoteNumber} (#${note.id}) → ${uploaded.path} (${slicedBuffer.length} bytes, ${note.sourcePageNumbers?.length ?? 0} page(s))`,
        );
      }),
    );
  }

  async resliceCustomerDnByDnNumber(deliveryNoteId: number): Promise<number | null> {
    const note = await this.deliveryNoteRepository.findById(deliveryNoteId);
    if (!note?.documentPath) return null;
    if (!note.documentPath.toLowerCase().endsWith(".pdf")) return null;

    const dnNumber = (note.deliveryNoteNumber || "").trim();
    if (dnNumber.length === 0) return null;

    const sourceBuffer = await this.downloadOrNull(note.documentPath, deliveryNoteId);
    if (!sourceBuffer) return null;

    const sourcePdf = await PDFDocument.load(sourceBuffer);
    const totalPages = sourcePdf.getPageCount();
    if (totalPages <= 1) return null;

    const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
    const textMatchingPages = await pageNumbers.reduce(
      async (accPromise, pageNum) => {
        const acc = await accPromise;
        const onePage = await PDFDocument.create();
        const [copied] = await onePage.copyPages(sourcePdf, [pageNum - 1]);
        onePage.addPage(copied);
        const pageBuffer = Buffer.from(await onePage.save());
        const text = await extractTextFromPdf(pageBuffer);
        return this.pageTextMentionsDn(text, dnNumber) ? [...acc, pageNum] : acc;
      },
      Promise.resolve([] as number[]),
    );

    const visionFallbackPages =
      textMatchingPages.length === 0
        ? await this.cocExtractionService.pagesContainingDnNumber(sourceBuffer, dnNumber)
        : [];
    if (textMatchingPages.length === 0 && visionFallbackPages.length > 0) {
      this.logger.log(
        `reslice DN ${dnNumber} (#${deliveryNoteId}): text scan matched 0/${totalPages}; Vision matched [${visionFallbackPages.join(",")}]`,
      );
    }
    const matchingPages = textMatchingPages.length > 0 ? textMatchingPages : visionFallbackPages;

    if (matchingPages.length === 0 || matchingPages.length === totalPages) {
      this.logger.log(
        `reslice DN ${dnNumber} (#${deliveryNoteId}): ${matchingPages.length}/${totalPages} pages match — no change`,
      );
      return null;
    }

    const slicedBuffer = await this.pdfSlicerService.slicePages(sourceBuffer, matchingPages);
    const company = await this.companyRepository.findById(note.supplierCompanyId);
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
    const slicedPageNumbers = matchingPages.map((_, index) => index + 1);
    await this.deliveryNoteRepository.updateById(note.id, {
      documentPath: uploaded.path,
      sourcePageNumbers: slicedPageNumbers,
    });
    this.pdfPageCacheService.invalidate(note.documentPath);
    this.pdfPageCacheService.invalidate(uploaded.path);
    this.logger.log(
      `Re-sliced CDN ${dnNumber} (#${deliveryNoteId}) from ${totalPages}-page bundle → ${matchingPages.length} page(s) [${matchingPages.join(",")}] → ${uploaded.path}`,
    );
    return matchingPages.length;
  }

  async resliceAllCustomerDnBundles(): Promise<{ checked: number; resliced: number[] }> {
    const notes = await this.deliveryNoteRepository.findFiltered({
      companyType: CompanyType.CUSTOMER,
    });
    const candidates = notes.filter(
      (note) =>
        note.documentPath?.toLowerCase().endsWith(".pdf") &&
        note.status !== DeliveryNoteStatus.FAILED,
    );
    const resliced = await this.resliceCandidates(candidates);
    return { checked: candidates.length, resliced };
  }

  async resliceAllDeliveryNoteBundles(): Promise<{ checked: number; resliced: number[] }> {
    const notes = await this.deliveryNoteRepository.findFiltered();
    const candidates = notes.filter(
      (note) =>
        note.documentPath?.toLowerCase().endsWith(".pdf") &&
        note.status !== DeliveryNoteStatus.FAILED,
    );
    const resliced = await this.resliceCandidates(candidates);
    this.logger.log(
      `resliceAllDeliveryNoteBundles: checked ${candidates.length}, resliced ${resliced.length} [${resliced.join(",")}]`,
    );
    return { checked: candidates.length, resliced };
  }

  private resliceCandidates(candidates: Array<{ id: number }>): Promise<number[]> {
    return candidates.reduce(
      async (accPromise, note) => {
        const acc = await accPromise;
        try {
          const kept = await this.resliceCustomerDnByDnNumber(note.id);
          return kept !== null ? [...acc, note.id] : acc;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`reslice DN ${note.id} failed: ${message}`);
          return acc;
        }
      },
      Promise.resolve([] as number[]),
    );
  }

  private async downloadOrNull(
    documentPath: string,
    deliveryNoteId: number,
  ): Promise<Buffer | null> {
    try {
      return await this.storageService.download(documentPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`reslice DN ${deliveryNoteId}: cannot download ${documentPath}: ${message}`);
      return null;
    }
  }

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
