import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type WalkthroughEndReason = "completed" | "abandoned" | "stopped";

export interface WalkthroughState {
  capabilityKey: string;
  guideSlug: string | null;
  startedAt: string;
  currentStep: number;
  totalSteps: number;
  stepHistory: Array<{
    step: number;
    title: string;
    completedAt: string;
    action: "advanced" | "back" | "skipped" | "stuck";
  }>;
  endedAt?: string;
  endReason?: WalkthroughEndReason;
}

@Entity("nix_chat_sessions")
export class NixChatSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "rfq_id", nullable: true })
  rfqId: number;

  @Column({ type: "jsonb", name: "conversation_history", default: [] })
  conversationHistory: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
  }>;

  @Column({ type: "jsonb", name: "user_preferences", default: {} })
  userPreferences: {
    preferredMaterials?: string[];
    preferredSchedules?: string[];
    preferredStandards?: string[];
    commonFlangeRatings?: string[];
    unitPreference?: "metric" | "imperial";
    learningEnabled?: boolean;
  };

  @Column({ type: "jsonb", name: "session_context", default: {} })
  sessionContext: {
    currentRfqItems?: any[];
    lastValidationIssues?: any[];
    extractionHistory?: number[];
    recentCorrections?: Array<{
      extractedValue: string;
      correctedValue: string;
      fieldType: string;
    }>;
    lastCreatedRfqId?: number;
    lastCreatedRfqNumber?: string;
    pageContext?: {
      currentPage: string;
      rfqType?: string;
      portalContext: "customer" | "supplier" | "admin" | "general";
    };
    guidedMode?: {
      isActive: boolean;
      currentStep: number;
      currentFieldId: string | null;
      completedFields: string[];
      skippedFields: string[];
    };
  };

  @Column({ type: "jsonb", name: "walkthrough_state", nullable: true })
  walkthroughState: WalkthroughState | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "last_interaction_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastInteractionAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
