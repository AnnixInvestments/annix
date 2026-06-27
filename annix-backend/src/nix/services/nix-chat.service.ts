import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { ChatMessage } from "../ai-providers/claude-chat.provider";
import {
  NixCapabilityRegistry,
  WalkthroughEngine,
  type WalkthroughStepView,
} from "../capabilities";
import { NixChatMessage } from "../entities/nix-chat-message.entity";
import { NixChatSession, NixSessionOwner } from "../entities/nix-chat-session.entity";
import { NixChatMessageRepository } from "../nix-chat-message.repository";
import { NixChatSessionRepository } from "../nix-chat-session.repository";
import {
  GUIDED_MODE_INSTRUCTIONS,
  PIPING_DOMAIN_KNOWLEDGE,
  PROMPT_CONFIDENTIALITY_INSTRUCTION,
} from "../prompts/piping-domain.prompt";
import { NixItemParserService } from "./nix-item-parser.service";

export interface CreateSessionDto {
  owner: NixSessionOwner;
  rfqId?: number;
}

export interface SendMessageDto {
  sessionId: number;
  owner: NixSessionOwner;
  message: string;
  context?: {
    currentRfqItems?: any[];
    lastValidationIssues?: any[];
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
}

export interface ChatResponseDto {
  sessionId: number;
  messageId: number;
  content: string;
  metadata?: {
    tokensUsed?: number;
    processingTimeMs?: number;
    intent?: string;
    suggestionsProvided?: string[];
  };
}

const AI_UNAVAILABLE_MESSAGE =
  "The AI service is temporarily unavailable. Please try again shortly.";

@Injectable()
export class NixChatService {
  private readonly logger = new Logger(NixChatService.name);
  private readonly maxHistoryLength = 50;
  private readonly contextWindow = 20;

