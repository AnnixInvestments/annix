import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum QcpPlanType {
  PAINT_EXTERNAL = "paint_external",
  PAINT_INTERNAL = "paint_internal",
  RUBBER = "rubber",
  HDPE = "hdpe",
}

export enum InterventionType {
  HOLD = "H",
  INSPECTION = "I",
  WITNESS = "W",
  REVIEW = "R",
  SURVEILLANCE = "S",
  VERIFY = "V",
}

export interface PartySignOff {
  interventionType: InterventionType | null;
  initial: string | null;
  name: string | null;
  signatureUrl: string | null;
  date: string | null;
}

export interface QcpActivity {
  operationNumber: number;
  description: string;
  specification: string | null;
  procedureRequired: string | null;
  documentation: string | null;
  pls: PartySignOff;
  mps: PartySignOff;
  client: PartySignOff;
  thirdParty: PartySignOff;
  remarks: string | null;
}

export interface QcpApprovalSignature {
  party: string;
  name: string | null;
  signatureUrl: string | null;
  date: string | null;
}

export class QcControlPlan {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number | null;

  cpoId: number | null;

  planType: QcpPlanType;

  qcpNumber: string | null;

  documentRef: string | null;

  revision: string | null;

  customerName: string | null;

  orderNumber: string | null;

  jobNumber: string | null;

  jobName: string | null;

  specification: string | null;

  itemDescription: string | null;

  version: number;

  approvalStatus: string;

  clientEmail: string | null;

  thirdPartyEmail: string | null;

  activeParties: string[] | null;

  activities: QcpActivity[];

  approvalSignatures: QcpApprovalSignature[];

  sourceCpoQcpId: number | null;

  createdByName: string;

  createdById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
