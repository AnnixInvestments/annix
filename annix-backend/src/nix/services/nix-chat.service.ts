import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { NixChatMessage } from "../entities/nix-chat-message.entity";
import { NixChatSession } from "../entities/nix-chat-session.entity";
import { PIPING_DOMAIN_KNOWLEDGE } from "../prompts/piping-domain.prompt";
import { NixItemParserService } from "./nix-item-parser.service";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

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
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private readonly maxHistoryLength = 50;
  private readonly contextWindow = 20;

  constructor(
    @InjectRepository(NixChatSession)
    private readonly sessionRepository: Repository<NixChatSession>,
    @InjectRepository(NixChatMessage)
    private readonly messageRepository: Repository<NixChatMessage>,
    private readonly itemParserService: NixItemParserService,
  ) {
    this.geminiApiKey = process.env.GEMINI_API_KEY || "";
    this.geminiModel = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";
  }

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
    if (!this.geminiApiKey) {
      throw new Error("Gemini API key not configured");
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

    const geminiContents = conversationHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `${this.geminiBaseUrl}/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini chat error: ${response.status} - ${errorText}`);
      if (response.status === 429) {
        throw new Error(
          "Nix is temporarily unavailable due to API rate limits. Please try again in a moment.",
        );
      }
      throw new Error(`AI service error (${response.status}). Please try again.`);
    }

    const data = await response.json();
    const responseContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
    const processingTimeMs = Date.now() - startTime;

    await this.saveMessage(dto.sessionId, "user", dto.message);

    const assistantMsg = await this.saveMessage(dto.sessionId, "assistant", responseContent, {
      tokensUsed,
      processingTimeMs,
      model: this.geminiModel,
    });

    session.conversationHistory = [
      ...session.conversationHistory,
      { role: "user" as const, content: dto.message, timestamp: new Date().toISOString() },
      { role: "assistant" as const, content: responseContent, timestamp: new Date().toISOString() },
    ].slice(-this.maxHistoryLength);

    session.lastInteractionAt = new Date();
    await this.sessionRepository.save(session);

    this.logger.log(
      `Chat response generated for session ${dto.sessionId} in ${processingTimeMs}ms (${tokensUsed} tokens)`,
    );

    return {
      sessionId: dto.sessionId,
      messageId: assistantMsg.id,
      content: responseContent,
      metadata: { tokensUsed, processingTimeMs },
    };
  }

  async *streamMessage(
    dto: SendMessageDto,
  ): AsyncGenerator<{ type: string; delta?: string; error?: string; metadata?: any }> {
    if (!this.geminiApiKey) {
      yield { type: "error", error: "Gemini API key not configured" };
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

    const geminiContents = conversationHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `${this.geminiBaseUrl}/models/${this.geminiModel}:streamGenerateContent?key=${this.geminiApiKey}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini stream error: ${response.status} - ${errorText}`);
      yield { type: "error", error: `AI service error (${response.status})` };
      return;
    }

    yield { type: "message_start" };

    let fullContent = "";
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr && jsonStr !== "[DONE]") {
              try {
                const data = JSON.parse(jsonStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  fullContent += text;
                  yield { type: "content_delta", delta: text };
                }
              } catch {
                /* ignored */
              }
            }
          }
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    await this.saveMessage(dto.sessionId, "user", dto.message);
    await this.saveMessage(dto.sessionId, "assistant", fullContent, {
      processingTimeMs,
      model: this.geminiModel,
      streamed: true,
    });

    session.conversationHistory = [
      ...session.conversationHistory,
      { role: "user" as const, content: dto.message, timestamp: new Date().toISOString() },
      { role: "assistant" as const, content: fullContent, timestamp: new Date().toISOString() },
    ].slice(-this.maxHistoryLength);

    session.lastInteractionAt = new Date();
    await this.sessionRepository.save(session);

    yield { type: "message_stop", metadata: { processingTimeMs, model: this.geminiModel } };
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
