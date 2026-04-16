import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
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
  | "cv-assistant"
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

@Entity("customer_feedback")
export class CustomerFeedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CustomerProfile, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "customer_profile_id" })
  customerProfile: CustomerProfile | null;

  @Column({ name: "customer_profile_id", nullable: true })
  customerProfileId: number | null;

  @ManyToOne(() => Conversation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation | null;

  @Column({ name: "conversation_id", nullable: true })
  conversationId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to_id" })
  assignedTo: User | null;

  @Column({ name: "assigned_to_id", nullable: true })
  assignedToId: number | null;

  @Column({ type: "text" })
  content: string;

  @Column({ length: 10, default: "text" })
  source: FeedbackSource;

  @Column({ name: "page_url", type: "varchar", length: 500, nullable: true })
  pageUrl: string | null;

  @Column({ name: "submitter_type", type: "varchar", length: 30, nullable: true })
  submitterType: SubmitterType | null;

  @Column({ name: "submitter_name", type: "varchar", length: 200, nullable: true })
  submitterName: string | null;

  @Column({ name: "submitter_email", type: "varchar", length: 255, nullable: true })
  submitterEmail: string | null;

  @Column({ name: "app_context", type: "varchar", length: 50, nullable: true })
  appContext: string | null;

  @Column({ name: "github_issue_number", type: "int", nullable: true })
  githubIssueNumber: number | null;

  @Column({ name: "ai_classification", type: "varchar", length: 30, nullable: true })
  aiClassification: FeedbackClassification | null;

  @Column({ name: "translator_confidence", type: "double precision", nullable: true })
  translatorConfidence: number | null;

  @Column({ name: "translator_likely_location", type: "varchar", length: 255, nullable: true })
  translatorLikelyLocation: string | null;

  @Column({ name: "translator_likely_cause", type: "text", nullable: true })
  translatorLikelyCause: string | null;

  @Column({ name: "translator_affected_surface", type: "varchar", length: 255, nullable: true })
  translatorAffectedSurface: string | null;

  @Column({ name: "translator_fix_scope", type: "varchar", length: 100, nullable: true })
  translatorFixScope: string | null;

  @Column({ name: "translator_auto_fixable", type: "boolean", nullable: true })
  translatorAutoFixable: boolean | null;

  @Column({ name: "translator_risk_flags", type: "jsonb", nullable: true })
  translatorRiskFlags: string[] | null;

  @Column({ name: "translator_reproduction_steps", type: "jsonb", nullable: true })
  translatorReproductionSteps: string[] | null;

  @Column({ name: "capture_completeness_score", type: "double precision", nullable: true })
  captureCompletenessScore: number | null;

  @Column({ name: "capture_context", type: "jsonb", nullable: true })
  captureContext: FeedbackCaptureContext | null;

  @Column({ name: "status", type: "varchar", length: 20, default: "submitted" })
  status: FeedbackStatus;

  @Column({ name: "resolution_status", type: "varchar", length: 30, nullable: true })
  resolutionStatus: ResolutionStatus | null;

  @Column({ name: "test_criteria", type: "text", nullable: true })
  testCriteria: string | null;

  @Column({ name: "verified_at", type: "timestamptz", nullable: true })
  verifiedAt: Date | null;

  @OneToMany(
    () => FeedbackAttachment,
    (a) => a.feedback,
  )
  attachments: FeedbackAttachment[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
