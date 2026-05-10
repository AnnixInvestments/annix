import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource } from "../entities/job-market-source.entity";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";

export interface SeekerJobMatch {
  matchId: number;
  candidateId: number;
  externalJobId: number;
  overallScore: number;
  similarityScore: number;
  structuredScore: number;
  matchDetails: MatchDetails | null;
  job: {
    id: number;
    title: string;
    company: string | null;
    country: string;
    locationRaw: string | null;
    locationArea: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    description: string | null;
    extractedSkills: string[];
    category: string | null;
    sourceUrl: string | null;
    postedAt: string | null;
    expiresAt: string | null;
    sourceProvider: string | null;
    sourceName: string | null;
  };
}

@Injectable()
export class SeekerJobFeedService {
  private readonly logger = new Logger(SeekerJobFeedService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
    private readonly matchingService: CandidateJobMatchingService,
  ) {}

  async candidatesForSeeker(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.find({ where: { email } });
  }

  async recommendedForSeeker(
    email: string | null,
    options: { includeDismissed?: boolean } = {},
  ): Promise<{ matches: SeekerJobMatch[]; candidateIds: number[] }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { matches: [], candidateIds: [] };
    }

    const perCandidateLists = await Promise.all(
      candidates.map((candidate) =>
        this.matchingService.recommendedJobsForCandidate(candidate.id, {
          includeDismissed: options.includeDismissed ?? false,
        }),
      ),
    );

    const flat = perCandidateLists.flat();
    if (flat.length === 0) {
      return { matches: [], candidateIds: candidates.map((c) => c.id) };
    }

    const sourceIds = [
      ...new Set(
        flat
          .map((m) => m.externalJob?.sourceId)
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
    const sources = sourceIds.length > 0 ? await this.sourceRepo.findByIds(sourceIds) : [];
    const sourceById = new Map(sources.map((s) => [s.id, s]));

    const bestByJob = new Map<number, CandidateJobMatch & { externalJob: ExternalJob }>();
    flat.forEach((match) => {
      const jobId = match.externalJobId;
      const existing = bestByJob.get(jobId);
      if (!existing || match.overallScore > existing.overallScore) {
        bestByJob.set(jobId, match);
      }
    });

    const sorted = [...bestByJob.values()].sort((a, b) => b.overallScore - a.overallScore);

    const matches = sorted.map((match) =>
      toSeekerMatch(match, sourceById.get(match.externalJob.sourceId) ?? null),
    );
    return { matches, candidateIds: candidates.map((c) => c.id) };
  }

  async dismissForSeeker(email: string | null, matchId: number): Promise<boolean> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) return false;
    const candidateIds = new Set(candidates.map((c) => c.id));

    const found = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!found || !candidateIds.has(found.candidateId)) {
      return false;
    }
    await this.matchingService.dismissMatch(matchId);
    return true;
  }
}

function toSeekerMatch(
  match: CandidateJobMatch & { externalJob: ExternalJob },
  source: JobMarketSource | null,
): SeekerJobMatch {
  const job = match.externalJob;
  return {
    matchId: match.id,
    candidateId: match.candidateId,
    externalJobId: match.externalJobId,
    overallScore: Number(match.overallScore),
    similarityScore: Number(match.similarityScore),
    structuredScore: Number(match.structuredScore),
    matchDetails: match.matchDetails,
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      country: job.country,
      locationRaw: job.locationRaw,
      locationArea: job.locationArea,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      description: job.description,
      extractedSkills: job.extractedSkills ?? [],
      category: job.category,
      sourceUrl: job.sourceUrl,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
      sourceProvider: source?.provider ?? null,
      sourceName: source?.name ?? null,
    },
  };
}
