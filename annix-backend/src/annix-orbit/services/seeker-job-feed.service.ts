import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { DateTime, fromJSDate, nowMillis } from "../../lib/datetime";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource } from "../entities/job-market-source.entity";
import { SeekerApplyClick } from "../entities/seeker-apply-click.entity";
import { SeekerMute } from "../entities/seeker-mute.entity";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";

const REMATCH_COOLDOWN_MS = 5 * 60 * 1000;
const APPLY_CLICK_DEDUP_MS = 5_000;
const MAX_COLD_START = 12;

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
  private readonly lastRematchByCandidate = new Map<number, number>();

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
    @InjectRepository(CandidateJobMatch)
    private readonly matchRepo: Repository<CandidateJobMatch>,
    @InjectRepository(SeekerApplyClick)
    private readonly applyClickRepo: Repository<SeekerApplyClick>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    @InjectRepository(SeekerMute)
    private readonly muteRepo: Repository<SeekerMute>,
    private readonly matchingService: CandidateJobMatchingService,
  ) {}

  async muteCompanyForSeeker(
    email: string | null,
    company: string,
  ): Promise<{ created: boolean; mute: SeekerMute | null }> {
    const trimmed = company.trim();
    if (!trimmed) {
      return { created: false, mute: null };
    }
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { created: false, mute: null };
    }
    const target = candidates[0];
    const existing = await this.muteRepo
      .createQueryBuilder("mute")
      .where("mute.candidate_id = :candidateId", { candidateId: target.id })
      .andWhere("LOWER(mute.company_name) = LOWER(:company)", { company: trimmed })
      .getOne();
    if (existing) {
      return { created: false, mute: existing };
    }
    const created = await this.muteRepo.save(
      this.muteRepo.create({
        candidateId: target.id,
        companyName: trimmed,
        category: null,
      }),
    );
    return { created: true, mute: created };
  }

  async muteCategoryForSeeker(
    email: string | null,
    category: string,
  ): Promise<{ created: boolean; mute: SeekerMute | null }> {
    const trimmed = category.trim();
    if (!trimmed) {
      return { created: false, mute: null };
    }
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { created: false, mute: null };
    }
    const target = candidates[0];
    const existing = await this.muteRepo
      .createQueryBuilder("mute")
      .where("mute.candidate_id = :candidateId", { candidateId: target.id })
      .andWhere("LOWER(mute.category) = LOWER(:category)", { category: trimmed })
      .getOne();
    if (existing) {
      return { created: false, mute: existing };
    }
    const created = await this.muteRepo.save(
      this.muteRepo.create({
        candidateId: target.id,
        companyName: null,
        category: trimmed,
      }),
    );
    return { created: true, mute: created };
  }

  async mutesForSeeker(email: string | null): Promise<SeekerMute[]> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return [];
    }
    const candidateIds = candidates.map((c) => c.id);
    return this.muteRepo
      .createQueryBuilder("mute")
      .where("mute.candidate_id IN (:...ids)", { ids: candidateIds })
      .orderBy("mute.muted_at", "DESC")
      .getMany();
  }

  async revokeMuteForSeeker(email: string | null, muteId: number): Promise<boolean> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) return false;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const found = await this.muteRepo.findOne({ where: { id: muteId } });
    if (!found || !candidateIds.has(found.candidateId)) {
      return false;
    }
    await this.muteRepo.delete(found.id);
    return true;
  }

  private async applyMuteFilters<T>(
    candidateIds: number[],
    items: T[],
    selector: (item: T) => { company: string | null; category: string | null },
  ): Promise<T[]> {
    if (items.length === 0 || candidateIds.length === 0) return items;
    const mutes = await this.muteRepo
      .createQueryBuilder("mute")
      .where("mute.candidate_id IN (:...ids)", { ids: candidateIds })
      .getMany();
    if (mutes.length === 0) return items;

    const mutedCompanies = new Set<string>();
    const mutedCategories = new Set<string>();
    for (const mute of mutes) {
      if (mute.companyName) mutedCompanies.add(mute.companyName.toLowerCase());
      if (mute.category) mutedCategories.add(mute.category.toLowerCase());
    }
    if (mutedCompanies.size === 0 && mutedCategories.size === 0) return items;

    return items.filter((item) => {
      const fields = selector(item);
      const company = fields.company;
      if (company && mutedCompanies.has(company.toLowerCase())) return false;
      const category = fields.category;
      if (category && mutedCategories.has(category.toLowerCase())) return false;
      return true;
    });
  }

  async candidatesForSeeker(email: string | null): Promise<Candidate[]> {
    if (!email) return [];
    return this.candidateRepo.find({ where: { email } });
  }

  async consentStatusForSeeker(
    email: string | null,
  ): Promise<{ hasCandidate: boolean; consented: boolean; consentedAt: string | null }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { hasCandidate: false, consented: false, consentedAt: null };
    }
    const consented = candidates.every((c) => c.popiaConsent);
    const consentedAt = candidates
      .map((c) => c.popiaConsentedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      hasCandidate: true,
      consented,
      consentedAt: consentedAt ? consentedAt.toISOString() : null,
    };
  }

  async grantMatchingConsentForSeeker(
    email: string | null,
  ): Promise<{ candidatesAffected: number }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { candidatesAffected: 0 };
    }
    const candidateIds = candidates.map((c) => c.id);
    const consentedAt = DateTime.now().toJSDate();
    await this.candidateRepo
      .createQueryBuilder()
      .update()
      .set({ popiaConsent: true, popiaConsentedAt: consentedAt, jobAlertsOptIn: true })
      .where("id IN (:...ids)", { ids: candidateIds })
      .execute();
    return { candidatesAffected: candidateIds.length };
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

    let flat = perCandidateLists.flat();
    flat = await this.applyMuteFilters(
      candidates.map((c) => c.id),
      flat,
      (m) => ({
        company: m.externalJob?.company ?? null,
        category: m.externalJob?.category ?? null,
      }),
    );

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

  async rematchForSeeker(
    email: string | null,
  ): Promise<
    | { triggered: true; rematchedCandidates: number[] }
    | { triggered: false; reason: "no-candidate" }
    | { triggered: false; reason: "rate-limited"; retryAfterSeconds: number }
  > {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { triggered: false, reason: "no-candidate" };
    }

    const now = nowMillis();
    const earliestNextAllowed = candidates.reduce<number | null>((acc, candidate) => {
      const last = this.lastRematchByCandidate.get(candidate.id);
      if (last == null) return acc;
      const next = last + REMATCH_COOLDOWN_MS;
      if (acc == null) return next;
      return Math.max(acc, next);
    }, null);

    if (earliestNextAllowed != null && earliestNextAllowed > now) {
      const retryAfterSeconds = Math.ceil((earliestNextAllowed - now) / 1000);
      return { triggered: false, reason: "rate-limited", retryAfterSeconds };
    }

    candidates.forEach((c) => this.lastRematchByCandidate.set(c.id, now));

    void Promise.all(
      candidates.map((candidate) =>
        this.matchingService
          .matchCandidateToJobs(candidate.id)
          .catch((err) =>
            this.logger.warn(
              `Manual rematch failed for candidate ${candidate.id}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          ),
      ),
    );

    return { triggered: true, rematchedCandidates: candidates.map((c) => c.id) };
  }

  async withdrawMatchingForSeeker(
    email: string | null,
  ): Promise<{ candidatesAffected: number; matchesCleared: number }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { candidatesAffected: 0, matchesCleared: 0 };
    }
    const candidateIds = candidates.map((c) => c.id);

    const deleteResult = await this.matchRepo
      .createQueryBuilder()
      .delete()
      .where("candidate_id IN (:...ids)", { ids: candidateIds })
      .execute();

    await this.candidateRepo
      .createQueryBuilder()
      .update()
      .set({ embedding: null, jobAlertsOptIn: false })
      .where("id IN (:...ids)", { ids: candidateIds })
      .execute();

    candidateIds.forEach((id) => this.lastRematchByCandidate.delete(id));

    return {
      candidatesAffected: candidateIds.length,
      matchesCleared: deleteResult.affected ?? 0,
    };
  }

  async statsForSeeker(
    email: string | null,
  ): Promise<{ hasCandidate: boolean; totalMatches: number; matchesLast7Days: number }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { hasCandidate: false, totalMatches: 0, matchesLast7Days: 0 };
    }
    const candidateIds = candidates.map((c) => c.id);

    const totalQb = this.matchRepo
      .createQueryBuilder("match")
      .where("match.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("match.dismissed = false");
    const totalMatches = await totalQb.getCount();

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const recentQb = this.matchRepo
      .createQueryBuilder("match")
      .where("match.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("match.dismissed = false")
      .andWhere("match.created_at >= :sevenDaysAgo", { sevenDaysAgo });
    const matchesLast7Days = await recentQb.getCount();

    return { hasCandidate: true, totalMatches, matchesLast7Days };
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

  async coldStartForSeeker(
    email: string | null,
  ): Promise<{ jobs: SeekerJobMatch[]; candidateIds: number[]; embeddingPending: boolean }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { jobs: [], candidateIds: [], embeddingPending: false };
    }

    const embeddingPending = candidates.every((c) => c.embedding === null);
    const candidateIds = candidates.map((c) => c.id);

    const skillsLower = new Set<string>();
    const locationTokens = new Set<string>();
    for (const candidate of candidates) {
      const extracted = candidate.extractedData;
      if (extracted) {
        for (const skill of extracted.skills) {
          if (skill.trim().length > 0) skillsLower.add(skill.toLowerCase().trim());
        }
        const summary = extracted.summary;
        if (summary) {
          const provinces = [
            "gauteng",
            "western cape",
            "kwazulu-natal",
            "eastern cape",
            "free state",
            "mpumalanga",
            "limpopo",
            "north west",
            "northern cape",
          ];
          const lower = summary.toLowerCase();
          for (const province of provinces) {
            if (lower.includes(province)) locationTokens.add(province);
          }
        }
      }
    }

    const qb = this.externalJobRepo
      .createQueryBuilder("job")
      .where("job.country = :country", { country: "za" });

    if (locationTokens.size > 0) {
      const locations = [...locationTokens];
      const conditions = locations
        .map((_, idx) => `LOWER(COALESCE(job.location_raw, '')) LIKE :loc${idx}`)
        .join(" OR ");
      const params = locations.reduce<Record<string, string>>(
        (acc, loc, idx) => Object.assign(acc, { [`loc${idx}`]: `%${loc}%` }),
        {},
      );
      qb.andWhere(`(${conditions})`, params);
    }

    qb.orderBy("job.postedAt", "DESC", "NULLS LAST").take(MAX_COLD_START * 2);
    let jobs = await qb.getMany();

    if (jobs.length === 0 && locationTokens.size > 0) {
      const fallback = await this.externalJobRepo
        .createQueryBuilder("job")
        .where("job.country = :country", { country: "za" })
        .orderBy("job.postedAt", "DESC", "NULLS LAST")
        .take(MAX_COLD_START * 2)
        .getMany();
      jobs.push(...fallback);
    }

    jobs = await this.applyMuteFilters(candidateIds, jobs, (job) => ({
      company: job.company,
      category: job.category,
    }));
    jobs = jobs.slice(0, MAX_COLD_START);

    const sourceIds = [
      ...new Set(jobs.map((j) => j.sourceId).filter((v): v is number => v != null)),
    ];
    const sources = sourceIds.length > 0 ? await this.sourceRepo.findByIds(sourceIds) : [];
    const sourceById = new Map(sources.map((s) => [s.id, s]));

    const seekerJobs = jobs.map((job) =>
      toColdStartSeekerMatch(
        job,
        candidateIds[0],
        sourceById.get(job.sourceId) ?? null,
        skillsLower,
      ),
    );

    return { jobs: seekerJobs, candidateIds, embeddingPending };
  }

  async recordApplyClick(
    email: string | null,
    input: { matchId: number | null; externalJobId: number | null; sourceUrl: string | null },
  ): Promise<{ recorded: boolean; clickId: number | null }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { recorded: false, clickId: null };
    }
    const candidateIds = new Set(candidates.map((c) => c.id));

    let candidateId: number | null = null;
    if (input.matchId !== null) {
      const match = await this.matchRepo.findOne({ where: { id: input.matchId } });
      if (!match || !candidateIds.has(match.candidateId)) {
        return { recorded: false, clickId: null };
      }
      candidateId = match.candidateId;
    } else {
      candidateId = candidates[0].id;
    }

    if (input.externalJobId !== null && candidateId !== null) {
      const cutoff = fromJSDate(new Date(nowMillis() - APPLY_CLICK_DEDUP_MS)).toJSDate();
      const existing = await this.applyClickRepo.findOne({
        where: {
          candidateId,
          externalJobId: input.externalJobId,
          clickedAt: MoreThanOrEqual(cutoff),
        },
      });
      if (existing) {
        return { recorded: false, clickId: existing.id };
      }
    }

    const click = this.applyClickRepo.create({
      candidateId,
      externalJobId: input.externalJobId,
      matchId: input.matchId,
      sourceUrl: input.sourceUrl,
    });
    const saved = await this.applyClickRepo.save(click);
    return { recorded: true, clickId: saved.id };
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

function toColdStartSeekerMatch(
  job: ExternalJob,
  candidateId: number,
  source: JobMarketSource | null,
  candidateSkillsLower: Set<string>,
): SeekerJobMatch {
  const jobSkillsLower = (job.extractedSkills ?? []).map((s) => s.toLowerCase());
  const matched = jobSkillsLower.filter((s) => candidateSkillsLower.has(s));
  return {
    matchId: -job.id,
    candidateId,
    externalJobId: job.id,
    overallScore: 0,
    similarityScore: 0,
    structuredScore: 0,
    matchDetails: {
      embeddingSimilarity: 0,
      skillsOverlap: 0,
      skillsMatched: matched,
      skillsMissing: [],
      experienceMatch: 0,
      locationMatch: 0,
      reasoning: "Recent SA job listing while your CV is being matched.",
    },
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
