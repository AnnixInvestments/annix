import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { ChatMessage } from "../ai-providers/claude-chat.provider";
import { NixChatMessage } from "../entities/nix-chat-message.entity";
import { NixChatSession } from "../entities/nix-chat-session.entity";
import { PIPING_DOMAIN_KNOWLEDGE } from "../prompts/piping-domain.prompt";
import { NixItemParserService } from "./nix-item-parser.service";

export interface CreateSessionDto {
  userId: number;
  rfqId?: number;
}

export interface SendMessageDto {
  sessionId: number;
  message: string;
  context?: {
    currentRfqItems?: any[];
    lastValidationIssues?: any[];
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

@Injectable()
export class NixChatService {
  private readonly logger = new Logger(NixChatService.name);
  private readonly maxHistoryLength = 50;
  private readonly contextWindow = 20;

  constructor(
    @InjectRepository(NixChatSession)
    private readonly sessionRepository: Repository<NixChatSession>,
    @InjectRepository(NixChatMessage)
    private readonly messageRepository: Repository<NixChatMessage>,
    private readonly itemParserService: NixItemParserService,
    private readonly aiChatService: AiChatService,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<NixChatSession> {
    const existingActiveSession = await this.sessionRepository.findOne({
      where: {
        userId: dto.userId,
        rfqId: dto.rfqId ?? IsNull(),
        isActive: true,
      },
    });

    if (existingActiveSession) {
      return existingActiveSession;
    }

    const session = this.sessionRepository.create({
      userId: dto.userId,
      rfqId: dto.rfqId,
      isActive: true,
      conversationHistory: [],
      userPreferences: { learningEnabled: true },
      sessionContext: {},
    });

    return this.sessionRepository.save(session);
  }

  async session(sessionId: number): Promise<NixChatSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  async sendMessage(dto: SendMessageDto): Promise<ChatResponseDto> {
    if (!(await this.aiChatService.isAvailable())) {
      throw new Error(
        "No AI chat provider available. Configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      );
    }

    const session = await this.session(dto.sessionId);

    if (dto.context?.currentRfqItems) {
      session.sessionContext.currentRfqItems = dto.context.currentRfqItems;
    }
    if (dto.context?.lastValidationIssues) {
      session.sessionContext.lastValidationIssues = dto.context.lastValidationIssues;
    }

    const userMessage: ChatMessage = { role: "user", content: dto.message };
    const conversationHistory = this.buildConversationHistory(session, userMessage);
    const systemPrompt = this.buildSystemPrompt(session);

    const startTime = Date.now();

    const { content: responseContent, providerUsed } = await this.aiChatService.chat(
      conversationHistory,
      systemPrompt,
    );

    const processingTimeMs = Date.now() - startTime;

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
      yield {
        type: "error",
        error: "No AI chat provider available. Configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      };
      return;
    }

    const session = await this.session(dto.sessionId);

    if (dto.context?.currentRfqItems) {
      session.sessionContext.currentRfqItems = dto.context.currentRfqItems;
    }
    if (dto.context?.lastValidationIssues) {
      session.sessionContext.lastValidationIssues = dto.context.lastValidationIssues;
    }

    const userMessage: ChatMessage = { role: "user", content: dto.message };
    const conversationHistory = this.buildConversationHistory(session, userMessage);
    const systemPrompt = this.buildSystemPrompt(session);

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

    yield { type: "message_stop", metadata: { processingTimeMs, provider: providerUsed } };
  }

  async conversationHistory(sessionId: number, limit: number = 50): Promise<NixChatMessage[]> {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async updateUserPreferences(
    sessionId: number,
    preferences: Partial<NixChatSession["userPreferences"]>,
  ): Promise<void> {
    const session = await this.session(sessionId);
    session.userPreferences = {
      ...session.userPreferences,
      ...preferences,
    };
    await this.sessionRepository.save(session);
  }

  async recordCorrection(
    sessionId: number,
    correction: {
      extractedValue: string;
      correctedValue: string;
      fieldType: string;
    },
  ): Promise<void> {
    const session = await this.session(sessionId);

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

  async endSession(sessionId: number): Promise<void> {
    const session = await this.session(sessionId);
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

  private buildSystemPrompt(session: NixChatSession): string {
    let prompt = PIPING_DOMAIN_KNOWLEDGE;

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

    return prompt;
  }

  private async saveMessage(
    sessionId: number,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: any,
  ): Promise<NixChatMessage> {
    const message = this.messageRepository.create({
      sessionId,
      role,
      content,
      metadata,
    });

    return this.messageRepository.save(message);
  }
}
