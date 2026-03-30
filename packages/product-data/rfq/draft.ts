export interface SaveRfqDraftDto {
  draftId?: number;
  projectName?: string;
  currentStep: number;
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
}

export type RfqDraftStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "in_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "cancelled";

export interface SupplierCounts {
  pending: number;
  declined: number;
  intendToQuote: number;
  quoted: number;
}

export interface RfqDraftResponse {
  id: number;
  draftNumber: string;
  rfqNumber?: string;
  customerRfqReference?: string;
  projectName?: string;
  currentStep: number;
  completionPercentage: number;
  status: RfqDraftStatus;
  createdAt: Date;
  updatedAt: Date;
  isConverted: boolean;
  convertedRfqId?: number;
  supplierCounts?: SupplierCounts;
}

export interface RfqDraftFullResponse extends RfqDraftResponse {
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
}

export interface SaveAnonymousDraftDto {
  customerEmail?: string;
  projectName?: string;
  currentStep: number;
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  entries?: Record<string, any>[];
  browserFingerprint?: string;
}

export interface AnonymousDraftResponse {
  id: number;
  recoveryToken: string;
  customerEmail?: string;
  projectName?: string;
  currentStep: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnonymousDraftFullResponse extends AnonymousDraftResponse {
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  entries?: Record<string, any>[];
}

export interface RecoveryEmailResponse {
  message: string;
  draftFound: boolean;
}
