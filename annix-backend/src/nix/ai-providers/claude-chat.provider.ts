import { Injectable, Logger } from "@nestjs/common";

export interface ImageContent {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
}

export interface DocumentContent {
  type: "document";
  source: {
    type: "base64";
    media_type: "application/pdf";
    data: string;
  };
}

export interface TextContent {
  type: "text";
  text: string;
}

export type MessageContent = string | (TextContent | ImageContent | DocumentContent)[];

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
}

export interface ChatProviderConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunk {
  type: "content_delta" | "message_start" | "message_stop" | "error";
  delta?: string;
  error?: string;
  metadata?: {
    model?: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  };
}

@Injectable()
export class ClaudeChatProvider {
  readonly name = "claude-chat";
  private readonly logger = new Logger(ClaudeChatProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  // eslint-disable-next-line no-restricted-syntax -- canonical Claude fallback chat provider per CLAUDE.md AI Provider Policy
  private readonly baseUrl = "https://api.anthropic.com/v1";
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config?: ChatProviderConfig) {
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.model = config?.model || "claude-sonnet-4-6";
    this.temperature = config?.temperature ?? 0.7;
    this.maxTokens = config?.maxTokens ?? 4096;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *streamChat(messages: ChatMessage[], systemPrompt?: string): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured");
    }

    const apiMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const hasVision = messages.some(
      (m) =>
        Array.isArray(m.content) &&
        m.content.some((c) => c.type === "image" || c.type === "document"),
    );
    const hasPdf = messages.some(
      (m) => Array.isArray(m.content) && m.content.some((c) => c.type === "document"),
    );
    const model = hasVision ? "claude-sonnet-4-6" : this.model;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    };
    if (hasPdf) {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system: systemPrompt,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Claude API error: ${response.status} - ${errorText}`);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        yield {
          type: "error",
          error: "No response body",
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const inputTokens = 0;
      let outputTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              if (event.type === "message_start") {
                yield {
                  type: "message_start",
                  metadata: {
                    model: event.message?.model,
                  },
                };
              } else if (event.type === "content_block_delta") {
                if (event.delta?.type === "text_delta") {
                  yield {
                    type: "content_delta",
                    delta: event.delta.text,
                  };
                }
              } else if (event.type === "message_delta") {
                if (event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
              } else if (event.type === "message_stop") {
                yield {
                  type: "message_stop",
                  metadata: {
                    usage: {
                      inputTokens,
                      outputTokens,
                    },
                  },
                };
              }
            } catch (parseError) {
              this.logger.warn(`Failed to parse SSE event: ${parseError.message}`);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error(`Claude streaming failed: ${error.message}`);
      yield {
        type: "error",
        error: error.message,
      };
    }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): Promise<{ content: string; tokensUsed?: number }> {
    const chunks: string[] = [];
    let tokensUsed: number | undefined;

    for await (const chunk of this.streamChat(messages, systemPrompt)) {
      if (chunk.type === "content_delta" && chunk.delta) {
        chunks.push(chunk.delta);
      } else if (chunk.type === "message_stop" && chunk.metadata?.usage) {
        tokensUsed = chunk.metadata.usage.inputTokens + chunk.metadata.usage.outputTokens;
      } else if (chunk.type === "error") {
        throw new Error(chunk.error);
      }
    }

    return { content: chunks.join(""), tokensUsed };
  }

  async chatWithImage(
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
    prompt: string,
    systemPrompt?: string,
  ): Promise<{ content: string; tokensUsed?: number }> {
    const fileContent: ImageContent | DocumentContent =
      mediaType === "application/pdf"
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: imageBase64,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
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

    return this.chat([message], systemPrompt);
  }
}
