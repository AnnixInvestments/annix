import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { CompanyType, RubberCompany } from "../entities/rubber-company.entity";
import { RubberDeliveryNote } from "../entities/rubber-delivery-note.entity";
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
        await this.storageService.upload(
          this.bufferAsMulter(slicedBuffer, filename, isPdf ? "application/pdf" : "image/png"),
          targetPath.substring(0, targetPath.lastIndexOf("/")),
        );
        await this.deliveryNoteRepository.update(note.id, { documentPath: targetPath });
        this.pdfPageCacheService.invalidate(parentDocumentPath);
        this.pdfPageCacheService.invalidate(targetPath);
        this.logger.log(
          `Filed DN ${note.deliveryNoteNumber} (#${note.id}) → ${targetPath} (${slicedBuffer.length} bytes, ${note.sourcePageNumbers?.length ?? 0} page(s))`,
        );
      }),
    );
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
