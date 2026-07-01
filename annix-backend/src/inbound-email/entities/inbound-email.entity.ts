import { InboundEmailAttachment } from "./inbound-email-attachment.entity";
import { InboundEmailConfig } from "./inbound-email-config.entity";

export enum InboundEmailStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  PARTIAL = "partial",
  // Processed without error, but no linked record (CoC / invoice / DN) was
  // produced — e.g. the supplier couldn't be identified, an image-only CoC the
  // pipeline can't read, or a graph PDF with no parent CoC. Surfaced for manual
  // triage instead of being silently marked COMPLETED (and auto-deleted).
  NEEDS_REVIEW = "needs_review",
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
