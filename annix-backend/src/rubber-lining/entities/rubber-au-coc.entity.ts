import { RubberCompany } from "./rubber-company.entity";
import { RubberDeliveryNote } from "./rubber-delivery-note.entity";

export interface ExtractedRollData {
  rollNumber: string;
  thicknessMm?: number | null;
  widthMm?: number | null;
  lengthM?: number | null;
  weightKg?: number | null;
  areaSqM?: number | null;
}

export enum AuCocStatus {
  DRAFT = "DRAFT",
  GENERATED = "GENERATED",
  APPROVED = "APPROVED",
  SENT = "SENT",
}

export enum AuCocReadinessStatus {
  NOT_TRACKED = "NOT_TRACKED",
  WAITING_FOR_CALENDERER_COC = "WAITING_FOR_CALENDERER_COC",
  WAITING_FOR_COMPOUNDER_COC = "WAITING_FOR_COMPOUNDER_COC",
  WAITING_FOR_GRAPH = "WAITING_FOR_GRAPH",
  WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL",
  READY_FOR_GENERATION = "READY_FOR_GENERATION",
  AUTO_GENERATED = "AUTO_GENERATED",
  GENERATION_FAILED = "GENERATION_FAILED",
}

export interface ReadinessDetails {
  calendererCocId: number | null;
  compounderCocId: number | null;
  graphPdfPath: string | null;
  calendererApproved: boolean;
  compounderApproved: boolean;
  missingDocuments: string[];
  lastCheckedAt: string;
}

export class RubberAuCoc {
  id: number;

  firebaseUid: string;

  cocNumber: string;

  customerCompanyId: number;

  customerCompany: RubberCompany;

  poNumber: string | null;

  deliveryNoteRef: string | null;

  sourceDeliveryNoteId: number | null;

  sourceDeliveryNote: RubberDeliveryNote;

  extractedRollData: ExtractedRollData[] | null;

  status: AuCocStatus;

  generatedPdfPath: string | null;

  sentToEmail: string | null;

  sentAt: Date | null;

  createdBy: string | null;

  notes: string | null;

  approvedByName: string | null;

  approvedAt: Date | null;

  readinessStatus: AuCocReadinessStatus;

  readinessDetails: ReadinessDetails | null;

  lastAutoProcessedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
