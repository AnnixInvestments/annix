import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NixChatSession } from '../entities/nix-chat-session.entity';
import { NixChatMessage } from '../entities/nix-chat-message.entity';
import { ClaudeChatProvider, ChatMessage, StreamChunk } from '../ai-providers/claude-chat.provider';
import { PIPING_DOMAIN_KNOWLEDGE } from '../prompts/piping-domain.prompt';
import { NixItemParserService } from './nix-item-parser.service';

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
  private readonly chatProvider: ClaudeChatProvider;
  private readonly maxHistoryLength = 50;
  private readonly contextWindow = 20;

  constructor(
    @InjectRepository(NixChatSession)
    private readonly sessionRepository: Repository<NixChatSession>,
    @InjectRepository(NixChatMessage)
    private readonly messageRepository: Repository<NixChatMessage>,
    private readonly itemParserService: NixItemParserService,
  ) {
    this.chatProvider = new ClaudeChatProvider();
  }

  async createSession(dto: CreateSessionDto): Promise<NixChatSession> {
    const existingActiveSession = await this.sessionRepository.findOne({
      where: {
        userId: dto.userId,
        rfqId: dto.rfqId || null,
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

  async *streamMessage(dto: SendMessageDto): AsyncGenerator<StreamChunk> {
    const session = await this.session(dto.sessionId);

    if (dto.context?.currentRfqItems) {
      session.sessionContext.currentRfqItems = dto.context.currentRfqItems;
    }
    if (dto.context?.lastValidationIssues) {
      session.sessionContext.lastValidationIssues = dto.context.lastValidationIssues;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: dto.message,
    };

    const conversationHistory = this.buildConversationHistory(session, userMessage);

    const systemPrompt = this.buildSystemPrompt(session);

    const startTime = Date.now();
    const responseChunks: string[] = [];
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      for await (const chunk of this.chatProvider.streamChat(conversationHistory, systemPrompt)) {
        if (chunk.type === 'content_delta' && chunk.delta) {
          responseChunks.push(chunk.delta);
        } else if (chunk.type === 'message_stop' && chunk.metadata?.usage) {
          inputTokens = chunk.metadata.usage.inputTokens;
          outputTokens = chunk.metadata.usage.outputTokens;
        }

        yield chunk;
      }

      const responseContent = responseChunks.join('');
      const processingTimeMs = Date.now() - startTime;

      await this.saveMessage(dto.sessionId, 'user', dto.message);

      const assistantMessage = await this.saveMessage(
        dto.sessionId,
        'assistant',
        responseContent,
        {
          tokensUsed: inputTokens + outputTokens,
          processingTimeMs,
          model: 'claude-3-5-sonnet-20241022',
        },
      );

      session.conversationHistory.push({
        role: 'user',
        content: dto.message,
        timestamp: new Date().toISOString(),
      });

      session.conversationHistory.push({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
      });

      if (session.conversationHistory.length > this.maxHistoryLength) {
        session.conversationHistory = session.conversationHistory.slice(-this.maxHistoryLength);
      }

      session.lastInteractionAt = new Date();

      await this.sessionRepository.save(session);

      this.logger.log(
        `Chat response generated for session ${dto.sessionId} in ${processingTimeMs}ms (${inputTokens + outputTokens} tokens)`,
      );
    } catch (error) {
      this.logger.error(`Chat streaming failed: ${error.message}`);
      yield {
        type: 'error',
        error: error.message,
      };
    }
  }

  async sendMessage(dto: SendMessageDto): Promise<ChatResponseDto> {
    const chunks: string[] = [];
    let metadata = {};

    for await (const chunk of this.streamMessage(dto)) {
      if (chunk.type === 'content_delta' && chunk.delta) {
        chunks.push(chunk.delta);
      } else if (chunk.type === 'message_stop' && chunk.metadata) {
        metadata = chunk.metadata;
      } else if (chunk.type === 'error') {
        throw new Error(chunk.error);
      }
    }

    const lastMessage = await this.messageRepository.findOne({
      where: { sessionId: dto.sessionId, role: 'assistant' },
      order: { createdAt: 'DESC' },
    });

    return {
      sessionId: dto.sessionId,
      messageId: lastMessage?.id || 0,
      content: chunks.join(''),
      metadata,
    };
  }

  async conversationHistory(sessionId: number, limit: number = 50): Promise<NixChatMessage[]> {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async updateUserPreferences(
    sessionId: number,
    preferences: Partial<NixChatSession['userPreferences']>,
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
      session.sessionContext.recentCorrections = session.sessionContext.recentCorrections.slice(-20);
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
    const recentHistory = session.conversationHistory
      .slice(-this.contextWindow)
      .map(h => ({
        role: h.role as 'user' | 'assistant' | 'system',
        content: h.content,
      }));

    return [...recentHistory, newMessage];
  }

  private buildSystemPrompt(session: NixChatSession): string {
    let prompt = PIPING_DOMAIN_KNOWLEDGE;

    if (session.userPreferences.preferredMaterials?.length) {
      prompt += `\n\n## User Preferences\n\nPreferred materials: ${session.userPreferences.preferredMaterials.join(', ')}`;
    }

    if (session.userPreferences.preferredSchedules?.length) {
      prompt += `\nPreferred schedules: ${session.userPreferences.preferredSchedules.join(', ')}`;
    }

    if (session.userPreferences.preferredStandards?.length) {
      prompt += `\nPreferred standards: ${session.userPreferences.preferredStandards.join(', ')}`;
    }

    if (session.sessionContext.recentCorrections?.length) {
      prompt += `\n\n## Recent Learning\n\nThe user has made these corrections recently:`;
      session.sessionContext.recentCorrections.forEach(correction => {
        prompt += `\n- ${correction.fieldType}: "${correction.extractedValue}" → "${correction.correctedValue}"`;
      });
      prompt += '\n\nApply these patterns to future suggestions.';
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
      prompt += `\n\n## Recent Validation Issues\n\n`;
      session.sessionContext.lastValidationIssues.forEach(issue => {
        prompt += `- ${issue.message}\n`;
      });
    }

    return prompt;
  }

  private async saveMessage(
    sessionId: number,
    role: 'user' | 'assistant' | 'system',
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
