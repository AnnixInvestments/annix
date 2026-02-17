import { Injectable, Logger } from "@nestjs/common";
import { ChatMessage, ChatProviderConfig, StreamChunk } from "./claude-chat.provider";

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
    this.model = config?.model || process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";
    this.temperature = config?.temperature ?? 0.7;
    this.maxTokens = config?.maxTokens ?? 4096;
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
        parts: [{ text: msg.content }],
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
      let totalTokens = 0;

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

              if (text) {
                yield {
                  type: "content_delta",
                  delta: text,
                };
              }

              if (data.usageMetadata?.totalTokenCount) {
                totalTokens = data.usageMetadata.totalTokenCount;
              }
            } catch (parseError) {
              this.logger.warn(`Failed to parse SSE event: ${parseError.message}`);
            }
          }
        }

        yield {
          type: "message_stop",
          metadata: {
            model: this.model,
            usage: {
              inputTokens: 0,
              outputTokens: totalTokens,
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

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured");
    }

    const geminiContents = messages
      .filter((m) => m.role !== "system")
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}
