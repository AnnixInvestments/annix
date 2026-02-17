import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ChatMessage, ClaudeChatProvider, StreamChunk } from "./claude-chat.provider";
import { GeminiChatProvider } from "./gemini-chat.provider";

export type AiChatProviderType = "gemini" | "claude" | "auto";

interface ChatProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  streamChat(messages: ChatMessage[], systemPrompt?: string): AsyncGenerator<StreamChunk>;
  chat(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
}

@Injectable()
export class AiChatService implements OnModuleInit {
  private readonly logger = new Logger(AiChatService.name);
  private readonly providers: Map<string, ChatProvider> = new Map();
  private preferredProvider: AiChatProviderType;

  constructor() {
    this.providers.set("gemini", new GeminiChatProvider());
    this.providers.set("claude", new ClaudeChatProvider());

    const envProvider = process.env.AI_CHAT_PROVIDER?.toLowerCase();
    if (envProvider === "claude" || envProvider === "gemini" || envProvider === "auto") {
      this.preferredProvider = envProvider;
    } else {
      this.preferredProvider = "auto";
    }
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
  ): Promise<{ content: string; providerUsed: string }> {
    const providerToUse = providerOverride || this.preferredProvider;
    const { provider, usedFallback } = await this.selectProviderWithFallback(providerToUse);

    if (!provider) {
      throw new Error("No AI chat provider available. Configure GEMINI_API_KEY or ANTHROPIC_API_KEY.");
    }

    if (usedFallback) {
      this.logger.warn(`Primary provider unavailable, using fallback: ${provider.name}`);
    }

    this.logger.log(`Using chat provider: ${provider.name}`);

    try {
      const content = await provider.chat(messages, systemPrompt);
      return { content, providerUsed: provider.name };
    } catch (error) {
      this.logger.error(`Chat failed with ${provider.name}: ${error.message}`);

      const fallbackProvider = await this.fallbackProvider(provider.name);
      if (fallbackProvider) {
        this.logger.log(`Attempting fallback to: ${fallbackProvider.name}`);
        try {
          const content = await fallbackProvider.chat(messages, systemPrompt);
          return { content, providerUsed: fallbackProvider.name };
        } catch (fallbackError) {
          this.logger.error(`Fallback also failed: ${fallbackError.message}`);
          throw new Error(`All AI providers failed. Last error: ${fallbackError.message}`);
        }
      }

      throw error;
    }
  }

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt?: string,
    providerOverride?: AiChatProviderType,
  ): AsyncGenerator<StreamChunk & { providerUsed?: string }> {
    const providerToUse = providerOverride || this.preferredProvider;
    const { provider, usedFallback } = await this.selectProviderWithFallback(providerToUse);

    if (!provider) {
      yield {
        type: "error",
        error: "No AI chat provider available. Configure GEMINI_API_KEY or ANTHROPIC_API_KEY.",
      };
      return;
    }

    if (usedFallback) {
      this.logger.warn(`Primary provider unavailable, using fallback: ${provider.name}`);
    }

    this.logger.log(`Streaming with chat provider: ${provider.name}`);

    let hasError = false;
    let errorMessage = "";

    try {
      for await (const chunk of provider.streamChat(messages, systemPrompt)) {
        if (chunk.type === "error") {
          hasError = true;
          errorMessage = chunk.error || "Unknown error";
          break;
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

    if (hasError) {
      this.logger.error(`Streaming failed with ${provider.name}: ${errorMessage}`);

      const fallbackProvider = await this.fallbackProvider(provider.name);
      if (fallbackProvider) {
        this.logger.log(`Attempting streaming fallback to: ${fallbackProvider.name}`);

        try {
          for await (const chunk of fallbackProvider.streamChat(messages, systemPrompt)) {
            if (chunk.type === "message_start") {
              yield { ...chunk, providerUsed: fallbackProvider.name };
            } else {
              yield chunk;
            }
          }
          return;
        } catch (fallbackError) {
          this.logger.error(`Streaming fallback also failed: ${fallbackError.message}`);
          yield {
            type: "error",
            error: `All AI providers failed. Last error: ${fallbackError.message}`,
          };
          return;
        }
      }

      yield { type: "error", error: errorMessage };
    }
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
}
