import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import {
  type IDocumentRouter,
  type RoutingResult,
} from "../../inbound-email/interfaces/document-router.interface";
import { nowMillis } from "../../lib/datetime";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { DeliveryService } from "./delivery.service";
import { InvoiceService } from "./invoice.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";
import { ScDocumentType } from "./sc-email-classifier.service";

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

@Injectable()
export class ScEmailRouterService implements IDocumentRouter {
  private readonly logger = new Logger(ScEmailRouterService.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly deliveryService: DeliveryService,
    private readonly extractionService: InvoiceExtractionService,
    @InjectRepository(StockControlSupplier)
    private readonly supplierRepo: Repository<StockControlSupplier>,
  ) {}

  supportedMimeTypes(): string[] {
    return SUPPORTED_MIME_TYPES;
  }

  async route(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number | null,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    if (!companyId) {
      this.logger.warn("No company ID for routing, skipping");
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    const docType = attachment.documentType as ScDocumentType;

    if (docType === ScDocumentType.SUPPLIER_INVOICE) {
      return this.routeInvoice(attachment, fileBuffer, companyId, fromEmail, subject);
    }

    if (docType === ScDocumentType.DELIVERY_NOTE) {
      return this.routeDeliveryNote(attachment, fileBuffer, companyId, fromEmail, subject);
    }

    this.logger.log(
      `Document type "${docType}" stored for manual review: ${attachment.originalFilename}`,
    );
    return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
  }

  private async routeInvoice(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    const supplierName = await this.resolveSupplierName(companyId, fromEmail);
    const invoiceNumber = `EMAIL-${nowMillis()}`;

    const invoice = await this.invoiceService.create(companyId, {
      invoiceNumber,
      supplierName,
    });

    if (attachment.s3Path) {
      await this.invoiceService.linkScanPath(invoice.id, attachment.s3Path);
    }

    this.triggerInvoiceExtraction(invoice.id, fileBuffer, attachment.mimeType);

    this.logger.log(
      `Created invoice ${invoice.id} (${invoiceNumber}) from email attachment: ${attachment.originalFilename}`,
    );

    return {
      linkedEntityType: "SupplierInvoice",
      linkedEntityId: invoice.id,
      extractionTriggered: true,
    };
  }

  private async routeDeliveryNote(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    const supplierName = await this.resolveSupplierName(companyId, fromEmail);
    const deliveryNumber = `DN-EMAIL-${nowMillis()}`;

    const dn = await this.deliveryService.createFromEmail(companyId, {
      deliveryNumber,
      supplierName,
      photoUrl: attachment.s3Path,
    });

    this.logger.log(
      `Created delivery note ${dn.id} (${deliveryNumber}) from email attachment: ${attachment.originalFilename}`,
    );

    return {
      linkedEntityType: "DeliveryNote",
      linkedEntityId: dn.id,
      extractionTriggered: false,
    };
  }

  private async resolveSupplierName(companyId: number, fromEmail: string): Promise<string> {
    const domain = fromEmail.split("@")[1] ?? "";

    const suppliers = await this.supplierRepo.find({ where: { companyId } });

    const emailMatch = suppliers.find((s) => s.email?.toLowerCase() === fromEmail.toLowerCase());
    if (emailMatch) {
      return emailMatch.name;
    }

    const domainMatch = suppliers.find(
      (s) => s.email && s.email.toLowerCase().endsWith(`@${domain}`),
    );
    if (domainMatch) {
      return domainMatch.name;
    }

    return fromEmail;
  }

  private triggerInvoiceExtraction(invoiceId: number, fileBuffer: Buffer, mimeType: string): void {
    const imageBase64 = fileBuffer.toString("base64");
    const mediaType = this.mimeToMediaType(mimeType);

    this.extractionService.extractFromImage(invoiceId, imageBase64, mediaType).catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invoice extraction failed for invoice ${invoiceId}: ${msg}`);
    });
  }

  private mimeToMediaType(
    mime: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" {
    const mimeMap: Record<
      string,
      "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf"
    > = {
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/webp": "image/webp",
      "application/pdf": "application/pdf",
    };
    return mimeMap[mime] ?? "application/pdf";
  }
}
