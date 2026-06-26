import { Company } from "../../platform/entities/company.entity";
import type { PanelShape } from "../lib/rubberCuttingCalculator";
import { CustomerPurchaseOrder } from "./customer-purchase-order.entity";
import { DispatchCdn } from "./dispatch-cdn.entity";
import { DispatchLoadPhoto } from "./dispatch-load-photo.entity";
import { DispatchScan } from "./dispatch-scan.entity";
import { JobCardApproval } from "./job-card-approval.entity";
import { JobCardAttachment } from "./job-card-attachment.entity";
import { JobCardDocument } from "./job-card-document.entity";
import { JobCardJobFile } from "./job-card-job-file.entity";
import { JobCardLineItem } from "./job-card-line-item.entity";
import { JobCardVersion } from "./job-card-version.entity";
import { StockAllocation } from "./stock-allocation.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export interface RubberPlanManualRoll {
  widthMm: number;
  lengthM: number;
  thicknessMm: number;
  cuts: Array<{
    description: string;
    widthMm: number;
    lengthMm: number;
    quantity: number;
    // Developed outline of a non-rectangular panel (e.g. a reducer/cone annular
    // sector) carried from the editor so the printed cutting diagram matches.
    shape?: PanelShape;
  }>;
}

export interface RubberPlanOverride {
  status: "pending" | "accepted" | "manual";
  selectedPlyCombination: number[] | null;
  manualRolls: RubberPlanManualRoll[] | null;
  // Exact editor placements so the manual cutting-diagram editor can restore the
  // saved layout on reopen (manualRolls is grouped/positionless and lossy).
  placements?: RubberPlanPlacement[] | null;
  dimensionOverrides?: RubberDimensionOverrideDto[] | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface RubberPlanPlacement {
  panelId: string;
  itemId: string;
  itemNo: string | null;
  description: string;
  widthMm: number;
  lengthMm: number;
  originalWidthMm: number;
  originalLengthMm: number;
  rotated: boolean;
  colorIndex: number;
  rollIndex: number;
  xMm: number;
  yMm: number;
  shape?: unknown;
  dimensionContext?: unknown;
}

export interface RubberDimensionOverrideDto {
  itemType: string | null;
  nbMm: number | null;
  odMm: number | null;
  schedule: string | null;
  pipeLengthMm: number;
  flangeConfig: string | null;
  calculatedWidthMm: number;
  calculatedLengthMm: number;
  overrideWidthMm: number;
  overrideLengthMm: number;
}

export enum JobCardStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export const WORKFLOW_STATUS_DRAFT = "draft";
export const WORKFLOW_STATUS_FILE_CLOSED = "file_closed";

export class JobCard {
  id: number;

  jobNumber: string;

  jcNumber: string | null;

  pageNumber: string | null;

  jobName: string;

  customerName: string | null;

  description: string | null;

  poNumber: string | null;

  siteLocation: string | null;

  contactPerson: string | null;

  dueDate: string | null;

  notes: string | null;

  reference: string | null;

  customFields: Record<string, string> | null;

  rubberPlanOverride: RubberPlanOverride | null;

  status: JobCardStatus;

  workflowStatus: string;

  versionNumber: number;

  sourceFilePath: string | null;

  sourceFileName: string | null;

  cpo: CustomerPurchaseOrder | null;

  cpoId: number | null;

  isCpoCalloff: boolean;

  parentJobCard: JobCard | null;

  parentJobCardId: number | null;

  deliveryJobCards: JobCard[];

  jtDnNumber: string | null;

  supersededById: number | null;

  supersededBy: JobCard | null;

  workflowCeiling: string | null;

  company: StockControlCompany;

  companyId: number;

  allocations: StockAllocation[];

  lineItems: JobCardLineItem[];

  documents: JobCardDocument[];

  jobFiles: JobCardJobFile[];

  approvals: JobCardApproval[];

  dispatchScans: DispatchScan[];

  dispatchCdns: DispatchCdn[];

  dispatchLoadPhotos: DispatchLoadPhoto[];

  versions: JobCardVersion[];

  attachments: JobCardAttachment[];

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
