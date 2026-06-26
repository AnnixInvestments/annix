import { HttpException, HttpStatus } from "@nestjs/common";

export type AiQuotaExceededReason = "daily-token-budget" | "per-minute-rate";

const FRIENDLY_MESSAGE: Record<AiQuotaExceededReason, string> = {
  "daily-token-budget":
    "You've reached today's AI usage limit for your account. Please try again tomorrow.",
  "per-minute-rate": "Too many AI requests right now — please wait a moment and try again.",
};

export class AiQuotaExceededError extends HttpException {
  readonly reason: AiQuotaExceededReason;
  readonly quotaKey: string;
  readonly retryAfterSeconds: number;

  constructor(reason: AiQuotaExceededReason, quotaKey: string, retryAfterSeconds: number) {
    super(
      { error: FRIENDLY_MESSAGE[reason], reason, retryAfterSeconds },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    this.name = "AiQuotaExceededError";
    this.reason = reason;
    this.quotaKey = quotaKey;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
