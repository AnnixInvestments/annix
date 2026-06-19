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

export class NixChatSession {
  id: number;

  userId: number;

  rfqId: number;

  conversationHistory: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
  }>;

  userPreferences: {
    preferredMaterials?: string[];
    preferredSchedules?: string[];
    preferredStandards?: string[];
    commonFlangeRatings?: string[];
    unitPreference?: "metric" | "imperial";
    learningEnabled?: boolean;
  };

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

  walkthroughState: WalkthroughState | null;

  isActive: boolean;

  lastInteractionAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
