import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum QcpApprovalTokenStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  SUPERSEDED = "SUPERSEDED",
}

export type QcpPartyRole = "mps" | "client" | "third_party";

export class QcpApprovalToken {
  id: number;

  company: StockControlCompany;

  companyId: number;

  controlPlanId: number;

  controlPlanVersion: number;

  partyRole: QcpPartyRole;

  recipientEmail: string;

  recipientName: string | null;

  token: string;

  tokenExpiresAt: Date;

  status: QcpApprovalTokenStatus;

  activitiesSnapshot: any[] | null;

  submittedActivities: any[] | null;

  lineRemarks: Array<{ operationNumber: number; remark: string }> | null;

  overallComments: string | null;

  signatureName: string | null;

  signatureUrl: string | null;

  signedAt: Date | null;

  sentByParty: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
