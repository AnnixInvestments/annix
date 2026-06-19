import { InboundEmail } from "./inbound-email.entity";

export enum AttachmentExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}

export class InboundEmailAttachment {
  id: number;

  inboundEmail: InboundEmail;

  inboundEmailId: number;

  originalFilename: string;

  mimeType: string;

  fileSizeBytes: number;

  s3Path: string | null;

  documentType: string;

  classificationConfidence: number | null;

  classificationSource: string | null;

  linkedEntityType: string | null;

  linkedEntityId: number | null;

  extractionStatus: AttachmentExtractionStatus;

  extractedData: object | null;

  errorMessage: string | null;

  createdAt: Date;

  updatedAt: Date;
}
