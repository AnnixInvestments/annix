import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CreateAnnixOrbitJobDto, UpdateAnnixOrbitJobDto } from "../dto/annix-orbit-job.dto";
import { type AnnixOrbitJob, type AnnixOrbitJobStatus } from "../entities/annix-orbit-job.entity";
import type { AnnixOrbitTalentCandidate } from "../entities/annix-orbit-talent-candidate.entity";
import { cosineSimilarity } from "../lib/embedding-similarity";
import { AnnixOrbitJobRepository } from "../repositories/annix-orbit-job.repository";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import { EmbeddingService } from "./embedding.service";

export interface OrbitJobMatchResult {
  candidateId: number;
  fullName: string;
  currentRole: string | null;
  province: string | null;
  city: string | null;
  yearsExperience: number | null;
  consentToShare: boolean;
  score: number;
  similarity: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  concerns: string[];
  explanation: string;
}

@Injectable()
export class AnnixOrbitJobService {
  private readonly logger = new Logger(AnnixOrbitJobService.name);

  constructor(
    private readonly jobRepo: AnnixOrbitJobRepository,
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly embeddingService: EmbeddingService,
  ) {}

  private jobEmbeddingText(job: AnnixOrbitJob): string {
    const skills = job.requiredSkills ? job.requiredSkills.join(", ") : "";
    const parts = [job.title, job.description ?? "", skills, job.province ?? "", job.city ?? ""];
    return parts.filter((part) => part.trim().length > 0).join(" ");
  }

