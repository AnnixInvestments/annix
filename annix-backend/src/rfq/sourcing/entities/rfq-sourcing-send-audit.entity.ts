export class RfqSourcingSendAudit {
  id: number;

  companyId: number;

  sessionId: number;

  supplierProfileId: number | null;

  preferredSupplierId: number | null;

  recipientEmail: string;

  category: string;

  itemRowNumbers: number[];

  aiRunId: string | null;

  draftedBody: string;

  editedBody: string;

  wasEdited: boolean;

  approverUserId: number;

  messageId: string | null;

  sentAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
