import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { EmailService } from "../../email/email.service";
import { DateTime, nowMillis } from "../../lib/datetime";
import { isAnnixOrbitCronEnabled } from "../cv-assistant-cron.config";
import { Candidate } from "../entities/candidate.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { EscoNormalisationService } from "./esco-normalisation.service";

const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
const GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_DIMENSIONS = 768;

const DEFAULT_EMBEDDING_DAILY_CALLS_THRESHOLD = 5_000;
const DEFAULT_EMBEDDING_DAILY_COST_USD_THRESHOLD = 5;
const GEMINI_EMBEDDING_USD_PER_1K_TOKENS = 0.000025;

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    private readonly aiUsageService: AiUsageService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly escoService: EscoNormalisationService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.apiKey) {
      this.logger.warn("GEMINI_API_KEY not set, skipping embedding generation");
      return null;
    }

    const truncatedText = text.slice(0, 8000);

    const url = `${GEMINI_EMBEDDING_URL}/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`;

    const startTime = nowMillis();

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: truncatedText }],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini embedding API error ${response.status}: ${errorText}`);
      return null;
    }

    const data: GeminiEmbeddingResponse = await response.json();
    const processingTimeMs = nowMillis() - startTime;

    this.aiUsageService.log({
      app: AiApp.CV_ASSISTANT,
      actionType: "embedding-generation",
      provider: AiProvider.GEMINI,
      model: GEMINI_EMBEDDING_MODEL,
      tokensUsed: Math.ceil(truncatedText.length / 4),
      processingTimeMs,
    });

    return data.embedding.values;
  }

  async candidateEmbeddingText(candidate: Candidate): Promise<string> {
    if (!candidate.extractedData) {
      return candidate.rawCvText ? candidate.rawCvText.slice(0, 4000) : "";
    }
    const data = candidate.extractedData;
    const expandedSkills = await this.expandSkillList(data.skills);
    const extractedParts = [
      ...(data.summary ? [data.summary] : []),
      ...(expandedSkills.length > 0 ? [`Skills: ${expandedSkills.join(", ")}`] : []),
      ...(data.education.length > 0 ? [`Education: ${data.education.join(", ")}`] : []),
      ...(data.certifications.length > 0
        ? [`Certifications: ${data.certifications.join(", ")}`]
        : []),
      ...(data.experienceYears ? [`Experience: ${data.experienceYears} years`] : []),
    ];
    const parts =
      extractedParts.length === 0 && candidate.rawCvText
        ? [candidate.rawCvText.slice(0, 4000)]
        : extractedParts;
    return parts.join("\n");
  }

  async jobEmbeddingText(job: ExternalJob): Promise<string> {
    const expandedSkills = await this.expandSkillList(job.extractedSkills ?? []);
    const parts = [
      job.title,
      ...(job.company ? [`Company: ${job.company}`] : []),
      ...(job.locationRaw ? [`Location: ${job.locationRaw}`] : []),
      ...(job.category ? [`Category: ${job.category}`] : []),
      ...(job.description ? [job.description.slice(0, 4000)] : []),
      ...(expandedSkills.length > 0 ? [`Skills: ${expandedSkills.join(", ")}`] : []),
    ];
    return parts.join("\n");
  }

  private async expandSkillList(rawSkills: string[]): Promise<string[]> {
    if (rawSkills.length === 0) return [];
    try {
      const normalised = await this.escoService.canonicaliseAll(rawSkills);
      return this.escoService.expandedSkillTokens(rawSkills, normalised);
    } catch (err) {
      this.logger.warn(
        `ESCO expansion failed, falling back to raw skills: ${err instanceof Error ? err.message : String(err)}`,
      );
      return rawSkills;
    }
  }

  async embedCandidate(candidateId: number): Promise<boolean> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) {
      return false;
    }

    const text = await this.candidateEmbeddingText(candidate);
    if (!text) {
      this.logger.warn(`No text to embed for candidate ${candidateId}`);
      return false;
    }

    const embedding = await this.generateEmbedding(text);
    if (!embedding) {
      return false;
    }

    await this.candidateRepo
      .createQueryBuilder()
      .update(Candidate)
      .set({ embedding: () => `'[${embedding.join(",")}]'::vector` } as any)
      .where("id = :id", { id: candidateId })
      .execute();

    return true;
  }

  async embedExternalJob(jobId: number): Promise<boolean> {
    const job = await this.externalJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      return false;
    }

    const text = await this.jobEmbeddingText(job);
    if (!text) {
      return false;
    }

    const embedding = await this.generateEmbedding(text);
    if (!embedding) {
      return false;
    }

    await this.externalJobRepo
      .createQueryBuilder()
      .update(ExternalJob)
      .set({ embedding: () => `'[${embedding.join(",")}]'::vector` } as any)
      .where("id = :id", { id: jobId })
      .execute();

    return true;
  }

  async backfillCandidateEmbeddings(): Promise<{ processed: number; failed: number }> {
    const candidates = await this.candidateRepo
      .createQueryBuilder("c")
      .where("c.embedding IS NULL")
      .andWhere("(c.raw_cv_text IS NOT NULL OR c.extracted_data IS NOT NULL)")
      .getMany();

    const result = await candidates.reduce(
      async (accPromise, candidate) => {
        const acc = await accPromise;
        const success = await this.embedCandidate(candidate.id);
        return success
          ? { processed: acc.processed + 1, failed: acc.failed }
          : { processed: acc.processed, failed: acc.failed + 1 };
      },
      Promise.resolve({ processed: 0, failed: 0 }),
    );

    this.logger.log(
      `Backfilled embeddings: ${result.processed} processed, ${result.failed} failed`,
    );
    return result;
  }

  async backfillExternalJobEmbeddings(): Promise<{ processed: number; failed: number }> {
    const jobs = await this.externalJobRepo
      .createQueryBuilder("j")
      .where("j.embedding IS NULL")
      .getMany();

    const result = await jobs.reduce(
      async (accPromise, job) => {
        const acc = await accPromise;
        const success = await this.embedExternalJob(job.id);
        return success
          ? { processed: acc.processed + 1, failed: acc.failed }
          : { processed: acc.processed, failed: acc.failed + 1 };
      },
      Promise.resolve({ processed: 0, failed: 0 }),
    );

    this.logger.log(
      `Backfilled job embeddings: ${result.processed} processed, ${result.failed} failed`,
    );
    return result;
  }

  dimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }

  @Cron("0 6 * * *", { name: "cv-assistant:embedding-cost-guard" })
  async embeddingCostGuard(): Promise<{
    calls: number;
    tokens: number;
    estimatedUsd: number;
    alerted: boolean;
  }> {
    if (!isAnnixOrbitCronEnabled()) {
      return { calls: 0, tokens: 0, estimatedUsd: 0, alerted: false };
    }
    return this.runEmbeddingCostGuard();
  }

  async runEmbeddingCostGuard(): Promise<{
    calls: number;
    tokens: number;
    estimatedUsd: number;
    alerted: boolean;
  }> {
    const since = DateTime.now().minus({ hours: 24 }).toJSDate();
    const { calls, tokens } = await this.aiUsageService.aggregateDailyUsageByModel(
      GEMINI_EMBEDDING_MODEL,
      since,
    );
    const estimatedUsd = (tokens / 1000) * GEMINI_EMBEDDING_USD_PER_1K_TOKENS;

    const callsThreshold = Number(
      this.configService.get<string>("CV_EMBEDDING_DAILY_CALLS_THRESHOLD") ??
        DEFAULT_EMBEDDING_DAILY_CALLS_THRESHOLD,
    );
    const costThreshold = Number(
      this.configService.get<string>("CV_EMBEDDING_DAILY_COST_USD_THRESHOLD") ??
        DEFAULT_EMBEDDING_DAILY_COST_USD_THRESHOLD,
    );

    if (calls < callsThreshold && estimatedUsd < costThreshold) {
      return { calls, tokens, estimatedUsd, alerted: false };
    }

    const recipient =
      this.configService.get<string>("SUPPORT_EMAIL") ||
      this.configService.get<string>("EMAIL_FROM") ||
      "info@annix.co.za";

    const breaches: string[] = [];
    if (calls >= callsThreshold) {
      breaches.push(`Calls in 24h: ${calls} (threshold ${callsThreshold})`);
    }
    if (estimatedUsd >= costThreshold) {
      breaches.push(
        `Estimated cost in 24h: $${estimatedUsd.toFixed(4)} (threshold $${costThreshold})`,
      );
    }
    const lines = [
      "Embedding usage exceeded the configured guardrails.",
      `Model: ${GEMINI_EMBEDDING_MODEL}`,
      `Calls: ${calls}`,
      `Tokens: ${tokens}`,
      `Estimated USD: $${estimatedUsd.toFixed(4)}`,
      ...breaches.map((line) => `→ ${line}`),
      "Inspect ai_usage_logs for the runaway adapter and consider pausing the source.",
    ];
    const text = lines.join("\n");
    const html = `<p>${lines.map((l) => escapeHtmlForEmail(l)).join("</p><p>")}</p>`;

    try {
      await this.emailService.sendEmail({
        to: recipient,
        subject: `[Annix Orbit] Embedding cost guard tripped (${calls} calls / $${estimatedUsd.toFixed(2)} in 24h)`,
        text,
        html,
      });
      this.logger.warn(
        `Embedding cost guard tripped: calls=${calls} tokens=${tokens} estUsd=${estimatedUsd.toFixed(4)}`,
      );
      return { calls, tokens, estimatedUsd, alerted: true };
    } catch (err) {
      this.logger.error(
        `Failed to send embedding cost guard alert: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { calls, tokens, estimatedUsd, alerted: false };
    }
  }
}

function escapeHtmlForEmail(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