  private queueEmbeddingRefresh(jobId: number, companyId: number): void {
    void (async () => {
      const job = await this.jobRepo.findByIdForCompany(jobId, companyId);
      if (!job) return;
      const text = this.jobEmbeddingText(job);
      if (!text) return;
      const embedding = await this.embeddingService.generateEmbedding(text);
      if (!embedding) return;
      job.embedding = embedding;
      await this.jobRepo.save(job);
    })().catch((err) => {
      this.logger.warn(
        `Job embedding refresh failed for ${jobId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  // Embedding job<->candidate matching for the recruiter module (issue #337).
  // Blend of semantic similarity (the job text vs the candidate's profile +
  // CV text) and a transparent structured score, with the reasons spelled
  // out per match so recruiters can defend a shortlist to a client.
  async matchesForJob(
    jobId: number,
    companyId: number,
    userId: number,
  ): Promise<OrbitJobMatchResult[]> {
    const job = await this.findByIdForCompany(jobId, companyId);

    // The job's embedding is refreshed in the background on save; compute it
    // inline if a legacy job has none yet.
    let jobEmbedding = job.embedding;
    if (!jobEmbedding) {
      const text = this.jobEmbeddingText(job);
      jobEmbedding = text ? await this.embeddingService.generateEmbedding(text) : null;
      if (jobEmbedding) {
        job.embedding = jobEmbedding;
        await this.jobRepo.save(job);
      }
    }

    const requiredSkills = (job.requiredSkills ?? []).map((skill) => skill.toLowerCase());
    const candidates = await this.candidateRepo.findVisibleForCompany(companyId, userId);

    const results = candidates.map((candidate) =>
      this.scoreCandidate(candidate, job, jobEmbedding, requiredSkills),
    );
    return results.filter((result) => result.score > 0).sort((a, b) => b.score - a.score);
  }

  private scoreCandidate(
    candidate: AnnixOrbitTalentCandidate,
    job: AnnixOrbitJob,
    jobEmbedding: number[] | null,
    requiredSkills: string[],
  ): OrbitJobMatchResult {
    const candidateSkills = (candidate.skills ?? []).map((skill) => skill.toLowerCase());
    const matchedSkills = requiredSkills.filter((skill) => candidateSkills.includes(skill));
    const missingSkills = requiredSkills.filter((skill) => !candidateSkills.includes(skill));
    const skillsScore =
      requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 0;

    const similarity =
      jobEmbedding && candidate.embedding
        ? cosineSimilarity(jobEmbedding, candidate.embedding)
        : null;

    const locationScore = job.province ? (candidate.province === job.province ? 1 : 0) : 1;

    // Semantic similarity carries the most weight when both vectors exist;
    // without one the structured signals carry everything (legacy rows).
    const score =
      similarity != null
        ? Math.round((similarity * 0.55 + skillsScore * 0.35 + locationScore * 0.1) * 100)
        : Math.round((skillsScore * 0.85 + locationScore * 0.15) * 100);

    const concerns: string[] = [];
    if (!candidate.consentToShare) {
      concerns.push("No consent to share - cannot be submitted yet");
    }
    if (job.province && candidate.province !== job.province) {
      concerns.push(
        `Based in ${candidate.province ?? "an unknown province"}, role is in ${job.province}`,
      );
    }
    if (similarity == null) {
      concerns.push("No CV on file yet - semantic match unavailable, score is skills-only");
    }

    const explanationParts: string[] = [];
    if (similarity != null) {
      explanationParts.push(
        `Overall profile similarity to the job spec: ${Math.round(similarity * 100)}%.`,
      );
    }
    if (requiredSkills.length > 0) {
      explanationParts.push(
        `Skills: matched ${matchedSkills.length} of ${requiredSkills.length} required${
          matchedSkills.length > 0 ? ` (${matchedSkills.join(", ")})` : ""
        }${missingSkills.length > 0 ? `; missing ${missingSkills.join(", ")}` : ""}.`,
      );
    }
    if (job.province) {
      explanationParts.push(
        candidate.province === job.province
          ? `Located in ${job.province}, matching the role.`
          : "Outside the role's province.",
      );
    }

    return {
      candidateId: candidate.id,
      fullName: candidate.fullName,
      currentRole: candidate.currentRole,
      province: candidate.province,
      city: candidate.city,
      yearsExperience: candidate.yearsExperience,
      consentToShare: candidate.consentToShare,
      score,
      similarity,
      matchedSkills,
      missingSkills,
      concerns,
      explanation: explanationParts.join(" "),
    };
  }

  findForCompany(companyId: number): Promise<AnnixOrbitJob[]> {
    return this.jobRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitJob> {
    const job = await this.jobRepo.findByIdForCompany(id, companyId);
    if (!job) {
      throw new NotFoundException("Job not found");
    }
    return job;
  }

  create(companyId: number, dto: CreateAnnixOrbitJobDto): Promise<AnnixOrbitJob> {
    return this.jobRepo.create({
      companyId,
      clientId: dto.clientId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      province: dto.province ?? null,
      city: dto.city ?? null,
      employmentType: dto.employmentType ?? null,
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
      requiredSkills: dto.requiredSkills ?? null,
      openings: dto.openings ?? 1,
      status: (dto.status ?? "open") as AnnixOrbitJobStatus,
      closingDate: dto.closingDate ?? null,
      notes: dto.notes ?? null,
    });
  }

  async createWithEmbedding(
    companyId: number,
    dto: CreateAnnixOrbitJobDto,
  ): Promise<AnnixOrbitJob> {
    const created = await this.create(companyId, dto);
    this.queueEmbeddingRefresh(created.id, companyId);
    return created;
  }

  async update(id: number, companyId: number, dto: UpdateAnnixOrbitJobDto): Promise<AnnixOrbitJob> {
    const job = await this.findByIdForCompany(id, companyId);
    job.clientId = dto.clientId ?? null;
    job.title = dto.title;
    job.description = dto.description ?? null;
    job.province = dto.province ?? null;
    job.city = dto.city ?? null;
    job.employmentType = dto.employmentType ?? null;
    job.salaryMin = dto.salaryMin ?? null;
    job.salaryMax = dto.salaryMax ?? null;
    job.requiredSkills = dto.requiredSkills ?? null;
    job.openings = dto.openings ?? 1;
    job.status = (dto.status ?? "open") as AnnixOrbitJobStatus;
    job.closingDate = dto.closingDate ?? null;
    job.notes = dto.notes ?? null;
    const saved = await this.jobRepo.save(job);
    this.queueEmbeddingRefresh(saved.id, companyId);
    return saved;
  }

  async remove(id: number, companyId: number): Promise<void> {
    const job = await this.findByIdForCompany(id, companyId);
    await this.jobRepo.remove(job);
  }
}
