import type { ChemicalDocExtractedData } from "../entities/chemical-supplier-document.entity";
import { CocProcessingStatus } from "../entities/rubber-supplier-coc.entity";

export interface ChemicalSupplierDocumentDto {
  id: number;
  firebaseUid: string;
  supplierCompanyId: number;
  supplierName: string | null;
  deliveryNoteNumber: string | null;
  batchNumber: string | null;
  productName: string | null;
  documentPath: string;
  processingStatus: CocProcessingStatus;
  processingStatusLabel: string;
  extractedData: ChemicalDocExtractedData | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChemicalSupplierDocumentDto {
  supplierCompanyId?: number | null;
  supplierName?: string | null;
  deliveryNoteNumber?: string | null;
  batchNumber?: string | null;
  productName?: string | null;
}

export interface UpdateChemicalSupplierDocumentDto {
  supplierCompanyId?: number;
  deliveryNoteNumber?: string | null;
  batchNumber?: string | null;
  productName?: string | null;
  extractedData?: ChemicalDocExtractedData | null;
  reviewNotes?: string | null;
}

export interface ChemicalSupplierDocumentFilters {
  supplierCompanyId?: number;
  processingStatus?: CocProcessingStatus;
  search?: string;
}

const PROCESSING_STATUS_LABELS: Record<CocProcessingStatus, string> = {
  [CocProcessingStatus.PENDING]: "Pending",
  [CocProcessingStatus.EXTRACTED]: "Extracted",
  [CocProcessingStatus.NEEDS_REVIEW]: "Needs Review",
  [CocProcessingStatus.APPROVED]: "Approved",
  [CocProcessingStatus.FAILED]: "Failed",
};

export function processingStatusLabel(status: CocProcessingStatus): string {
  return PROCESSING_STATUS_LABELS[status] ?? status;
}
