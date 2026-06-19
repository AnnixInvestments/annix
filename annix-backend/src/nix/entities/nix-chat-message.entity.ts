import { NixChatSession } from "./nix-chat-session.entity";

export class NixChatMessage {
  id: number;

  sessionId: number;

  session: NixChatSession;

  role: "user" | "assistant" | "system";

  content: string;

  metadata: {
    intent?: string;
    itemsCreated?: number;
    validationIssues?: any[];
    suggestionsProvided?: string[];
    tokensUsed?: number;
    processingTimeMs?: number;
    model?: string;
  };

  parentMessageId: number;

  createdAt: Date;
}
