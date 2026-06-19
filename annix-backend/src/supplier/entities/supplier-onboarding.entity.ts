import { User } from "../../user/entities/user.entity";
import { SupplierProfile } from "./supplier-profile.entity";

export enum SupplierOnboardingStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class SupplierOnboarding {
  id: number;

  supplier: SupplierProfile;

  supplierId: number;

  status: SupplierOnboardingStatus;

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
