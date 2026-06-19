export class CustomFieldValue {
  id: number;

  entityType: "customer" | "supplier";

  entityId: number;

  fieldName: string;

  fieldValue: string | null;

  documentCategory: string;

  extractedFromDocumentId: number | null;

  confidence: number | null;

  isVerified: boolean;

  verifiedByUserId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
