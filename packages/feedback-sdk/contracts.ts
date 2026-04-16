export type FeedbackAuthContext =
  | "customer"
  | "admin"
  | "stock-control"
  | "au-rubber"
  | "supplier"
  | "cv-assistant"
  | "annix-rep"
  | "comply-sa";

export type FeedbackSource = "text" | "voice";

export type FeedbackClassification =
  | "bug"
  | "feature-request"
  | "question"
  | "ui-issue"
  | "data-issue";

export type FeedbackStatus = "submitted" | "triaged" | "in_progress" | "resolved";

export type FeedbackResolutionStatus =
  | "needs_investigation"
  | "investigating"
  | "fix_in_progress"
  | "fix_deployed"
  | "verified"
  | "cannot_reproduce"
  | "wont_fix"
  | "duplicate";

export interface FeedbackSubmitterOverride {
  userId: number;
  name: string;
  email: string;
}

export interface FeedbackSubmissionPayload {
  content: string;
  source: FeedbackSource;
  pageUrl?: string;
  captureUrl?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  devicePixelRatio?: number;
  userAgent?: string;
  previewUserId?: number;
  previewUserName?: string;
  previewUserEmail?: string;
  lastUserActions?: string[];
  consoleErrors?: string[];
  failedNetworkCalls?: string[];
  clickedElement?: string;
  appContext?: string;
}

export interface FeedbackSubmitResponse {
  id: number;
  message: string;
}

export interface FeedbackStatusResponse {
  id: number;
  status: FeedbackStatus;
  resolutionStatus: FeedbackResolutionStatus | null;
  aiClassification: FeedbackClassification | null;
  githubIssueNumber: number | null;
  appContext: string | null;
  createdAt: string;
}

export interface FeedbackHostCapabilities {
  canCaptureScreenshot?: boolean;
  canAttachFiles?: boolean;
}

export interface FeedbackHostContext {
  authContext: FeedbackAuthContext;
  appContext?: string;
  pageUrl?: string;
  captureUrl?: string;
  submitterOverride?: FeedbackSubmitterOverride | null;
  capabilities?: FeedbackHostCapabilities;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FeedbackAuthConfig {
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

export interface FeedbackSubmitRequest {
  authContext: FeedbackAuthContext;
  payload: FeedbackSubmissionPayload;
  files?: File[];
}

export interface FeedbackStatusRequest {
  authContext: FeedbackAuthContext;
  feedbackId: number;
}

export interface FeedbackClientOptions {
  apiBaseUrl: string;
  resolveAuth: (authContext: FeedbackAuthContext) => FeedbackAuthConfig;
  fetchImpl?: typeof fetch;
}
