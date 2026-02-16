import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatProviderConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunk {
  type: 'content_delta' | 'message_start' | 'message_stop' | 'error';
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
  readonly name = 'claude-chat';
  private readonly logger = new Logger(ClaudeChatProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1';
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config?: ChatProviderConfig) {
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = config?.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config?.temperature ?? 0.7;
    this.maxTokens = config?.maxTokens ?? 4096;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const apiMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
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
        yield {
          type: 'error',
          error: `API error: ${response.status}`,
        };
        return;
      }

      if (!response.body) {
        yield {
          type: 'error',
          error: 'No response body',
        };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              if (event.type === 'message_start') {
                yield {
                  type: 'message_start',
                  metadata: {
                    model: event.message?.model,
                  },
                };
              } else if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta') {
                  yield {
                    type: 'content_delta',
                    delta: event.delta.text,
                  };
                }
              } else if (event.type === 'message_delta') {
                if (event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
              } else if (event.type === 'message_stop') {
                yield {
                  type: 'message_stop',
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
        type: 'error',
        error: error.message,
      };
    }
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const chunks: string[] = [];

    for await (const chunk of this.streamChat(messages, systemPrompt)) {
      if (chunk.type === 'content_delta' && chunk.delta) {
        chunks.push(chunk.delta);
      } else if (chunk.type === 'error') {
        throw new Error(chunk.error);
      }
    }

    return chunks.join('');
  }
}
