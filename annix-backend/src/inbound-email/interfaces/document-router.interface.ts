import { InboundEmailAttachment } from "../entities/inbound-email-attachment.entity";

export interface RoutingResult {
  linkedEntityType: string | null;
  linkedEntityId: number | null;
  extractionTriggered: boolean;
}

export interface IDocumentRouter {
  route(
    attachment: InboundEmailAttachment,
    fileBuffer: Buffer,
    companyId: number | null,
    fromEmail: string,
    subject: string,
    supplierName?: string | null,
  ): Promise<RoutingResult>;

  supportedMimeTypes(): string[];
}

export const DOCUMENT_ROUTER = "DOCUMENT_ROUTER";
