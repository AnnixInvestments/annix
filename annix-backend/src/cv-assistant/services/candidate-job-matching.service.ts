import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";

const WEIGHT_EMBEDDING = 0.5;
const WEIGHT_SKILLS = 0.25;
const WEIGHT_EXPERIENCE = 0.15;
const WEIGHT_LOCATION = 0.1;

const TOP_MATCHES_LIMIT = 20;

@Injectable()
export class CandidateJobMatchingService {
  private readonly logger = new Logger(CandidateJobMatchingService.name);

  constructor(
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
  ) {}

  async matchCandidateToJobs(candidateId: number): Promise<CandidateJobMatch[]> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) {
      return [];
    }

    const similarJobs = await this.findSimilarJobsByEmbedding(candidateId, TOP_MATCHES_LIMIT);

    const matches: CandidateJobMatch[] = [];

    for (const row of similarJobs) {
      const job = await this.externalJobRepo.findOne({ where: { id: row.jobId } });
      if (!job) {
        continue;
      }

      const embeddingSimilarity = row.similarity;
      const skillsResult = this.calculateSkillsOverlap(candidate, job);
      const experienceMatch = this.calculateExperienceMatch(candidate, job);
      const locationMatch = this.calculateLocationMatch(candidate, job);

      const overallScore =
        embeddingSimilarity * WEIGHT_EMBEDDING +
        skillsResult.score * WEIGHT_SKILLS +
        experienceMatch * WEIGHT_EXPERIENCE +
        locationMatch * WEIGHT_LOCATION;

      const matchDetails: MatchDetails = {
        embeddingSimilarity,
        skillsOverlap: skillsResult.score,
        skillsMatched: skillsResult.matched,
        skillsMissing: skillsResult.missing,
        experienceMatch,
        locationMatch,
        reasoning: this.buildReasoning(
          embeddingSimilarity,
          skillsResult,
          experienceMatch,
          locationMatch,
          job,
        ),
      };

      const existing = await this.matchRepo.findOne({
        where: { candidateId, externalJobId: job.id },
      });

      const match = existing ?? this.matchRepo.create({ candidateId, externalJobId: job.id });
      match.similarityScore = embeddingSimilarity;
      match.structuredScore =
        skillsResult.score * (WEIGHT_SKILLS / (1 - WEIGHT_EMBEDDING)) +
        experienceMatch * (WEIGHT_EXPERIENCE / (1 - WEIGHT_EMBEDDING)) +
        locationMatch * (WEIGHT_LOCATION / (1 - WEIGHT_EMBEDDING));
      match.overallScore = overallScore;
      match.matchDetails = matchDetails;

      const saved = await this.matchRepo.save(match);
      matches.push(saved);
    }

    this.logger.log(`Matched candidate ${candidateId} to ${matches.length} jobs`);
    return matches;
  }

  async matchJobToCandidates(externalJobId: number): Promise<CandidateJobMatch[]> {
    const job = await this.externalJobRepo.findOne({ where: { id: externalJobId } });
    if (!job) {
      return [];
    }

    const similarCandidates = await this.findSimilarCandidatesByEmbedding(
      externalJobId,
      TOP_MATCHES_LIMIT,
    );

    const matches: CandidateJobMatch[] = [];

    for (const row of similarCandidates) {
      const candidate = await this.candidateRepo.findOne({ where: { id: row.candidateId } });
      if (!candidate) {
        continue;
      }

      const embeddingSimilarity = row.similarity;
      const skillsResult = this.calculateSkillsOverlap(candidate, job);
      const experienceMatch = this.calculateExperienceMatch(candidate, job);
      const locationMatch = this.calculateLocationMatch(candidate, job);

      const overallScore =
        embeddingSimilarity * WEIGHT_EMBEDDING +
        skillsResult.score * WEIGHT_SKILLS +
        experienceMatch * WEIGHT_EXPERIENCE +
        locationMatch * WEIGHT_LOCATION;

      const matchDetails: MatchDetails = {
        embeddingSimilarity,
        skillsOverlap: skillsResult.score,
        skillsMatched: skillsResult.matched,
        skillsMissing: skillsResult.missing,
        experienceMatch,
        locationMatch,
        reasoning: this.buildReasoning(
          embeddingSimilarity,
          skillsResult,
          experienceMatch,
          locationMatch,
          job,
        ),
      };

      const existing = await this.matchRepo.findOne({
        where: { candidateId: candidate.id, externalJobId },
      });

      const match = existing ?? this.matchRepo.create({ candidateId: candidate.id, externalJobId });
      match.similarityScore = embeddingSimilarity;
      match.structuredScore =
        skillsResult.score * (WEIGHT_SKILLS / (1 - WEIGHT_EMBEDDING)) +
        experienceMatch * (WEIGHT_EXPERIENCE / (1 - WEIGHT_EMBEDDING)) +
        locationMatch * (WEIGHT_LOCATION / (1 - WEIGHT_EMBEDDING));
      match.overallScore = overallScore;
      match.matchDetails = matchDetails;

      const saved = await this.matchRepo.save(match);
      matches.push(saved);
    }

    this.logger.log(`Matched job ${externalJobId} to ${matches.length} candidates`);
    return matches;
  }

  async recommendedJobsForCandidate(
    candidateId: number,
    options: { includeDismissed?: boolean } = {},
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const qb = this.matchRepo
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.externalJob", "job")
      .where("match.candidate_id = :candidateId", { candidateId })
      .orderBy("match.overall_score", "DESC")
      .take(TOP_MATCHES_LIMIT);

    if (!options.includeDismissed) {
      qb.andWhere("match.dismissed = false");
    }

    return qb.getMany() as Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>>;
  }

  async matchingCandidatesForJob(
    externalJobId: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>> {
    return this.matchRepo
      .createQueryBuilder("match")
      .leftJoinAndSelect("match.candidate", "candidate")
      .where("match.external_job_id = :externalJobId", { externalJobId })
      .andWhere("match.dismissed = false")
      .orderBy("match.overall_score", "DESC")
      .take(TOP_MATCHES_LIMIT)
      .getMany() as Promise<Array<CandidateJobMatch & { candidate: Candidate }>>;
  }

  async dismissMatch(matchId: number): Promise<void> {
    await this.matchRepo.update(matchId, { dismissed: true });
  }

  private async findSimilarJobsByEmbedding(
    candidateId: number,
    limit: number,
  ): Promise<Array<{ jobId: number; similarity: number }>> {
    const result = await this.externalJobRepo.query(
      `
      SELECT j.id AS "jobId",
             1 - (c.embedding <=> j.embedding) AS similarity
      FROM cv_assistant_candidates c
      CROSS JOIN cv_assistant_external_jobs j
      WHERE c.id = $1
        AND c.embedding IS NOT NULL
        AND j.embedding IS NOT NULL
      ORDER BY c.embedding <=> j.embedding
      LIMIT $2
      `,
      [candidateId, limit],
    );

    return result.map((r: { jobId: number; similarity: string }) => ({
      jobId: r.jobId,
      similarity: Number.parseFloat(String(r.similarity)),
    }));
  }

  private async findSimilarCandidatesByEmbedding(
    externalJobId: number,
    limit: number,
  ): Promise<Array<{ candidateId: number; similarity: number }>> {
    const result = await this.candidateRepo.query(
      `
      SELECT c.id AS "candidateId",
             1 - (j.embedding <=> c.embedding) AS similarity
      FROM cv_assistant_external_jobs j
      CROSS JOIN cv_assistant_candidates c
      WHERE j.id = $1
        AND j.embedding IS NOT NULL
        AND c.embedding IS NOT NULL
      ORDER BY j.embedding <=> c.embedding
      LIMIT $2
      `,
      [externalJobId, limit],
    );

    return result.map((r: { candidateId: number; similarity: string }) => ({
      candidateId: r.candidateId,
      similarity: Number.parseFloat(String(r.similarity)),
    }));
  }

  private calculateSkillsOverlap(
    candidate: Candidate,
    job: ExternalJob,
  ): { score: number; matched: string[]; missing: string[] } {
    const candidateSkills = (candidate.extractedData?.skills ?? []).map((s) => s.toLowerCase());
    const jobSkills = job.extractedSkills.map((s) => s.toLowerCase());

    if (jobSkills.length === 0) {
      return { score: candidateSkills.length > 0 ? 0.5 : 0, matched: [], missing: [] };
    }

    const matched = jobSkills.filter((js) =>
      candidateSkills.some((cs) => cs.includes(js) || js.includes(cs)),
    );
    const missing = jobSkills.filter(
      (js) => !candidateSkills.some((cs) => cs.includes(js) || js.includes(cs)),
    );

    return {
      score: matched.length / jobSkills.length,
      matched,
      missing,
    };
  }

  private calculateExperienceMatch(candidate: Candidate, _job: ExternalJob): number {
    const years = candidate.extractedData?.experienceYears;
    if (!years) {
      return 0.3;
    }
    if (years >= 5) return 1.0;
    if (years >= 3) return 0.8;
    if (years >= 1) return 0.5;
    return 0.2;
  }

  private calculateLocationMatch(candidate: Candidate, job: ExternalJob): number {
    if (!job.locationArea) {
      return 0.5;
    }
    const summary = candidate.extractedData?.summary?.toLowerCase() ?? "";
    const locationLower = job.locationArea.toLowerCase();

    if (summary.includes(locationLower)) {
      return 1.0;
    }

    const saRegions = ["gauteng", "johannesburg", "cape town", "durban", "pretoria"];
    const jobInSa = saRegions.some((r) => locationLower.includes(r));
    const candidateInSa = saRegions.some((r) => summary.includes(r));

    if (jobInSa && candidateInSa) {
      return 0.7;
    }

    return 0.3;
  }

  private buildReasoning(
    embeddingSimilarity: number,
    skillsResult: { score: number; matched: string[]; missing: string[] },
    experienceMatch: number,
    locationMatch: number,
    job: ExternalJob,
  ): string {
    const parts: string[] = [];

    const simPct = Math.round(embeddingSimilarity * 100);
    parts.push(`Profile similarity: ${simPct}%`);

    if (skillsResult.matched.length > 0) {
      parts.push(`Matching skills: ${skillsResult.matched.join(", ")}`);
    }
    if (skillsResult.missing.length > 0) {
      parts.push(`Missing skills: ${skillsResult.missing.join(", ")}`);
    }

    if (experienceMatch >= 0.8) {
      parts.push("Experience level: strong match");
    } else if (experienceMatch >= 0.5) {
      parts.push("Experience level: moderate match");
    } else {
      parts.push("Experience level: limited match");
    }

    if (locationMatch >= 0.7) {
      parts.push(`Location: good match (${job.locationArea ?? "unspecified"})`);
    } else {
      parts.push(`Location: ${job.locationArea ?? "unspecified"}`);
    }

    return parts.join(". ");
  }
}
