import { InboundEmailAttachment } from "./inbound-email-attachment.entity";
import { InboundEmailConfig } from "./inbound-email-config.entity";

export enum InboundEmailStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  PARTIAL = "partial",
  FAILED = "failed",
  UNCLASSIFIED = "unclassified",
}

export class InboundEmail {
  id: number;

  config: InboundEmailConfig;

  configId: number;

  app: string;

  companyId: number | null;

  messageId: string;

  fromEmail: string;

  fromName: string | null;

  subject: string | null;

  receivedAt: Date | null;

  attachmentCount: number;

  processingStatus: InboundEmailStatus;

  errorMessage: string | null;

  attachments: InboundEmailAttachment[];

  createdAt: Date;

  updatedAt: Date;
}
