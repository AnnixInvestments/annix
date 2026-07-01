import { isRetryableError } from "./retry";

describe("isRetryableError", () => {
  it("retries transient HTTP statuses (message-embedded)", () => {
    for (const status of [429, 500, 502, 503, 504, 529]) {
      expect(isRetryableError(new Error(`API error: ${status}`))).toBe(true);
    }
  });

  it("retries when a numeric status property is transient", () => {
    const err = Object.assign(new Error("boom"), { status: 503 });
    expect(isRetryableError(err)).toBe(true);
  });

  it("retries network error codes", () => {
    for (const code of ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]) {
      expect(isRetryableError(Object.assign(new Error("net"), { code }))).toBe(true);
      expect(isRetryableError(new Error(`request failed ${code}`))).toBe(true);
    }
  });

  it("retries overloaded / rate-limit / fetch-failed messages", () => {
    expect(isRetryableError(new Error("model overloaded"))).toBe(true);
    expect(isRetryableError(new Error("rate limit exceeded"))).toBe(true);
    expect(isRetryableError(new Error("fetch failed"))).toBe(true);
  });

  it("does NOT retry a Gemini safety block", () => {
    expect(isRetryableError(new Error("Gemini blocked the request (blockReason=SAFETY)"))).toBe(
      false,
    );
  });

  it("does NOT retry non-transient 4xx statuses", () => {
    expect(isRetryableError(new Error("API error: 400"))).toBe(false);
    expect(isRetryableError(new Error("API error: 401"))).toBe(false);
    expect(isRetryableError(new Error("API error: 403"))).toBe(false);
    expect(isRetryableError(new Error("API error: 404"))).toBe(false);
  });

  it("does NOT retry an ordinary programmer error", () => {
    expect(isRetryableError(new TypeError("x is not a function"))).toBe(false);
  });
});
