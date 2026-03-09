import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
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

    const startTime = Date.now();

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
    const processingTimeMs = Date.now() - startTime;

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
    const parts: string[] = [];

    if (candidate.extractedData) {
      const ed = candidate.extractedData;
      if (ed.summary) parts.push(ed.summary);
      if (ed.skills.length > 0) parts.push(`Skills: ${ed.skills.join(", ")}`);
      if (ed.education.length > 0) parts.push(`Education: ${ed.education.join(", ")}`);
      if (ed.certifications.length > 0) parts.push(`Certifications: ${ed.certifications.join(", ")}`);
      if (ed.experienceYears) parts.push(`Experience: ${ed.experienceYears} years`);
    }

    if (parts.length === 0 && candidate.rawCvText) {
      parts.push(candidate.rawCvText.slice(0, 4000));
    }

    return parts.join("\n");
  }

  jobEmbeddingText(job: ExternalJob): string {
    const parts: string[] = [];
    parts.push(job.title);
    if (job.company) parts.push(`Company: ${job.company}`);
    if (job.locationRaw) parts.push(`Location: ${job.locationRaw}`);
    if (job.category) parts.push(`Category: ${job.category}`);
    if (job.description) parts.push(job.description.slice(0, 4000));
    if (job.extractedSkills.length > 0) parts.push(`Skills: ${job.extractedSkills.join(", ")}`);
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

    let processed = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const success = await this.embedCandidate(candidate.id);
      if (success) {
        processed += 1;
      } else {
        failed += 1;
      }
    }

    this.logger.log(`Backfilled embeddings: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  }

  async backfillExternalJobEmbeddings(): Promise<{ processed: number; failed: number }> {
    const jobs = await this.externalJobRepo
      .createQueryBuilder("j")
      .where("j.embedding IS NULL")
      .getMany();

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      const success = await this.embedExternalJob(job.id);
      if (success) {
        processed += 1;
      } else {
        failed += 1;
      }
    }

    this.logger.log(`Backfilled job embeddings: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  }

  dimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }
}
