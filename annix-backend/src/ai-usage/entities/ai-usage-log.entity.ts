import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum AiApp {
  AU_RUBBER = "au-rubber",
  NIX = "nix",
  ANNIX_ORBIT = "annix-orbit",
  STOCK_CONTROL = "stock-control",
}

export enum AiProvider {
  GEMINI = "gemini",
  CLAUDE = "claude",
}

@Entity("ai_usage_logs")
@Index(["app"])
@Index(["createdAt"])
@Index(["provider"])
export class AiUsageLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  app: AiApp;

  @Column({ name: "action_type", type: "varchar", length: 100 })
  actionType: string;

  @Column({ type: "varchar", length: 20 })
  provider: AiProvider;

  @Column({ type: "varchar", length: 100, nullable: true })
  model: string | null;

  @Column({ name: "tokens_used", type: "int", nullable: true })
  tokensUsed: number | null;

  @Column({ name: "input_tokens", type: "int", nullable: true })
  inputTokens: number | null;

  @Column({ name: "output_tokens", type: "int", nullable: true })
  outputTokens: number | null;

  @Column({ name: "cached_input_tokens", type: "int", nullable: true })
  cachedInputTokens: number | null;

  @Column({ name: "cost_usd", type: "double precision", nullable: true })
  costUsd: number | null;

  @Column({ name: "page_count", type: "int", nullable: true })
  pageCount: number | null;

  @Column({ name: "processing_time_ms", type: "int", nullable: true })
  processingTimeMs: number | null;

  @Column({ name: "context_info", type: "jsonb", nullable: true })
  contextInfo: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
