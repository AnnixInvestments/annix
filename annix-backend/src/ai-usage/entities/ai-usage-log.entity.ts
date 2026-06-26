export enum AiApp {
  AU_RUBBER = "au-rubber",
  NIX = "nix",
  ANNIX_ORBIT = "annix-orbit",
  STOCK_CONTROL = "stock-control",
  UNKNOWN = "unknown",
}

export enum AiProvider {
  GEMINI = "gemini",
  CLAUDE = "claude",
}

export class AiUsageLog {
  id: number;

  app: AiApp;

  actionType: string;

  provider: AiProvider;

  model: string | null;

  tokensUsed: number | null;

  inputTokens: number | null;

  outputTokens: number | null;

  cachedInputTokens: number | null;

  costUsd: number | null;

  pageCount: number | null;

  processingTimeMs: number | null;

  contextInfo: Record<string, unknown> | null;

  companyId: number | null;

  userId: number | null;

  createdAt: Date;
}
