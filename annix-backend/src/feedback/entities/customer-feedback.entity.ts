import { CustomerProfile } from "../../customer/entities/customer-profile.entity";
import { Conversation } from "../../messaging/entities/conversation.entity";
import { User } from "../../user/entities/user.entity";
import { FeedbackAttachment } from "./feedback-attachment.entity";

export type FeedbackSource = "text" | "voice";

export type SubmitterType =
  | "customer"
  | "admin"
  | "supplier"
  | "stock-control"
  | "au-rubber"
  | "annix-orbit"
  | "annix-rep";

export type FeedbackClassification =
  | "bug"
  | "feature-request"
  | "question"
  | "ui-issue"
  | "data-issue";

export interface FeedbackCaptureContext {
  captureUrl?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  devicePixelRatio?: number | null;
  userAgent?: string | null;
  previewUserId?: number | null;
  previewUserName?: string | null;
  previewUserEmail?: string | null;
  lastUserActions?: string[] | null;
  consoleErrors?: string[] | null;
  failedNetworkCalls?: string[] | null;
  clickedElement?: string | null;
}

export type FeedbackStatus = "submitted" | "triaged" | "in_progress" | "resolved";

export type ResolutionStatus =
  | "needs_investigation"
  | "investigating"
  | "fix_in_progress"
  | "fix_deployed"
  | "verified"
  | "cannot_reproduce"
  | "wont_fix"
  | "duplicate";

export class CustomerFeedback {
  id: number;

  customerProfile: CustomerProfile | null;

  customerProfileId: number | null;

  conversation: Conversation | null;

  conversationId: number | null;

  assignedTo: User | null;

  assignedToId: number | null;

  content: string;

  source: FeedbackSource;

  pageUrl: string | null;

  submitterType: SubmitterType | null;

  submitterName: string | null;

  submitterEmail: string | null;

  appContext: string | null;

  githubIssueNumber: number | null;

  aiClassification: FeedbackClassification | null;

  translatorConfidence: number | null;

  translatorLikelyLocation: string | null;

  translatorLikelyCause: string | null;

  translatorAffectedSurface: string | null;

  translatorFixScope: string | null;

  translatorAutoFixable: boolean | null;

  translatorRiskFlags: string[] | null;

  translatorReproductionSteps: string[] | null;

  captureCompletenessScore: number | null;

  captureContext: FeedbackCaptureContext | null;

  status: FeedbackStatus;

  resolutionStatus: ResolutionStatus | null;

  testCriteria: string | null;

  verifiedAt: Date | null;

  severity: string | null;

  testingSeverityOverride: string | null;

  testingStatusOverride: string | null;

  attachments: FeedbackAttachment[];

  createdAt: Date;
}
