import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO, nowMillis } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { InvoiceExtractionStatus, SupplierInvoice } from "../entities/supplier-invoice.entity";
import { DeliverySupplierService } from "./delivery-supplier.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

@Injectable()
export class DeliveryInvoiceService {
  private readonly logger = new Logger(DeliveryInvoiceService.name);

  constructor(
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly extractionService: InvoiceExtractionService,
    private readonly supplierService: DeliverySupplierService,
  ) {}

  async createFromAnalyzedData(
    companyId: number,
    file: Express.Multer.File,
    analyzedData: {
      invoiceNumber?: string;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: {
        name?: string;
        vatNumber?: string;
        address?: string;
        contactPerson?: string;
        phone?: string;
        email?: string;
      };
      totals?: {
        subtotalExclVat?: number;
        vatTotal?: number;
        grandTotalInclVat?: number;
      };
    },
  ): Promise<SupplierInvoice> {
    const uploadResult = await this.storageService.upload(
      file,
      `${StorageArea.STOCK_CONTROL}/invoices`,
    );

    const invoiceNumber =
      analyzedData.invoiceNumber || analyzedData.deliveryNoteNumber || `INV-${nowMillis()}`;

    const invoiceDate = analyzedData.deliveryDate
      ? fromISO(analyzedData.deliveryDate).toJSDate()
      : null;

    const invoiceSupplierName = analyzedData.fromCompany?.name || "Unknown Supplier";

    let invoiceSupplierId: number | null = null;
    if (analyzedData.fromCompany?.name) {
      const supplier = await this.supplierService.resolveOrCreateSupplier(
        companyId,
        analyzedData.fromCompany.name,
        {
          vatNumber: analyzedData.fromCompany.vatNumber,
          address: analyzedData.fromCompany.address,
          contactPerson: analyzedData.fromCompany.contactPerson,
          phone: analyzedData.fromCompany.phone,
          email: analyzedData.fromCompany.email,
        },
      );
      invoiceSupplierId = supplier.id;
    }

    const invoice = this.invoiceRepo.create({
      companyId,
      invoiceNumber,
      supplierName: invoiceSupplierName,
      supplierId: invoiceSupplierId,
      invoiceDate,
      totalAmount: analyzedData.totals?.grandTotalInclVat ?? null,
      vatAmount: analyzedData.totals?.vatTotal ?? null,
      scanUrl: uploadResult.path,
      extractionStatus: InvoiceExtractionStatus.PENDING,
      extractedData: analyzedData,
    });

    const saved = await this.invoiceRepo.save(invoice);
    this.logger.log(`Created invoice ${saved.id} (${invoiceNumber}) from scan`);

    const imageBase64 = file.buffer.toString("base64");
    const mediaType = this.mimeToMediaType(file.mimetype);
    this.extractionService
      .extractFromImage(saved.id, imageBase64, mediaType)
      .catch((err) =>
        this.logger.error(`Background extraction failed for invoice ${saved.id}: ${err.message}`),
      );

    return saved;
  }

  mimeToMediaType(mime: string): MediaType {
    const mimeMap: Record<string, MediaType> = {
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
      "application/pdf": "application/pdf",
    };
    return mimeMap[mime] || "image/jpeg";
  }
}
