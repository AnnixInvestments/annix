import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum CoatingAnalysisStatus {
  PENDING = "pending",
  ANALYSED = "analysed",
  ACCEPTED = "accepted",
  FAILED = "failed",
}

export type CoatRole = "primer" | "intermediate" | "final";

export interface CoatDetail {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
  coatRole?: CoatRole;
  minDftUm: number;
  maxDftUm: number;
  solidsByVolumePercent: number;
  coverageM2PerLiter: number;
  litersRequired: number;
  verified?: boolean;
  tdsFilePath?: string | null;
}

export interface StockAssessmentItem {
  product: string;
  stockItemId: number | null;
  stockItemName: string | null;
  currentStock: number;
  required: number;
  unit: string;
  sufficient: boolean;
}

export class JobCardCoatingAnalysis {
  id: number;

  jobCardId: number;

  jobCard: JobCard;

  applicationType: string | null;

  surfacePrep: string | null;

  extSurfacePrep: string | null;

  intSurfacePrep: string | null;

  extM2: number;

  intM2: number;

  coats: CoatDetail[];

  stockAssessment: StockAssessmentItem[];

  hasInternalLining: boolean;

  rawNotes: string | null;

  status: CoatingAnalysisStatus;

  error: string | null;

  analysedAt: Date | null;

  acceptedBy: string | null;

  acceptedAt: Date | null;

  pmEditedAssessment: StockAssessmentItem[] | null;

  pmEditedBy: string | null;

  pmEditedAt: Date | null;

  company: StockControlCompany;

  companyId: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
