import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { CvNotificationService } from "./cv-notification.service";

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
    @Inject(forwardRef(() => CvNotificationService))
    private readonly notificationService: CvNotificationService,
  ) {}

  async matchCandidateToJobs(candidateId: number): Promise<CandidateJobMatch[]> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) {
      return [];
    } else {
      const similarJobs = await this.findSimilarJobsByEmbedding(candidateId, TOP_MATCHES_LIMIT);

      const results = await Promise.all(
        similarJobs.map(async (row) => {
          const job = await this.externalJobRepo.findOne({ where: { id: row.jobId } });
          if (!job) {
            return null;
          } else {
            return this.scoreAndSaveMatch(candidate, job, row.similarity, candidateId, job.id);
          }
        }),
      );

      const matches = results.filter((m): m is CandidateJobMatch => m !== null);

      this.logger.log(`Matched candidate ${candidateId} to ${matches.length} jobs`);

      this.notificationService
        .notifyRecruitersOfHighMatch(
          candidateId,
          matches.map((m) => ({ externalJobId: m.externalJobId, overallScore: m.overallScore })),
        )
        .catch((err) => {
          this.logger.warn(
            `Failed to send match alerts for candidate ${candidateId}: ${err.message}`,
          );
        });

      return matches;
    }
  }

  async matchJobToCandidates(externalJobId: number): Promise<CandidateJobMatch[]> {
    const job = await this.externalJobRepo.findOne({ where: { id: externalJobId } });
    if (!job) {
      return [];
    } else {
      const similarCandidates = await this.findSimilarCandidatesByEmbedding(
        externalJobId,
        TOP_MATCHES_LIMIT,
      );

      const results = await Promise.all(
        similarCandidates.map(async (row) => {
          const candidate = await this.candidateRepo.findOne({ where: { id: row.candidateId } });
          if (!candidate) {
            return null;
          } else {
            return this.scoreAndSaveMatch(candidate, job, row.similarity, candidate.id, externalJobId);
          }
        }),
      );

      const matches = results.filter((m): m is CandidateJobMatch => m !== null);

      this.logger.log(`Matched job ${externalJobId} to ${matches.length} candidates`);
      return matches;
    }
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
    } else {
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
  }

  private async scoreAndSaveMatch(
    candidate: Candidate,
    job: ExternalJob,
    embeddingSimilarity: number,
    candidateId: number,
    externalJobId: number,
  ): Promise<CandidateJobMatch> {
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
      reasoning: this.buildReasoning(embeddingSimilarity, skillsResult, experienceMatch, locationMatch, job),
    };

    const existing = await this.matchRepo.findOne({
      where: { candidateId, externalJobId },
    });

    const match = existing ?? this.matchRepo.create({ candidateId, externalJobId });
    match.similarityScore = embeddingSimilarity;
    match.structuredScore =
      skillsResult.score * (WEIGHT_SKILLS / (1 - WEIGHT_EMBEDDING)) +
      experienceMatch * (WEIGHT_EXPERIENCE / (1 - WEIGHT_EMBEDDING)) +
      locationMatch * (WEIGHT_LOCATION / (1 - WEIGHT_EMBEDDING));
    match.overallScore = overallScore;
    match.matchDetails = matchDetails;

    return this.matchRepo.save(match);
  }

  private calculateExperienceMatch(candidate: Candidate, _job: ExternalJob): number {
    const years = candidate.extractedData?.experienceYears;
    if (!years) {
      return 0.3;
    } else if (years >= 5) {
      return 1.0;
    } else if (years >= 3) {
      return 0.8;
    } else if (years >= 1) {
      return 0.5;
    } else {
      return 0.2;
    }
  }

  private calculateLocationMatch(candidate: Candidate, job: ExternalJob): number {
    if (!job.locationArea) {
      return 0.5;
    } else {
      const summary = candidate.extractedData?.summary?.toLowerCase() ?? "";
      const locationLower = job.locationArea.toLowerCase();

      if (summary.includes(locationLower)) {
        return 1.0;
      } else {
        const saRegions = ["gauteng", "johannesburg", "cape town", "durban", "pretoria"];
        const jobInSa = saRegions.some((r) => locationLower.includes(r));
        const candidateInSa = saRegions.some((r) => summary.includes(r));

        if (jobInSa && candidateInSa) {
          return 0.7;
        } else {
          return 0.3;
        }
      }
    }
  }

  private buildReasoning(
    embeddingSimilarity: number,
    skillsResult: { score: number; matched: string[]; missing: string[] },
    experienceMatch: number,
    locationMatch: number,
    job: ExternalJob,
  ): string {
    const simPct = Math.round(embeddingSimilarity * 100);

    const experienceLevel =
      experienceMatch >= 0.8
        ? "strong match"
        : experienceMatch >= 0.5
          ? "moderate match"
          : "limited match";

    const locationPart =
      locationMatch >= 0.7
        ? `Location: good match (${job.locationArea ?? "unspecified"})`
        : `Location: ${job.locationArea ?? "unspecified"}`;

    const parts = [
      `Profile similarity: ${simPct}%`,
      ...(skillsResult.matched.length > 0
        ? [`Matching skills: ${skillsResult.matched.join(", ")}`]
        : []),
      ...(skillsResult.missing.length > 0
        ? [`Missing skills: ${skillsResult.missing.join(", ")}`]
        : []),
      `Experience level: ${experienceLevel}`,
      locationPart,
    ];

    return parts.join(". ");
  }
}
