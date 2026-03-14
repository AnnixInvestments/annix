import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { nowMillis } from "../../lib/datetime";
import { Candidate } from "../entities/candidate.entity";
import { ExternalJob } from "../entities/external-job.entity";

const GEMINI_EMBEDDING_MODEL = "text-embedding-004";
const GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_DIMENSIONS = 768;

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

  candidateEmbeddingText(candidate: Candidate): string {
    const extractedParts = candidate.extractedData
      ? [
          ...(candidate.extractedData.summary ? [candidate.extractedData.summary] : []),
          ...(candidate.extractedData.skills.length > 0
            ? [`Skills: ${candidate.extractedData.skills.join(", ")}`]
            : []),
          ...(candidate.extractedData.education.length > 0
            ? [`Education: ${candidate.extractedData.education.join(", ")}`]
            : []),
          ...(candidate.extractedData.certifications.length > 0
            ? [`Certifications: ${candidate.extractedData.certifications.join(", ")}`]
            : []),
          ...(candidate.extractedData.experienceYears
            ? [`Experience: ${candidate.extractedData.experienceYears} years`]
            : []),
        ]
      : [];

    const parts =
      extractedParts.length === 0 && candidate.rawCvText
        ? [candidate.rawCvText.slice(0, 4000)]
        : extractedParts;

    return parts.join("\n");
  }

  jobEmbeddingText(job: ExternalJob): string {
    const parts = [
      job.title,
      ...(job.company ? [`Company: ${job.company}`] : []),
      ...(job.locationRaw ? [`Location: ${job.locationRaw}`] : []),
      ...(job.category ? [`Category: ${job.category}`] : []),
      ...(job.description ? [job.description.slice(0, 4000)] : []),
      ...(job.extractedSkills.length > 0 ? [`Skills: ${job.extractedSkills.join(", ")}`] : []),
    ];
    return parts.join("\n");
  }

  async embedCandidate(candidateId: number): Promise<boolean> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) {
      return false;
    }

    const text = this.candidateEmbeddingText(candidate);
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

    const text = this.jobEmbeddingText(job);
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
}
