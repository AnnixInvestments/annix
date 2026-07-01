import { Injectable, Logger } from "@nestjs/common";
import {
  ChatMessage,
  ChatProviderConfig,
  DocumentContent,
  ImageContent,
  StreamChunk,
  TextContent,
} from "./claude-chat.provider";

export interface ChatGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: "json" | "text";
  // Per-call model override (e.g. "gemini-2.5-flash-lite" for cheap, simple
  // classification). Falls back to the provider's configured model when unset.
  model?: string;
  // Gemini 2.5 thinking budget. Set to 0 to disable reasoning entirely so the
  // full output budget goes to the answer — required for large structured-JSON
  // extractions where thinking tokens would otherwise truncate the reply.
  // Opt-in only (some accounts reject the field), so default behaviour is
  // unchanged for callers that don't set it.
  thinkingBudget?: number;
  // Gemini responseSchema (OpenAPI-subset) threaded into generationConfig so the
  // model is constrained to a shape/enum rather than free-text-then-parse. Implies
  // JSON output. Used for fixed-enum classifiers where flash-lite is weak at raw
  // JSON (the recurring "did not yield a JSON object" failure).
  responseSchema?: Record<string, unknown>;
}

// Real per-call token breakdown from Gemini's usageMetadata, so ai_usage_logs
// can record input vs output (output is the cost driver). thinkingBudget output
// counts as output tokens.
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
}

export function geminiUsage(usageMetadata: Record<string, number> | undefined): AiUsage {
  const input = usageMetadata?.promptTokenCount ?? 0;
  const output =
    (usageMetadata?.candidatesTokenCount ?? 0) + (usageMetadata?.thoughtsTokenCount ?? 0);
  const total = usageMetadata?.totalTokenCount ?? input + output;
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: total,
    cachedInputTokens: usageMetadata?.cachedContentTokenCount ?? 0,
  };
}

@Injectable()
export class GeminiChatProvider {
  readonly name = "gemini-chat";
  private readonly logger = new Logger(GeminiChatProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config?: ChatProviderConfig) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || "";
    this.model = config?.model || process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash";
    this.temperature = config?.temperature ?? 0.7;
    const envMaxTokens = process.env.GEMINI_CHAT_MAX_TOKENS
      ? Number.parseInt(process.env.GEMINI_CHAT_MAX_TOKENS, 10)
      : null;
    const defaultMaxTokens =
      envMaxTokens && Number.isFinite(envMaxTokens) && envMaxTokens > 0 ? envMaxTokens : 16_384;
    this.maxTokens = config?.maxTokens ?? defaultMaxTokens;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *streamChat(messages: ChatMessage[], systemPrompt?: string): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const geminiContents = messages
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: this.toGeminiParts(msg.content),
      }));

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
            contents: geminiContents,
            generationConfig: {
              temperature: this.temperature,
              maxOutputTokens: this.maxTokens,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error: ${response.status} - ${errorText}`);
        yield {
          type: "error",
          error: `API error: ${response.status}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          type: "error",
          error: "No response body",
        };
        return;
      }

      yield { type: "message_start", metadata: { model: this.model } };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let usage: AiUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      };
      let yieldedText = false;
      let finishReason: string | undefined;
      let blockReason: string | undefined;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              finishReason = data.candidates?.[0]?.finishReason ?? finishReason;
              blockReason = data.promptFeedback?.blockReason ?? blockReason;

              if (text) {
                yieldedText = true;
                yield {
                  type: "content_delta",
                  delta: text,
                };
              }

              if (data.usageMetadata) {
                usage = geminiUsage(data.usageMetadata);
              }
            } catch (parseError) {
              this.logger.warn(`Failed to parse SSE event: ${parseError.message}`);
            }
          }
        }

        if (blockReason) {
          this.logger.warn(
            `Gemini stream blocked (blockReason=${blockReason}, finishReason=${finishReason ?? "none"})`,
          );
          yield {
            type: "error",
            error: `Gemini blocked the request (blockReason=${blockReason})`,
          };
          return;
        }
        if (!yieldedText) {
          this.logger.warn(
            `Gemini stream produced no content (finishReason=${finishReason ?? "none"})`,
          );
        }

        yield {
          type: "message_stop",
          metadata: {
            model: this.model,
            usage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
            },
          },
        };
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logger.error(`Gemini streaming failed: ${error.message}`);
      yield {
        type: "error",
        error: error.message,
      };
    }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: ChatGenerationOptions,
  ): Promise<{ content: string; tokensUsed?: number; usage?: AiUsage }> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const geminiContents = messages
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: this.toGeminiParts(msg.content),
      }));

    // Gemini 2.5 Flash counts thinking tokens against maxOutputTokens.
    // The product-data-sheet extraction hit this on a 92-char partial
    // because reasoning ate the whole 1024 budget. Floor structured-
    // JSON callers at 4096 so the reply has room even when thinking is
    // verbose. (Sending thinkingConfig.thinkingBudget=0 would be more
    // surgical but the field is rejected by v1beta on some accounts.)
    const requestedMax = options?.maxOutputTokens ?? this.maxTokens;
    const wantsJson = options?.responseFormat === "json" || !!options?.responseSchema;
    const generationConfig: Record<string, unknown> = {
      temperature: options?.temperature ?? this.temperature,
      maxOutputTokens: wantsJson ? Math.max(requestedMax, 4096) : requestedMax,
    };
    if (wantsJson) {
      generationConfig.responseMimeType = "application/json";
    }
    if (options?.responseSchema) {
      generationConfig.responseSchema = options.responseSchema;
    }
    if (options?.thinkingBudget !== undefined) {
      generationConfig.thinkingConfig = { thinkingBudget: options.thinkingBudget };
    }

    const model = options?.model ?? this.model;
    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: geminiContents,
          generationConfig,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini API error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const usage = geminiUsage(data.usageMetadata);
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? "";
    const finishReason = candidate?.finishReason;
    const blockReason = data.promptFeedback?.blockReason;

    if (blockReason) {
      this.logger.warn(
        `Gemini blocked the request (blockReason=${blockReason}, finishReason=${finishReason ?? "none"})`,
      );
      throw new Error(`Gemini blocked the request (blockReason=${blockReason})`);
    }
    if (!text) {
      this.logger.warn(`Gemini returned empty text (finishReason=${finishReason ?? "none"})`);
    }

    return {
      content: text,
      tokensUsed: data.usageMetadata?.totalTokenCount ?? undefined,
      usage,
    };
  }

  async chatWithImage(
    imageBase64: string,
    mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf",
    prompt: string,
    systemPrompt?: string,
    options?: ChatGenerationOptions,
  ): Promise<{ content: string; tokensUsed?: number; usage?: AiUsage }> {
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

    return this.chat([message], systemPrompt, options);
  }

  private toGeminiParts(
    content: string | (TextContent | ImageContent | DocumentContent)[],
  ): Record<string, any>[] {
    if (typeof content === "string") {
      return [{ text: content }];
    }

    return content.map((part) => {
      if (part.type === "text") {
        return { text: part.text };
      }

      return {
        inlineData: {
          mimeType: part.source.media_type,
          data: part.source.data,
        },
      };
    });
  }
}
