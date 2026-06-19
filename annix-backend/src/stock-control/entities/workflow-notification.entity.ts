import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum NotificationActionType {
  APPROVAL_REQUIRED = "approval_required",
  APPROVAL_COMPLETED = "approval_completed",
  APPROVAL_REJECTED = "approval_rejected",
  STOCK_ALLOCATED = "stock_allocated",
  DISPATCH_READY = "dispatch_ready",
  DISPATCH_COMPLETED = "dispatch_completed",
  OVER_ALLOCATION_APPROVAL = "over_allocation_approval",
  JOB_CARDS_IMPORTED = "job_cards_imported",
  CPO_CALLOFF_NEEDED = "cpo_calloff_needed",
  CPO_INVOICE_OVERDUE = "cpo_invoice_overdue",
  CALIBRATION_EXPIRY_WARNING = "calibration_expiry_warning",
  CALIBRATION_EXPIRED = "calibration_expired",
  BACKGROUND_STEP_REQUIRED = "background_step_required",
  BACKGROUND_STEP_COMPLETED = "background_step_completed",
  DOCUMENT_ARRIVED = "document_arrived",
  QA_REJECTION_ESCALATION = "qa_rejection_escalation",
  QCP_CHANGES_REQUESTED = "qcp_changes_requested",
}

export class WorkflowNotification {
  id: number;

  company: StockControlCompany;

  companyId: number;

  user: StockControlUser;

  userId: number;

  jobCard: JobCard | null;

  jobCardId: number | null;

  title: string;

  message: string | null;

  actionType: NotificationActionType;

  actionUrl: string | null;

  readAt: Date | null;

  sender: StockControlUser | null;

  senderId: number | null;

  senderName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUser?: User | null;

  unifiedUserId?: number | null;

  unifiedSender?: User | null;

  unifiedSenderId?: number | null;

  createdAt: Date;
}
