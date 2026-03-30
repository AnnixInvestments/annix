import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import {
  type IDocumentRouter,
  type RoutingResult,
} from "../../inbound-email/interfaces/document-router.interface";
import { DocumentVersionStatus } from "../entities/document-version.types";
import { RubberCompany } from "../entities/rubber-company.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  RubberDeliveryNote,
} from "../entities/rubber-delivery-note.entity";
import {
  RubberTaxInvoice,
  TaxInvoiceStatus,
  TaxInvoiceType,
} from "../entities/rubber-tax-invoice.entity";
import { ArDocumentType } from "./ar-email-classifier.service";

const SUPPORTED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

@Injectable()
export class ArEmailRouterService implements IDocumentRouter {
  private readonly logger = new Logger(ArEmailRouterService.name);

  constructor(
    @InjectRepository(RubberDeliveryNote)
    private readonly deliveryNoteRepo: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberTaxInvoice)
    private readonly taxInvoiceRepo: Repository<RubberTaxInvoice>,
    @InjectRepository(RubberCompany)
    private readonly companyRepo: Repository<RubberCompany>,
  ) {}

  supportedMimeTypes(): string[] {
    return SUPPORTED_MIMES;
  }

  async route(
    attachment: InboundEmailAttachment,
    _fileBuffer: Buffer,
    _companyId: number | null,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    const documentType = attachment.documentType;

    if (documentType === ArDocumentType.TAX_INVOICE) {
      return this.routeInvoice(attachment, fromEmail, subject);
    }

    if (documentType === ArDocumentType.DELIVERY_NOTE) {
      return this.routeDeliveryNote(attachment, fromEmail);
    }

    if (documentType === ArDocumentType.COC) {
      this.logger.log(
        `CoC document received from ${fromEmail} - requires manual upload for extraction pipeline`,
      );
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }

    this.logger.log(`Unroutable document type "${documentType}" from ${fromEmail}`);
    return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
  }

  private async routeInvoice(
    attachment: InboundEmailAttachment,
    fromEmail: string,
    subject: string,
  ): Promise<RoutingResult> {
    try {
      const supplier = await this.resolveSupplier(fromEmail);
      const invoiceNumber = this.extractInvoiceNumberFromSubject(subject);

      const invoice = new RubberTaxInvoice();
      invoice.firebaseUid = `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      invoice.invoiceNumber = invoiceNumber || `EMAIL-${Date.now()}`;
      invoice.invoiceType = TaxInvoiceType.SUPPLIER;
      invoice.companyId = supplier?.id || 0;
      invoice.documentPath = attachment.s3Path;
      invoice.status = TaxInvoiceStatus.PENDING;

      const saved = await this.taxInvoiceRepo.save(invoice);
      this.logger.log(`Created tax invoice ${saved.id} from email (${fromEmail})`);

      return {
        linkedEntityType: "RubberTaxInvoice",
        linkedEntityId: saved.id,
        extractionTriggered: false,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to route invoice: ${msg}`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }
  }

  private async routeDeliveryNote(
    attachment: InboundEmailAttachment,
    fromEmail: string,
  ): Promise<RoutingResult> {
    try {
      const supplier = await this.resolveSupplier(fromEmail);

      const dn = new RubberDeliveryNote();
      dn.firebaseUid = `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      dn.deliveryNoteNumber = `DN-EMAIL-${Date.now()}`;
      dn.deliveryNoteType = DeliveryNoteType.COMPOUND;
      dn.supplierCompanyId = supplier?.id || 0;
      dn.documentPath = attachment.s3Path;
      dn.status = DeliveryNoteStatus.PENDING;
      dn.versionStatus = DocumentVersionStatus.ACTIVE;

      const saved = await this.deliveryNoteRepo.save(dn);
      this.logger.log(`Created delivery note ${saved.id} from email (${fromEmail})`);

      return {
        linkedEntityType: "RubberDeliveryNote",
        linkedEntityId: saved.id,
        extractionTriggered: false,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to route delivery note: ${msg}`);
      return { linkedEntityType: null, linkedEntityId: null, extractionTriggered: false };
    }
  }

  private async resolveSupplier(fromEmail: string): Promise<RubberCompany | null> {
    const domain = fromEmail.split("@")[1];
    if (!domain) {
      return null;
    }

    const companies = await this.companyRepo.find({
      where: { isCompoundOwner: false },
    });

    return (
      companies.find((c) => {
        const emailConfig = c.emailConfig;
        if (!emailConfig) {
          return false;
        }
        return Object.values(emailConfig).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(domain.toLowerCase()),
        );
      }) || null
    );
  }

  private extractInvoiceNumberFromSubject(subject: string): string | null {
    const patterns = [
      /inv(?:oice)?\s*(?:no\.?|#|number)?\s*[:.]?\s*([A-Z0-9][\w-]+)/i,
      /(?:no\.?|#)\s*([A-Z0-9][\w-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }
}
