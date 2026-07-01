import type { ChatMessage } from "./claude-chat.provider";
import { GeminiChatProvider } from "./gemini-chat.provider";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function okResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe("GeminiChatProvider chat() empty-candidate handling", () => {
  let provider: GeminiChatProvider;
  const messages: ChatMessage[] = [{ role: "user", content: "hi" }];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    provider = new GeminiChatProvider();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("returns text on a normal STOP response", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        candidates: [{ content: { parts: [{ text: "hello" }] }, finishReason: "STOP" }],
        usageMetadata: { totalTokenCount: 5 },
      }),
    );

    const result = await provider.chat(messages);

    expect(result.content).toBe("hello");
  });

  it("returns an empty string on a legitimate empty STOP completion", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ candidates: [{ content: { parts: [] }, finishReason: "STOP" }] }),
    );

    const result = await provider.chat(messages);

    expect(result.content).toBe("");
  });

  it("returns an empty string (does not throw) when truncated with no text", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }] }),
    );

    const result = await provider.chat(messages);

    expect(result.content).toBe("");
  });

  it("throws only when the prompt is explicitly blocked", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ candidates: [], promptFeedback: { blockReason: "SAFETY" } }),
    );

    await expect(provider.chat(messages)).rejects.toThrow(/blocked/i);
  });
});