  constructor(
    private readonly sessionRepository: NixChatSessionRepository,
    private readonly messageRepository: NixChatMessageRepository,
    private readonly itemParserService: NixItemParserService,
    private readonly aiChatService: AiChatService,
    private readonly aiUsageService: AiUsageService,
    private readonly walkthroughEngine: WalkthroughEngine,
    private readonly capabilityRegistry: NixCapabilityRegistry,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<NixChatSession> {
    const existingActiveSession = await this.sessionRepository.findActiveForUser(
      dto.owner,
      dto.rfqId,
    );

    if (existingActiveSession) {
      return existingActiveSession;
    }

    return this.sessionRepository.create({
      userId: dto.owner.userId,
      appScope: dto.owner.appScope,
      rfqId: dto.rfqId,
      isActive: true,
      conversationHistory: [],
      userPreferences: { learningEnabled: true },
      sessionContext: {},
    });
  }

  async session(sessionId: number, owner: NixSessionOwner): Promise<NixChatSession> {
    return this.ownedSession(sessionId, owner);
  }

  private async ownedSession(sessionId: number, owner: NixSessionOwner): Promise<NixChatSession> {
    const session = await this.sessionRepository.findOwnedById(sessionId, owner);

    if (!session) {
      const exists = await this.sessionRepository.findById(sessionId);
      if (exists) {
        throw new ForbiddenException("You do not have access to this chat session");
      }
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  async sendMessage(dto: SendMessageDto): Promise<ChatResponseDto> {
    if (!(await this.aiChatService.isAvailable())) {
      this.logger.error(
        "No AI chat provider available — configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      );
      throw new Error(AI_UNAVAILABLE_MESSAGE);
    }

    const session = await this.ownedSession(dto.sessionId, dto.owner);

    if (dto.context?.currentRfqItems) {
      session.sessionContext.currentRfqItems = dto.context.currentRfqItems;
    }
    if (dto.context?.lastValidationIssues) {
      session.sessionContext.lastValidationIssues = dto.context.lastValidationIssues;
    }
    if (dto.context?.pageContext) {
      session.sessionContext.pageContext = dto.context.pageContext;
    }
    if (dto.context?.guidedMode) {
      session.sessionContext.guidedMode = dto.context.guidedMode;
    }

    const shouldActivateGuidedMode = this.detectGuidedModeTrigger(dto.message);
    if (shouldActivateGuidedMode && !session.sessionContext.guidedMode?.isActive) {
      session.sessionContext.guidedMode = {
        isActive: true,
        currentStep: session.sessionContext.guidedMode?.currentStep ?? 1,
        currentFieldId: null,
        completedFields: session.sessionContext.guidedMode?.completedFields ?? [],
        skippedFields: [],
      };
    }

    const walkthroughResult = await this.interceptWalkthrough(dto.sessionId, session, dto.message);
    if (walkthroughResult?.kind === "handled") {
      const userMsg = await this.saveMessage(dto.sessionId, "user", dto.message);
      const assistantMsg = await this.saveMessage(
        dto.sessionId,
        "assistant",
        walkthroughResult.response,
        { intent: "walkthrough" },
      );
      const refreshedSession = await this.ownedSession(dto.sessionId, dto.owner);
      refreshedSession.conversationHistory = [
        ...refreshedSession.conversationHistory,
        { role: "user" as const, content: dto.message, timestamp: new Date().toISOString() },
        {
          role: "assistant" as const,
          content: walkthroughResult.response,
          timestamp: new Date().toISOString(),
        },
      ].slice(-this.maxHistoryLength);
      refreshedSession.lastInteractionAt = new Date();
      await this.sessionRepository.save(refreshedSession);
      void userMsg;
      return {
        sessionId: dto.sessionId,
        messageId: assistantMsg.id,
        content: walkthroughResult.response,
        metadata: { intent: "walkthrough" },
      };
    }

    const userMessage: ChatMessage = { role: "user", content: dto.message };
    const conversationHistory = this.buildConversationHistory(session, userMessage);
    const baseSystemPrompt = this.buildSystemPrompt(session);
    const systemPrompt =
      walkthroughResult?.kind === "stuck"
        ? `${baseSystemPrompt}${walkthroughResult.systemPromptAddendum}`
        : baseSystemPrompt;

    const startTime = Date.now();

    const {
      content: rawResponseContent,
      providerUsed,
      tokensUsed,
    } = await this.aiChatService.chat(conversationHistory, systemPrompt);

    const responseContent = this.redactPromptLeakage(rawResponseContent);

    const processingTimeMs = Date.now() - startTime;

    this.aiUsageService.log({
      app: AiApp.NIX,
      actionType: "chat",
      provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
      model: providerUsed,
      tokensUsed,
      processingTimeMs,
    });

    await this.saveMessage(dto.sessionId, "user", dto.message);

    const assistantMsg = await this.saveMessage(dto.sessionId, "assistant", responseContent, {
      processingTimeMs,
      provider: providerUsed,
    });

    session.conversationHistory = [
      ...session.conversationHistory,
      { role: "user" as const, content: dto.message, timestamp: new Date().toISOString() },
      { role: "assistant" as const, content: responseContent, timestamp: new Date().toISOString() },
    ].slice(-this.maxHistoryLength);

    session.lastInteractionAt = new Date();
    await this.sessionRepository.save(session);

    this.logger.log(
      `Chat response generated for session ${dto.sessionId} in ${processingTimeMs}ms using ${providerUsed}`,
    );

    return {
      sessionId: dto.sessionId,
      messageId: assistantMsg.id,
      content: responseContent,
      metadata: { processingTimeMs },
    };
  }

  async *streamMessage(
    dto: SendMessageDto,
  ): AsyncGenerator<{ type: string; delta?: string; error?: string; metadata?: any }> {
    if (!(await this.aiChatService.isAvailable())) {
      this.logger.error(
        "No AI chat provider available — configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      );
      yield { type: "error", error: AI_UNAVAILABLE_MESSAGE };
      return;
    }

    const session = await this.ownedSession(dto.sessionId, dto.owner);

    if (dto.context?.currentRfqItems) {
      session.sessionContext.currentRfqItems = dto.context.currentRfqItems;
    }
    if (dto.context?.lastValidationIssues) {
      session.sessionContext.lastValidationIssues = dto.context.lastValidationIssues;
    }
    if (dto.context?.pageContext) {
      session.sessionContext.pageContext = dto.context.pageContext;
    }
    if (dto.context?.guidedMode) {
      session.sessionContext.guidedMode = dto.context.guidedMode;
    }

    const shouldActivateGuidedMode = this.detectGuidedModeTrigger(dto.message);
    if (shouldActivateGuidedMode && !session.sessionContext.guidedMode?.isActive) {
      session.sessionContext.guidedMode = {
        isActive: true,
        currentStep: session.sessionContext.guidedMode?.currentStep ?? 1,
        currentFieldId: null,
        completedFields: session.sessionContext.guidedMode?.completedFields ?? [],
        skippedFields: [],
      };
    }

    const walkthroughResult = await this.interceptWalkthrough(dto.sessionId, session, dto.message);
    if (walkthroughResult?.kind === "handled") {
      yield { type: "message_start", metadata: { intent: "walkthrough" } };
      yield { type: "content_delta", delta: walkthroughResult.response };
      await this.saveMessage(dto.sessionId, "user", dto.message);
      const assistantMsg = await this.saveMessage(
        dto.sessionId,
        "assistant",
        walkthroughResult.response,
        { intent: "walkthrough" },
      );
      const refreshedSession = await this.ownedSession(dto.sessionId, dto.owner);
      refreshedSession.conversationHistory = [
        ...refreshedSession.conversationHistory,
        { role: "user" as const, content: dto.message, timestamp: new Date().toISOString() },
        {
          role: "assistant" as const,
          content: walkthroughResult.response,
          timestamp: new Date().toISOString(),
        },
      ].slice(-this.maxHistoryLength);
      refreshedSession.lastInteractionAt = new Date();
      await this.sessionRepository.save(refreshedSession);
      yield {
        type: "message_stop",
        metadata: { messageId: assistantMsg.id, intent: "walkthrough" },
      };
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: dto.message };
    const conversationHistory = this.buildConversationHistory(session, userMessage);
    const baseSystemPrompt = this.buildSystemPrompt(session);
    const systemPrompt =
      walkthroughResult?.kind === "stuck"
        ? `${baseSystemPrompt}${walkthroughResult.systemPromptAddendum}`
        : baseSystemPrompt;

    const startTime = Date.now();
    let fullContent = "";
    let providerUsed = "";

    for await (const chunk of this.aiChatService.streamChat(conversationHistory, systemPrompt)) {
      if (chunk.type === "error") {
        yield { type: "error", error: chunk.error };
        return;
      }

      if (chunk.type === "message_start") {
        providerUsed = chunk.providerUsed || "";
        yield { type: "message_start" };
      } else if (chunk.type === "content_delta" && chunk.delta) {
        fullContent += chunk.delta;
        yield { type: "content_delta", delta: chunk.delta };
      } else if (chunk.type === "message_stop") {
        break;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    await this.saveMessage(dto.sessionId, "user", dto.message);
    await this.saveMessage(dto.sessionId, "assistant", fullContent, {
      processingTimeMs,
      provider: providerUsed,
      streamed: true,
    });

    session.conversationHistory = [
      ...session.conversationHistory,
      { role: "user" as const, content: dto.message, timestamp: new Date().toISOString() },
      { role: "assistant" as const, content: fullContent, timestamp: new Date().toISOString() },
    ].slice(-this.maxHistoryLength);

    session.lastInteractionAt = new Date();
    await this.sessionRepository.save(session);

    this.aiUsageService.log({
      app: AiApp.NIX,
      actionType: "stream-chat",
      provider: providerUsed.includes("claude") ? AiProvider.CLAUDE : AiProvider.GEMINI,
      model: providerUsed,
      processingTimeMs,
    });

    yield { type: "message_stop", metadata: { processingTimeMs, provider: providerUsed } };
  }

  async conversationHistory(
    sessionId: number,
    owner: NixSessionOwner,
    limit: number = 50,
  ): Promise<NixChatMessage[]> {
    await this.ownedSession(sessionId, owner);
    return this.messageRepository.findRecentForSession(sessionId, limit);
  }

  async updateUserPreferences(
    sessionId: number,
    owner: NixSessionOwner,
    preferences: Partial<NixChatSession["userPreferences"]>,
  ): Promise<void> {
    const session = await this.ownedSession(sessionId, owner);
    session.userPreferences = {
      ...session.userPreferences,
      ...preferences,
    };
    await this.sessionRepository.save(session);
  }

  async recordCorrection(
    sessionId: number,
    owner: NixSessionOwner,
    correction: {
      extractedValue: string;
      correctedValue: string;
      fieldType: string;
    },
  ): Promise<void> {
    const session = await this.ownedSession(sessionId, owner);

    if (!session.sessionContext.recentCorrections) {
      session.sessionContext.recentCorrections = [];
    }

    session.sessionContext.recentCorrections.push(correction);

    if (session.sessionContext.recentCorrections.length > 20) {
      session.sessionContext.recentCorrections =
        session.sessionContext.recentCorrections.slice(-20);
    }

    await this.sessionRepository.save(session);

    this.logger.log(
      `Recorded correction for session ${sessionId}: ${correction.fieldType} "${correction.extractedValue}" → "${correction.correctedValue}"`,
    );
  }

  async endSession(sessionId: number, owner: NixSessionOwner): Promise<void> {
    const session = await this.ownedSession(sessionId, owner);
    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  private buildConversationHistory(
    session: NixChatSession,
    newMessage: ChatMessage,
  ): ChatMessage[] {
    const recentHistory = session.conversationHistory.slice(-this.contextWindow).map((h) => ({
      role: h.role as "user" | "assistant" | "system",
      content: h.content,
    }));

    return [...recentHistory, newMessage];
  }

  private redactPromptLeakage(content: string): string {
    const leakMarkers = [
      "You are Nix, an expert AI assistant for piping and fabrication quoting systems",
      "## Confidentiality (non-negotiable)",
    ];
    if (leakMarkers.some((marker) => content.includes(marker))) {
      this.logger.warn(
        "Nix response post-filter detected potential system-prompt leakage; response redacted.",
      );
      return "I can't share my internal instructions, but I'm happy to help with your piping or RFQ request.";
    }
    return content;
  }

  private buildSystemPrompt(session: NixChatSession): string {
    let prompt = PIPING_DOMAIN_KNOWLEDGE + PROMPT_CONFIDENTIALITY_INSTRUCTION;

    if (session.userPreferences.preferredMaterials?.length) {
      prompt += `\n\n## User Preferences\n\nPreferred materials: ${session.userPreferences.preferredMaterials.join(", ")}`;
    }

    if (session.userPreferences.preferredSchedules?.length) {
      prompt += `\nPreferred schedules: ${session.userPreferences.preferredSchedules.join(", ")}`;
    }

    if (session.userPreferences.preferredStandards?.length) {
      prompt += `\nPreferred standards: ${session.userPreferences.preferredStandards.join(", ")}`;
    }

    if (session.sessionContext.recentCorrections?.length) {
      prompt += "\n\n## Recent Learning\n\nThe user has made these corrections recently:";
      session.sessionContext.recentCorrections.forEach((correction) => {
        prompt += `\n- ${correction.fieldType}: "${correction.extractedValue}" → "${correction.correctedValue}"`;
      });
      prompt += "\n\nApply these patterns to future suggestions.";
    }

    if (session.sessionContext.currentRfqItems?.length) {
      prompt += `\n\n## Current RFQ Context\n\nThe user is working on an RFQ with ${session.sessionContext.currentRfqItems.length} items:`;
      session.sessionContext.currentRfqItems.slice(0, 5).forEach((item, index) => {
        prompt += `\n${index + 1}. ${item.description || `${item.diameter}NB ${item.itemType}`}`;
      });

      if (session.sessionContext.currentRfqItems.length > 5) {
        prompt += `\n... and ${session.sessionContext.currentRfqItems.length - 5} more items`;
      }
    }

    if (session.sessionContext.lastValidationIssues?.length) {
      prompt += "\n\n## Recent Validation Issues\n\n";
      session.sessionContext.lastValidationIssues.forEach((issue) => {
        prompt += `- ${issue.message}\n`;
      });
    }

    if (session.sessionContext.pageContext) {
      const { currentPage, rfqType, portalContext } = session.sessionContext.pageContext;
      prompt += "\n\n## Current Page Context\n\n";
      prompt += `The user is currently on: **${currentPage}**\n`;
      prompt += `Portal type: **${portalContext}**\n`;
      if (rfqType) {
        prompt += `RFQ type: **${rfqType}**\n`;
      }
      prompt += `\n**IMPORTANT**: Since you know the page context, do NOT ask the user:
- What kind of document they are creating (it's an RFQ)
- What industry this is for (it's industrial piping/fabrication)
- What portal they are using (you already know it's ${portalContext})
${rfqType ? `- What type of RFQ they want (it's ${rfqType})` : ""}

Instead, directly help them with their request based on this context.`;
    }

    if (session.sessionContext.guidedMode?.isActive) {
      prompt += GUIDED_MODE_INSTRUCTIONS;
      prompt += "\n\n## Current Guided Mode State\n\n";
      prompt += "**Guided mode is ACTIVE**. You are guiding the user through the form.\n";
      prompt += `Current step: ${session.sessionContext.guidedMode.currentStep}\n`;

      if (session.sessionContext.guidedMode.completedFields?.length) {
        prompt += `Completed fields: ${session.sessionContext.guidedMode.completedFields.join(", ")}\n`;
      }
      if (session.sessionContext.guidedMode.currentFieldId) {
        prompt += `Currently focused field: ${session.sessionContext.guidedMode.currentFieldId}\n`;
      }
      prompt +=
        "\nContinue guiding the user through the remaining fields. Use action blocks to control the UI.";
    }

    return prompt;
  }

  private detectGuidedModeTrigger(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const triggerPhrases = [
      "help me fill out",
      "help me fill in",
      "guide me through",
      "walk me through",
      "help me complete",
      "help with this form",
      "guide me",
      "show me how to fill",
      "assist me with the form",
      "help filling out",
    ];

    return triggerPhrases.some((phrase) => lowerMessage.includes(phrase));
  }

  private async saveMessage(
    sessionId: number,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: any,
  ): Promise<NixChatMessage> {
    return this.messageRepository.create({
      sessionId,
      role,
      content,
      metadata,
    });
  }

  /**
   * Walkthrough interceptor — runs at the start of sendMessage / streamMessage.
   *
   * Returns:
   *   - `{ kind: "handled", response }`: the engine processed the user's
   *     message directly (start, advance, back, skip, stop). The chat
   *     service should bypass the AI call and return `response` as the
   *     assistant content.
   *   - `{ kind: "stuck", systemPromptAddendum }`: an active walkthrough is
   *     running and the user asked a free-form question — the chat service
   *     should call the AI as usual but prepend the addendum to the system
   *     prompt so Gemini answers in the context of the current step.
   *   - `null`: no walkthrough involvement; pass through unchanged.
   *
   * Phase 4 of issue #262.
   */
  private async interceptWalkthrough(
    sessionId: number,
    session: NixChatSession,
    message: string,
  ): Promise<
    { kind: "handled"; response: string } | { kind: "stuck"; systemPromptAddendum: string } | null
  > {
    const lowered = message.toLowerCase().trim();
    const owner: NixSessionOwner = { userId: session.userId, appScope: session.appScope };
    const activeState = session.walkthroughState;
    const hasActiveWalkthrough = activeState !== null && activeState.endedAt === undefined;

    if (!hasActiveWalkthrough) {
      const triggerMatch = this.capabilityRegistry.matchWalkthroughIntent(message);
      if (!triggerMatch) return null;
      const view = await this.walkthroughEngine.start(
        sessionId,
        owner,
        triggerMatch.capability.key,
      );
      return { kind: "handled", response: this.formatStepResponse(view, "started") };
    }

    if (this.matchesAdvanceVerb(lowered)) {
      const view = await this.walkthroughEngine.advance(sessionId, owner);
      return {
        kind: "handled",
        response: view ? this.formatStepResponse(view, "advanced") : this.completionMessage(),
      };
    }

    if (this.matchesBackVerb(lowered)) {
      const view = await this.walkthroughEngine.back(sessionId, owner);
      return {
        kind: "handled",
        response: view
          ? this.formatStepResponse(view, "back")
          : "Walkthrough already at the start.",
      };
    }

    if (this.matchesSkipVerb(lowered)) {
      const view = await this.walkthroughEngine.skip(sessionId, owner);
      return {
        kind: "handled",
        response: view ? this.formatStepResponse(view, "skipped") : this.completionMessage(),
      };
    }

    if (this.matchesStopVerb(lowered)) {
      await this.walkthroughEngine.stop(sessionId, owner, "abandoned");
      return {
        kind: "handled",
        response: "Walkthrough stopped. Ping me again if you'd like to resume.",
      };
    }

    if (this.matchesStuckVerb(lowered)) {
      const ctx = await this.walkthroughEngine.stuckContext(sessionId, owner);
      if (!ctx) return null;
      const guideBody = ctx.guide?.body ?? "";
      const addendum = [
        "\n\n## Current walkthrough step",
        `Capability: ${ctx.step.capabilityLabel}`,
        `Step ${ctx.step.step} of ${ctx.step.totalSteps}: ${ctx.step.title}`,
        "",
        ctx.step.body,
        guideBody ? `\n\n## Full guide for context\n\n${guideBody}` : "",
      ].join("\n");
      return { kind: "stuck", systemPromptAddendum: addendum };
    }

    return null;
  }

  private matchesAdvanceVerb(lowered: string): boolean {
    return /^(next|done|continue|advance|ok|okay|yes|got it|completed)$/.test(lowered);
  }

  private matchesBackVerb(lowered: string): boolean {
    return /^(back|previous|prev|undo|go back)$/.test(lowered);
  }

  private matchesSkipVerb(lowered: string): boolean {
    return /^(skip|skip this|next one|move on)$/.test(lowered);
  }

  private matchesStopVerb(lowered: string): boolean {
    return /^(stop|cancel|exit|quit|abort|end walkthrough)$/.test(lowered);
  }

  private matchesStuckVerb(lowered: string): boolean {
    return (
      /^(stuck|help|confused|i'?m stuck|i don'?t understand|what (do|does)|how (do|does))/.test(
        lowered,
      ) || lowered.endsWith("?")
    );
  }

  private formatStepResponse(view: WalkthroughStepView, action: string): string {
    const intro =
      action === "started"
        ? `Starting walkthrough: **${view.capabilityLabel}**.`
        : action === "back"
          ? "Going back."
          : action === "skipped"
            ? "Skipped."
            : "";
    const lines = [
      intro ? `${intro}\n` : "",
      `**Step ${view.step} of ${view.totalSteps} — ${view.title}**`,
      "",
      view.body,
      "",
      view.isLast
        ? "_Reply 'done' when finished, or 'back' / 'skip' / 'stop' / 'stuck' as needed._"
        : "_Reply 'next' to continue, or 'back' / 'skip' / 'stop' / 'stuck' as needed._",
    ];
    return lines.filter((l) => l !== "").join("\n");
  }

  private completionMessage(): string {
    return "Walkthrough complete. Nice work — ping me if you'd like to walk through anything else.";
  }
}
