import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AiQuotaService } from "../../ai-usage/ai-quota.service";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import type { AiQuotaScope } from "../../ai-usage/config/ai-quota.config";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { nowMillis } from "../../lib/datetime";
import { defaultVisionInputLimits, reduceVisionInput } from "../../lib/pdf/vision-input-guard";
import {
  AI_UNAVAILABLE_MESSAGE,
  aiUnavailableError,
  classifyAiError,
  userMessageForAiErrorCode,
} from "./ai-errors";
import {
  ChatMessage,
  ClaudeChatProvider,
  DocumentContent,
  ImageContent,
  StreamChunk,
} from "./claude-chat.provider";
import {
  type AiUsage,
  type ChatGenerationOptions,
  GeminiChatProvider,
} from "./gemini-chat.provider";
import { withRetry } from "./retry";

export type { AiUsage, ChatGenerationOptions };

export type AiChatProviderType = "gemini" | "auto";

// Pass this to chat()/chatWithImage() to have AiChatService record the call in
// ai_usage_logs with the real input/output token split — so no Gemini call
// routed through here can silently bypass usage tracking (issue #367 #9).
export interface AiUsageLogContext {
  app: AiApp;
  actionType: string;
  contextInfo?: Record<string, unknown>;
  companyId?: number;
  userId?: number;
  quotaScope?: AiQuotaScope;
}

interface ChatProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  streamChat(messages: ChatMessage[], systemPrompt?: string): AsyncGenerator<StreamChunk>;
  chat(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: ChatGenerationOptions,
  ): Promise<{ content: string; tokensUsed?: number; usage?: AiUsage }>;
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }
  return String(error);
}

@Injectable()
export class AiChatService implements OnModuleInit {
  private readonly logger = new Logger(AiChatService.name);
  private readonly providers: Map<string, ChatProvider> = new Map();
  private preferredProvider: AiChatProviderType;

  constructor(
    private readonly aiUsageService: AiUsageService,
    private readonly aiQuotaService: AiQuotaService,
  ) {
    this.providers.set("gemini", new GeminiChatProvider());
    // Gemini-only policy: Claude is an OPT-IN fallback, registered only when
    // AI_ALLOW_CLAUDE_FALLBACK=true. Unregistered, it can never be selected
    // (by preference, override, or fallback).
    if (process.env.AI_ALLOW_CLAUDE_FALLBACK === "true") {
      this.providers.set("claude", new ClaudeChatProvider());
    }

    const envProvider = process.env.AI_CHAT_PROVIDER?.toLowerCase();
    this.preferredProvider = envProvider === "auto" ? "auto" : "gemini";
  }

  async onModuleInit(): Promise<void> {
    await this.validateProviders();
  }

  private async validateProviders(): Promise<void> {
    const available = await this.availableProviders();

    if (available.length === 0) {
      this.logger.warn(
        "⚠️  No AI chat providers available. Set GEMINI_API_KEY or ANTHROPIC_API_KEY to enable chat.",
      );
    } else {
      this.logger.log(`✓ AI Chat providers available: ${available.join(", ")}`);
      this.logger.log(`  Preferred provider: ${this.preferredProvider}`);
    }

    if (this.preferredProvider !== "auto") {
      const preferred = this.providers.get(this.preferredProvider);
      if (preferred && !(await preferred.isAvailable())) {
        this.logger.warn(
          `⚠️  Preferred chat provider "${this.preferredProvider}" is not available (missing API key)`,
        );
      }
    }
  }

  setPreferredProvider(provider: AiChatProviderType): void {
    this.preferredProvider = provider;
    this.logger.log(`AI chat provider preference set to: ${provider}`);
  }

  preferredProviderName(): AiChatProviderType {
    return this.preferredProvider;
  }

