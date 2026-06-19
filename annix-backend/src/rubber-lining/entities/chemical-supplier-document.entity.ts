import { DocumentVersionStatus } from "./document-version.types";
import { RubberCompany } from "./rubber-company.entity";
import { CocProcessingStatus } from "./rubber-supplier-coc.entity";

export interface ChemicalCoaTestResult {
  test: string;
  unit?: string | null;
  result?: string | null;
  method?: string | null;
}

export interface ChemicalDocExtractedData {
  productName?: string | null;
  supplierName?: string | null;
  casNumber?: string | null;
  deliveryNoteNumber?: string | null;
  batchNumber?: string | null;

  manufactureDate?: string | null;
  expiryDate?: string | null;

  unNumber?: string | null;
  hazardClass?: string | null;
  packingGroup?: string | null;
  properShippingName?: string | null;
  environmentalHazard?: string | null;

  netMassKg?: number | null;
  volume?: string | null;
  packagingType?: string | null;
  packageQuantity?: number | null;

  coaTestResults?: ChemicalCoaTestResult[];
}

export class ChemicalSupplierDocument {
  id: number;

  firebaseUid: string;

  supplierCompanyId: number | null;

  supplierCompany: RubberCompany | null;

  deliveryNoteNumber: string | null;

  batchNumber: string | null;

  productName: string | null;

  documentPath: string;

  documentHash: string | null;

  processingStatus: CocProcessingStatus;

  extractedData: ChemicalDocExtractedData | null;

  reviewNotes: string | null;

  approvedBy: string | null;

  approvedAt: Date | null;

  createdBy: string | null;

  version: number;

  previousVersionId: number | null;

  previousVersion: ChemicalSupplierDocument | null;

  versionStatus: DocumentVersionStatus;

  createdAt: Date;

  updatedAt: Date;
}
