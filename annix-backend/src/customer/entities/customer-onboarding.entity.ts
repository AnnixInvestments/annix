import { User } from "../../user/entities/user.entity";
import { CustomerProfile } from "./customer-profile.entity";

export enum CustomerOnboardingStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class CustomerOnboarding {
  id: number;

  customer: CustomerProfile;

  customerId: number;

  status: CustomerOnboardingStatus;

  companyDetailsComplete: boolean;

  documentsComplete: boolean;

  /** Set when document verification found a field mismatch or low OCR confidence. */
  documentsNeedReview: boolean;

  submittedAt: Date | null;

  reviewedAt: Date | null;

  reviewedBy: User;

  reviewedById: number | null;

  rejectionReason: string | null;

  remediationSteps: string | null;

  resubmissionCount: number;

  createdAt: Date;

  updatedAt: Date;
}