  async availableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      if (await provider.isAvailable()) {
        available.push(name);
      }
    }
    return available;
  }

  async isAvailable(): Promise<boolean> {
    const available = await this.availableProviders();
    return available.length > 0;
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt?: string,
    providerOverride?: AiChatProviderType,
    options?: ChatGenerationOptions,
    usageLog?: AiUsageLogContext,
  ): Promise<{ content: string; providerUsed: string; tokensUsed?: number; usage?: AiUsage }> {
    await this.aiQuotaService.assertWithinQuota(
      usageLog ?? { app: AiApp.UNKNOWN, actionType: "uncontextualized" },
    );

    const providerToUse = providerOverride || this.preferredProvider;
    const { provider, usedFallback } = await this.selectProviderWithFallback(providerToUse);

    if (!provider) {
      this.logger.error(
        "No AI chat provider available — configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      );
      throw new Error(AI_UNAVAILABLE_MESSAGE);
    }

    if (usedFallback) {
      this.logger.warn(`Primary provider unavailable, using fallback: ${provider.name}`);
    }

    this.logger.log(`Using chat provider: ${provider.name}`);

    try {
      const startedAt = nowMillis();
      const result = await this.chatWithRetry(provider, messages, systemPrompt, options);
      this.recordUsage(
        provider.name,
        result.usage,
        usageLog,
        nowMillis() - startedAt,
        options?.model,
      );
      return {
        content: result.content,
        providerUsed: provider.name,
        tokensUsed: result.tokensUsed,
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error(`Chat failed with ${provider.name}: ${errorDetail(error)}`);

      const fallbackProvider = await this.fallbackProvider(provider.name);
      if (fallbackProvider) {
        this.logger.log(`Attempting fallback to: ${fallbackProvider.name}`);
        try {
          const startedAt = nowMillis();
          const result = await this.chatWithRetry(
            fallbackProvider,
            messages,
            systemPrompt,
            options,
          );
          this.recordUsage(
            fallbackProvider.name,
            result.usage,
            usageLog,
            nowMillis() - startedAt,
            options?.model,
          );
          return {
            content: result.content,
            providerUsed: fallbackProvider.name,
            tokensUsed: result.tokensUsed,
            usage: result.usage,
          };
        } catch (fallbackError) {
          this.logger.error(
            `All AI providers failed. ${provider.name}: ${errorDetail(error)}; ${fallbackProvider.name}: ${errorDetail(fallbackError)}`,
          );
          throw aiUnavailableError(error);
        }
      }

      throw aiUnavailableError(error);
    }
  }

  async chatWithImage(
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
    prompt: string,
    systemPrompt?: string,
    options?: ChatGenerationOptions,
    usageLog?: AiUsageLogContext,
  ): Promise<{ content: string; providerUsed: string; tokensUsed?: number; usage?: AiUsage }> {
    const reducedBuffer = await reduceVisionInput(
      Buffer.from(imageBase64, "base64"),
      mediaType,
      defaultVisionInputLimits(),
    );
    const reducedBase64 = reducedBuffer.toString("base64");
    const fileContent: ImageContent | DocumentContent =
      mediaType === "application/pdf"
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: reducedBase64,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: reducedBase64,
            },
          };

    const message: ChatMessage = {
      role: "user",
      content: [
        fileContent,
        {
          type: "text",
          text: prompt,
        },
      ],
    };

    return this.chat([message], systemPrompt, undefined, options, usageLog);
  }

  private recordUsage(
    providerName: string,
    usage: AiUsage | undefined,
    usageLog: AiUsageLogContext | undefined,
    processingTimeMs: number,
    modelOverride?: string,
  ): void {
    const context: AiUsageLogContext = usageLog ?? {
      app: AiApp.UNKNOWN,
      actionType: "uncontextualized",
    };
    const provider = providerName.startsWith("gemini") ? AiProvider.GEMINI : AiProvider.CLAUDE;
    const model =
      provider === AiProvider.GEMINI
        ? (modelOverride ?? process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash")
        : (process.env.ANTHROPIC_MODEL ?? null);
    this.aiUsageService.log({
      app: context.app,
      actionType: context.actionType,
      provider,
      model: model ?? undefined,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
      cachedInputTokens: usage?.cachedInputTokens,
      tokensUsed: usage?.totalTokens,
      processingTimeMs,
      contextInfo: context.contextInfo,
      companyId: context.companyId,
      userId: context.userId,
    });
    this.aiQuotaService.debit(context, usage?.totalTokens ?? 0);
  }

  private usageFromChunk(usage: { inputTokens: number; outputTokens: number }): AiUsage {
    return {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: 0,
      totalTokens: usage.inputTokens + usage.outputTokens,
    };
  }

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt?: string,
    providerOverride?: AiChatProviderType,
    usageLog?: AiUsageLogContext,
  ): AsyncGenerator<StreamChunk & { providerUsed?: string }> {
    const providerToUse = providerOverride || this.preferredProvider;
    const { provider, usedFallback } = await this.selectProviderWithFallback(providerToUse);

    if (!provider) {
      this.logger.error(
        "No AI chat provider available — configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      );
      yield { type: "error", error: AI_UNAVAILABLE_MESSAGE };
      return;
    }

    if (usedFallback) {
      this.logger.warn(`Primary provider unavailable, using fallback: ${provider.name}`);
    }

    this.logger.log(`Streaming with chat provider: ${provider.name}`);

    const startedAt = nowMillis();
    let capturedUsage: AiUsage | undefined;
    let hasError = false;
    let errorMessage = "";

    try {
      for await (const chunk of provider.streamChat(messages, systemPrompt)) {
        if (chunk.type === "error") {
          hasError = true;
          errorMessage = chunk.error || "Unknown error";
          break;
        }

        if (chunk.type === "message_stop" && chunk.metadata?.usage) {
          capturedUsage = this.usageFromChunk(chunk.metadata.usage);
        }

        if (chunk.type === "message_start") {
          yield { ...chunk, providerUsed: provider.name };
        } else {
          yield chunk;
        }
      }
    } catch (error) {
      hasError = true;
      errorMessage = error.message;
    }

    if (!hasError) {
      this.recordUsage(provider.name, capturedUsage, usageLog, nowMillis() - startedAt);
      return;
    }

    this.logger.error(`Streaming failed with ${provider.name}: ${errorMessage}`);

    const fallbackProvider = await this.fallbackProvider(provider.name);
    if (fallbackProvider) {
      this.logger.log(`Attempting streaming fallback to: ${fallbackProvider.name}`);

      try {
        let fallbackUsage: AiUsage | undefined;
        for await (const chunk of fallbackProvider.streamChat(messages, systemPrompt)) {
          if (chunk.type === "message_stop" && chunk.metadata?.usage) {
            fallbackUsage = this.usageFromChunk(chunk.metadata.usage);
          }
          if (chunk.type === "message_start") {
            yield { ...chunk, providerUsed: fallbackProvider.name };
          } else {
            yield chunk;
          }
        }
        this.recordUsage(fallbackProvider.name, fallbackUsage, usageLog, nowMillis() - startedAt);
        return;
      } catch (fallbackError) {
        this.logger.error(`Streaming fallback also failed: ${fallbackError.message}`);
        yield {
          type: "error",
          error: AI_UNAVAILABLE_MESSAGE,
        };
        return;
      }
    }

    const code = classifyAiError(new Error(errorMessage));
    yield { type: "error", error: userMessageForAiErrorCode(code) };
  }

  private async selectProviderWithFallback(
    preference: AiChatProviderType,
  ): Promise<{ provider: ChatProvider | null; usedFallback: boolean }> {
    if (preference !== "auto") {
      const provider = this.providers.get(preference);
      if (provider && (await provider.isAvailable())) {
        return { provider, usedFallback: false };
      }

      this.logger.warn(`Preferred provider ${preference} not available, falling back`);
    }

    const priorityOrder = ["gemini", "claude"];
    for (const name of priorityOrder) {
      const provider = this.providers.get(name);
      if (provider && (await provider.isAvailable())) {
        return { provider, usedFallback: preference !== "auto" && preference !== name };
      }
    }

    return { provider: null, usedFallback: false };
  }

  private async fallbackProvider(excludeName: string): Promise<ChatProvider | null> {
    for (const [name, provider] of this.providers) {
      if (name !== excludeName && (await provider.isAvailable())) {
        return provider;
      }
    }
    return null;
  }

  private async chatWithRetry(
    provider: ChatProvider,
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: ChatGenerationOptions,
  ): Promise<{ content: string; tokensUsed?: number; usage?: AiUsage }> {
    return withRetry(
      () => provider.chat(messages, systemPrompt, options),
      provider.name,
      this.logger,
    );
  }
}
