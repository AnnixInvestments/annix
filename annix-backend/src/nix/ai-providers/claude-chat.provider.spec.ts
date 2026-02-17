import { ChatMessage, ClaudeChatProvider } from "./claude-chat.provider";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ClaudeChatProvider", () => {
  let provider: ClaudeChatProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    provider = new ClaudeChatProvider();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("constructor", () => {
    it("should use env API key by default", () => {
      expect(provider.name).toBe("claude-chat");
    });

    it("should use provided config values", () => {
      const customProvider = new ClaudeChatProvider({
        apiKey: "custom-key",
        model: "claude-3-opus",
        temperature: 0.5,
        maxTokens: 2048,
      });
      expect(customProvider.name).toBe("claude-chat");
    });

    it("should use default values when not provided", () => {
      const defaultProvider = new ClaudeChatProvider({ apiKey: "key" });
      expect(defaultProvider.name).toBe("claude-chat");
    });
  });

  describe("isAvailable", () => {
    it("should return true when API key is configured", async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("should return false when API key is not configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const providerWithoutKey = new ClaudeChatProvider();

      const result = await providerWithoutKey.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe("streamChat", () => {
    const mockMessages: ChatMessage[] = [{ role: "user", content: "What is a pipe schedule?" }];

    it("should throw error when API key not configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const providerWithoutKey = new ClaudeChatProvider();

      await expect(async () => {
        for await (const _ of providerWithoutKey.streamChat(mockMessages)) {
          /* consume generator */
        }
      }).rejects.toThrow("Anthropic API key not configured");
    });

    it("should yield error when API returns error status", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue("Rate limited"),
      });

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results).toContainEqual({
        type: "error",
        error: "API error: 429",
      });
    });

    it("should yield error when no response body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: null,
      });

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results).toContainEqual({
        type: "error",
        error: "No response body",
      });
    });

    it("should stream message_start, content deltas, and message_stop", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"message_start","message":{"model":"claude-3-5-sonnet-20241022"}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there!"}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"message_delta","usage":{"output_tokens":15}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"message_stop"}\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results[0]).toEqual({
        type: "message_start",
        metadata: { model: "claude-3-5-sonnet-20241022" },
      });

      expect(results).toContainEqual({ type: "content_delta", delta: "Hello" });
      expect(results).toContainEqual({ type: "content_delta", delta: " there!" });

      const stopEvent = results.find((r) => r.type === "message_stop");
      expect(stopEvent).toMatchObject({
        type: "message_stop",
        metadata: {
          usage: { inputTokens: 0, outputTokens: 15 },
        },
      });

      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it("should call Claude API with correct parameters", async () => {
      const mockReader = {
        read: jest.fn().mockResolvedValue({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const messages: ChatMessage[] = [
        { role: "system", content: "You are a helpful assistant" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      for await (const _ of provider.streamChat(messages, "Custom system prompt")) {
        /* consume */
      }

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "test-api-key",
            "anthropic-version": "2023-06-01",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe("claude-3-5-sonnet-20241022");
      expect(body.max_tokens).toBe(4096);
      expect(body.temperature).toBe(0.7);
      expect(body.stream).toBe(true);
      expect(body.system).toBe("Custom system prompt");
      expect(body.messages).toHaveLength(3);
      expect(body.messages[0]).toEqual({ role: "user", content: "Hello" });
    });

    it("should handle [DONE] marker in stream", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode("data: [DONE]\n"),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results).toContainEqual({ type: "content_delta", delta: "Hello" });
      expect(results.filter((r) => r.type === "error")).toHaveLength(0);
    });

    it("should handle malformed JSON in stream gracefully", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode("data: {invalid json}\n"),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Valid"}}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results).toContainEqual({ type: "content_delta", delta: "Valid" });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"));

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results).toContainEqual({
        type: "error",
        error: "Network failure",
      });
    });

    it("should ignore empty lines and non-data lines", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode("\n\nevent: ping\n"),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Content"}}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const results: any[] = [];
      for await (const chunk of provider.streamChat(mockMessages)) {
        results.push(chunk);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ type: "content_delta", delta: "Content" });
    });
  });

  describe("chat", () => {
    const mockMessages: ChatMessage[] = [{ role: "user", content: "Hello" }];

    it("should return concatenated response from stream", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n',
            ),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world!"}}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const result = await provider.chat(mockMessages);

      expect(result).toBe("Hello world!");
    });

    it("should throw error when stream contains error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Server error"),
      });

      await expect(provider.chat(mockMessages)).rejects.toThrow("API error: 500");
    });

    it("should pass system prompt to streamChat", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Response"}}\n',
            ),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      await provider.chat(mockMessages, "Be concise");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.system).toBe("Be concise");
    });

    it("should return empty string when no content deltas", async () => {
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"message_start"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"message_stop"}\n'),
          })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const result = await provider.chat(mockMessages);

      expect(result).toBe("");
    });
  });
});
