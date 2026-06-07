import {
  DEFAULT_MATCH_TIER,
  isMatchTier,
  JOB_CATEGORIES,
  type MatchTier,
} from "@annix/product-data/sa-market";
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DateTime, fromJSDate, nowMillis } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { UserRepository } from "../../user/user.repository";
import { IndividualDocumentKind } from "../entities/annix-orbit-individual-document.entity";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource } from "../entities/job-market-source.entity";
import {
  DEFAULT_TIER_FEATURES,
  type OrbitTierFeatures,
} from "../entities/orbit-tier-capability.entity";
import { SeekerMute } from "../entities/seeker-mute.entity";
import { countMatchingRows, distinctPassing } from "../lib/facet-compute";
import { citiesForProvince, SA_PROVINCES } from "../lib/sa-locations";
import { AnnixOrbitIndividualDocumentRepository } from "../repositories/annix-orbit-individual-document.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import {
  CandidateJobMatchRepository,
  type RecommendedFacetRow,
} from "../repositories/candidate-job-match.repository";
import { CandidateReferenceRepository } from "../repositories/candidate-reference.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { JobMarketSourceRepository } from "../repositories/job-market-source.repository";
import { OrbitDismissReasonRepository } from "../repositories/orbit-dismiss-reason.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import { SeekerApplyClickRepository } from "../repositories/seeker-apply-click.repository";
import { SeekerMuteRepository } from "../repositories/seeker-mute.repository";
import { SeekerUsageCounterRepository } from "../repositories/seeker-usage-counter.repository";
import {
  CandidateJobMatchingService,
  type RecommendedJobFilters,
} from "./candidate-job-matching.service";
import { CvNotificationService } from "./cv-notification.service";
import { JobMarketCountriesService } from "./job-market-countries.service";

const HELP_FIND_JOB_OPERATION = "help-find-job";
const CV_BUILD_OPERATION = "nix-cv-build";

const REMATCH_COOLDOWN_MS = 5 * 60 * 1000;
const APPLY_CLICK_DEDUP_MS = 5_000;
const MAX_COLD_START = 12;
const MAX_LOCKED_TEASERS = 3;
// How many ranked matches the Browse Jobs feed loads at once. The headline "Nix
// matches" count is the true total (counted in the DB, not loaded), so a seeker
// sees the real number without us shipping thousands of populated job rows.
const RECOMMENDED_DISPLAY_LIMIT = 100;
// The facet rows for a candidate are filter-independent, so cache them briefly:
// rapid filter changes then derive the count + every facet in memory with no
// repeated database join. Invalidated whenever the candidate's matches change.
const FACET_ROW_TTL_MS = 45_000;

const NIX_SEARCH_METRIC_CATEGORY = "annix-orbit-nix-seeker";
const NIX_SEARCH_METRIC_OPERATION = "job-search";
const NIX_SEARCH_FALLBACK_MS = 90_000;

export interface SeekerJobMatch {
  matchId: number;
  candidateId: number;
  externalJobId: number;
  overallScore: number;
  similarityScore: number;
  structuredScore: number;
  matchDetails: MatchDetails | null;
  locked: boolean;
  lockedSourceName: string | null;
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
    canonicalCategory: string | null;
    sourceUrl: string | null;
    postedAt: string | null;
    expiresAt: string | null;
    sourceProvider: string | null;
    sourceName: string | null;
  };
}

export interface AdminSeekerSummary {
  id: number;
  name: string | null;
  email: string | null;
  matchTier: string;
  matchScore: number | null;
  status: string;
  hasCv: boolean;
  lastActiveAt: string | null;
  createdAt: string | null;
}

export interface AdminSeekerDocument {
  id: number;
  kind: string;
  originalFilename: string;
  sizeBytes: number;
  label: string | null;
  uploadedAt: string | null;
  downloadUrl: string;
  isCv: boolean;
}

export interface AdminSeekerDetail extends AdminSeekerSummary {
  popiaConsent: boolean;
  popiaConsentedAt: string | null;
  dismissWarningAcknowledgedAt: string | null;
  workProfile: unknown;
  cv: {
    summary: string | null;
    experienceYears: number | null;
    location: string | null;
    skills: string[];
    education: string[];
    certifications: string[];
    professionalRegistrations: string[];
    saQualifications: string[];
  };
  matchAnalysis: {
    overallScore: number;
    recommendation: string;
    reasoning: string | null;
  } | null;
  documents: AdminSeekerDocument[];
  references: Array<{
    id: number;
    name: string;
    email: string;
    relationship: string | null;
    status: string;
    rating: number | null;
    submittedAt: string | null;
  }>;
  stats: { totalMatches: number; matchesLast7Days: number };
  activity: Array<{ day: string; count: number }>;
}

export interface SeekerCvBuildQuota {
  unlimited: boolean;
  allowance: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
}

export interface SeekerEntitlementsResult {
  tier: string;
  label: string;
  features: OrbitTierFeatures;
  cvBuilds: SeekerCvBuildQuota;
}

@Injectable()
export class SeekerJobFeedService {
  private readonly logger = new Logger(SeekerJobFeedService.name);
  private readonly lastRematchByCandidate = new Map<number, number>();
  private readonly facetRowCache = new Map<string, { rows: RecommendedFacetRow[]; at: number }>();

  private async cachedFacetRows(candidateIds: number[]): Promise<RecommendedFacetRow[]> {
    const key = [...candidateIds].sort((a, b) => a - b).join(",");
    const cached = this.facetRowCache.get(key);
    const now = nowMillis();
    if (cached && now - cached.at < FACET_ROW_TTL_MS) {
      return cached.rows;
    }
    const rows = await this.matchRepo.facetRowsForCandidates(candidateIds);
    this.facetRowCache.set(key, { rows, at: now });
    return rows;
  }

  private invalidateFacetCache(): void {
    this.facetRowCache.clear();
  }

  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly sourceRepo: JobMarketSourceRepository,
    private readonly matchRepo: CandidateJobMatchRepository,
    private readonly applyClickRepo: SeekerApplyClickRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly muteRepo: SeekerMuteRepository,
    private readonly matchingService: CandidateJobMatchingService,
    private readonly metrics: ExtractionMetricService,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly documentRepo: AnnixOrbitIndividualDocumentRepository,
    private readonly userRepo: UserRepository,
    private readonly referenceRepo: CandidateReferenceRepository,
    private readonly tierCapabilityRepo: OrbitTierCapabilityRepository,
    private readonly usageCounterRepo: SeekerUsageCounterRepository,
    private readonly dismissReasonRepo: OrbitDismissReasonRepository,
    private readonly countriesService: JobMarketCountriesService,
    @Inject(forwardRef(() => CvNotificationService))
    private readonly notificationService: CvNotificationService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  // Union of the seeker's candidates' target countries; defaults to South Africa.
  async enabledJobCountries(): Promise<string[]> {
    return this.countriesService.enabledCountries();
  }

  private async targetCountriesForCandidates(candidates: Candidate[]): Promise<string[]> {
    const set = new Set<string>();
    candidates.forEach((c) => (c.targetCountries ?? []).forEach((code) => set.add(code)));
    const base = set.size > 0 ? [...set] : ["za"];
    const enabled = await this.countriesService.enabledCountries();
    const filtered = base.filter((code) => enabled.includes(code));
    return filtered.length > 0 ? filtered : enabled;
  }

  private effectiveTier(candidates: Candidate[]): string {
    const nowMs = nowMillis();
    const withTrial = candidates.find(
      (c) => c.trialTier != null && c.trialEndsAt != null && c.trialEndsAt.getTime() > nowMs,
    );
    if (withTrial?.trialTier) {
      return withTrial.trialTier;
    }
    const first = candidates[0];
    return first?.matchTier ?? "soft";
  }

  private async quotaForSeeker(
    email: string | null,
    candidates: Candidate[],
  ): Promise<{
    unlimited: boolean;
    allowance: number | null;
    used: number;
    remaining: number | null;
    resetsAt: string;
  }> {
    const resetsAt = DateTime.now().endOf("month").toISO() ?? "";
    const selectedTier = await this.selectedTierForEmail(email);
    const tier = selectedTier ?? this.effectiveTier(candidates);
    const capability = await this.tierCapabilityRepo.findByTier(tier);
    const allowance = capability ? capability.monthlyNixRuns : null;
    if (allowance == null) {
      return { unlimited: true, allowance: null, used: 0, remaining: null, resetsAt };
    }
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    const monthKey = DateTime.now().toFormat("yyyy-LL");
    const used = await this.usageCounterRepo.getCount(
      normalizedEmail,
      HELP_FIND_JOB_OPERATION,
      monthKey,
    );
    const remaining = Math.max(0, allowance - used);
    return { unlimited: false, allowance, used, remaining, resetsAt };
  }

  async cvBuildQuotaForSeeker(email: string | null): Promise<SeekerCvBuildQuota> {
    const resetsAt = DateTime.now().endOf("month").toISO() ?? "";
    const candidates = await this.candidatesForSeeker(email);
    const selectedTier = await this.selectedTierForEmail(email);
    const tier = selectedTier ?? this.effectiveTier(candidates);
    const capability = await this.tierCapabilityRepo.findByTier(tier);
    const allowance = capability ? capability.monthlyCvBuilds : null;
    if (allowance == null) {
      return { unlimited: true, allowance: null, used: 0, remaining: null, resetsAt };
    }
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    const monthKey = DateTime.now().toFormat("yyyy-LL");
    const used = await this.usageCounterRepo.getCount(
      normalizedEmail,
      CV_BUILD_OPERATION,
      monthKey,
    );
    return {
      unlimited: false,
      allowance,
      used,
      remaining: Math.max(0, allowance - used),
      resetsAt,
    };
  }

  async recordCvBuild(email: string | null): Promise<void> {
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    await this.usageCounterRepo.increment(
      normalizedEmail,
      CV_BUILD_OPERATION,
      DateTime.now().toFormat("yyyy-LL"),
    );
  }

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
    const existing = await this.muteRepo.findByCandidateAndCompany(target.id, trimmed);
    if (existing) {
      return { created: false, mute: existing };
    }
    const created = await this.muteRepo.create({
      candidateId: target.id,
      companyName: trimmed,
      category: null,
    });
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
    const existing = await this.muteRepo.findByCandidateAndCategory(target.id, trimmed);
    if (existing) {
      return { created: false, mute: existing };
    }
    const created = await this.muteRepo.create({
      candidateId: target.id,
      companyName: null,
      category: trimmed,
    });
    return { created: true, mute: created };
  }

  async mutesForSeeker(email: string | null): Promise<SeekerMute[]> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return [];
    }
    const candidateIds = candidates.map((c) => c.id);
    return this.muteRepo.listForCandidates(candidateIds);
  }

  async revokeMuteForSeeker(email: string | null, muteId: number): Promise<boolean> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) return false;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const found = await this.muteRepo.findById(muteId);
    if (!found || !candidateIds.has(found.candidateId)) {
      return false;
    }
    await this.muteRepo.deleteById(found.id);
    return true;
  }

  private async applyMuteFilters<T>(
    candidateIds: number[],
    items: T[],
    selector: (item: T) => { company: string | null; category: string | null },
  ): Promise<T[]> {
    if (items.length === 0 || candidateIds.length === 0) return items;
    const mutes = await this.muteRepo.listForCandidates(candidateIds);
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
    return this.candidateRepo.findByEmail(email);
  }

  private async selectedTierForEmail(email: string | null): Promise<string | null> {
    if (!email) return null;
    const user = await this.userRepo.findOneByEmailCaseInsensitive(email);
    if (!user) return null;
    const profile = await this.profileRepo.findByUserId(user.id);
    const selected = profile?.selectedTier;
    return selected && isMatchTier(selected) ? selected : null;
  }

  async entitlementsForSeeker(email: string | null): Promise<SeekerEntitlementsResult> {
    const candidates = await this.candidatesForSeeker(email);
    const selectedTier = await this.selectedTierForEmail(email);
    const tier = selectedTier ?? this.effectiveTier(candidates);
    const capability = await this.tierCapabilityRepo.findByTier(tier);
    const cvBuilds = await this.cvBuildQuotaForSeeker(email);
    if (!capability) {
      return { tier, label: tier, features: { ...DEFAULT_TIER_FEATURES }, cvBuilds };
    }
    return {
      tier: capability.tier,
      label: capability.label,
      features: { ...DEFAULT_TIER_FEATURES, ...capability.features },
      cvBuilds,
    };
  }

  async selectPlanForSeeker(email: string | null, tier: string): Promise<SeekerEntitlementsResult> {
    if (!isMatchTier(tier)) {
      throw new BadRequestException(`Invalid plan: ${tier}`);
    }
    await this.setMatchTierForSeeker(email, tier);
    if (email) {
      const user = await this.userRepo.findOneByEmailCaseInsensitive(email);
      if (user) {
        const profile = await this.profileRepo.findByUserId(user.id);
        if (profile) {
          profile.selectedTier = tier;
          await this.profileRepo.save(profile);
        }
      }
    }
    return this.entitlementsForSeeker(email);
  }

  // Facet options for the filter dropdowns: only the provinces, cities, categories
  // and sources that actually have a match in the seeker's set. Each facet is
  // computed with every OTHER active filter applied but not its own, so a chosen
  // value never collapses its own dropdown and empty options never appear.
  async recommendedFacetsForSeeker(
    email: string | null,
    options: { filters?: RecommendedJobFilters | null } = {},
  ): Promise<{
    regions: string[];
    provinces: string[];
    cities: string[];
    categories: Array<{ key: string; label: string }>;
    sources: string[];
  }> {
    const empty = { regions: [], provinces: [], cities: [], categories: [], sources: [] };
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) return empty;

    const rows = await this.cachedFacetRows(candidates.map((c) => c.id));
    if (rows.length === 0) return empty;

    const sourceList = await this.sourceRepo.findManyWhere({
      companyId: null,
    } as Partial<JobMarketSource>);
    const providerBySourceId = new Map(sourceList.map((s) => [s.id, s.provider]));

    // Provider name -> source ids so the source dimension filters the same field
    // the rows carry; every facet then excludes its own dimension. The target-
    // country gate is always applied so a seeker never facets outside their scope.
    const targetCountries = await this.targetCountriesForCandidates(candidates);
    const rf = (await this.resolveRepoFilters(options.filters ?? null)) ?? {};
    const ff = { ...rf, targetCountries };

    const regionValues = distinctPassing(rows, ff, new Set(["region"]), (r) => r.country);
    const regions = targetCountries.filter((c) => regionValues.has(c));

    const provinceValues = distinctPassing(
      rows,
      ff,
      new Set(["province", "city"]),
      (r) => r.canonicalProvince,
    );
    const provinces = SA_PROVINCES.filter((p) => provinceValues.has(p));

    const cityValues = rf.province
      ? distinctPassing(rows, ff, new Set(["city"]), (r) => r.canonicalCity)
      : new Set<string>();
    const orderedCities = citiesForProvince(rf.province ?? null);
    const cities = [
      ...orderedCities.filter((c) => cityValues.has(c)),
      ...[...cityValues].filter((c) => !orderedCities.includes(c)).sort(),
    ];

    const categoryValues = distinctPassing(
      rows,
      ff,
      new Set(["category"]),
      (r) => r.canonicalCategory,
    );
    const categories = JOB_CATEGORIES.filter((c) => categoryValues.has(c.key)).map((c) => ({
      key: c.key,
      label: c.label,
    }));

    const sourceValues = distinctPassing(rows, ff, new Set(["source"]), (r) =>
      r.sourceId != null ? (providerBySourceId.get(r.sourceId) ?? null) : null,
    );

    return { regions, provinces, cities, categories, sources: [...sourceValues].sort() };
  }

  // Every active platform job source, so the seeker's "source" filter lists all
  // of them — not just the ones that happen to appear in the loaded matches.
  async activeSourceProviders(): Promise<string[]> {
    const sources = await this.sourceRepo.findManyWhere({
      companyId: null,
    } as Partial<JobMarketSource>);
    const enabled = sources.filter((source) => source.enabled);
    return [...new Set(enabled.map((source) => source.provider))].sort();
  }

  async targetCountriesForSeeker(email: string | null): Promise<{ targetCountries: string[] }> {
    const candidates = await this.candidatesForSeeker(email);
    return { targetCountries: await this.targetCountriesForCandidates(candidates) };
  }

  async setTargetCountriesForSeeker(
    email: string | null,
    countries: string[],
  ): Promise<{ targetCountries: string[] }> {
    const normalized = [
      ...new Set(countries.map((c) => c.trim().toLowerCase()).filter((c) => c.length > 0)),
    ];
    const effective = normalized.length > 0 ? normalized : ["za"];
    const candidates = await this.candidatesForSeeker(email);
    await Promise.all(
      candidates.map((c) => this.candidateRepo.updateTargetCountries(c.id, effective)),
    );
    this.invalidateFacetCache();
    return { targetCountries: effective };
  }

  async listSeekers(params: {
    search?: string | null;
    page?: number;
    limit?: number;
  }): Promise<{ seekers: AdminSeekerSummary[]; total: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const search = params.search ? params.search.trim() : "";
    const [rows, total] = await this.candidateRepo.listNonFixture({
      search: search || null,
      skip: (page - 1) * limit,
      limit,
    });
    const seekers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      matchTier: row.matchTier,
      matchScore: row.matchScore,
      status: row.status,
      hasCv: Boolean(row.cvFilePath),
      lastActiveAt: row.lastActiveAt ? row.lastActiveAt.toISOString() : null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    }));
    return { seekers, total };
  }

  async seekerDetail(id: number): Promise<AdminSeekerDetail> {
    const candidate = await this.candidateRepo.findById(id);
    if (!candidate) {
      throw new NotFoundException("Seeker not found");
    }
    const email = candidate.email;

    const documents = await this.documentsForSeekerEmail(email);
    const references = await this.referenceRepo.findByCandidate(id);
    const activitySinceKey = DateTime.now().minus({ days: 365 }).toFormat("yyyy-LL-dd");
    const activity = email
      ? await this.candidateRepo.seekerActivityDaysForEmail(email, activitySinceKey)
      : [];

    const candidateIds = [candidate.id];
    const totalMatches = await this.matchRepo.countActiveForCandidates(candidateIds);
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const matchesLast7Days = await this.matchRepo.countActiveForCandidatesSince(
      candidateIds,
      sevenDaysAgo,
    );

    const seekerUser = email ? await this.userRepo.findOneByEmailCaseInsensitive(email) : null;
    const seekerProfile = seekerUser ? await this.profileRepo.findByUserId(seekerUser.id) : null;
    const dismissWarningAcknowledgedAt = seekerProfile?.dismissWarningAcknowledgedAt
      ? seekerProfile.dismissWarningAcknowledgedAt.toISOString()
      : null;

    const extracted = candidate.extractedData;
    const analysis = candidate.matchAnalysis;

    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      matchTier: candidate.matchTier,
      matchScore: candidate.matchScore,
      status: candidate.status,
      hasCv: Boolean(candidate.cvFilePath),
      lastActiveAt: candidate.lastActiveAt ? candidate.lastActiveAt.toISOString() : null,
      createdAt: candidate.createdAt ? candidate.createdAt.toISOString() : null,
      popiaConsent: candidate.popiaConsent,
      popiaConsentedAt: candidate.popiaConsentedAt
        ? candidate.popiaConsentedAt.toISOString()
        : null,
      dismissWarningAcknowledgedAt,
      workProfile: candidate.workProfile,
      cv: {
        summary: extracted?.summary ?? null,
        experienceYears: extracted?.experienceYears ?? null,
        location: extracted?.location ?? null,
        skills: extracted?.skills ?? [],
        education: extracted?.education ?? [],
        certifications: extracted?.certifications ?? [],
        professionalRegistrations: extracted?.professionalRegistrations ?? [],
        saQualifications: extracted?.saQualifications ?? [],
      },
      matchAnalysis: analysis
        ? {
            overallScore: analysis.overallScore,
            recommendation: analysis.recommendation,
            reasoning: analysis.reasoning,
          }
        : null,
      documents,
      references: references.map((ref) => ({
        id: ref.id,
        name: ref.name,
        email: ref.email,
        relationship: ref.relationship,
        status: ref.status,
        rating: ref.feedbackRating,
        submittedAt: ref.feedbackSubmittedAt ? ref.feedbackSubmittedAt.toISOString() : null,
      })),
      stats: { totalMatches, matchesLast7Days },
      activity,
    };
  }

  private async documentsForSeekerEmail(email: string | null): Promise<AdminSeekerDocument[]> {
    if (!email) return [];
    const user = await this.userRepo.findOneByEmailCaseInsensitive(email);
    if (!user) return [];
    const profile = await this.profileRepo.findByUserId(user.id);
    if (!profile) return [];
    const allDocs = await this.documentRepo.findByProfileOrdered(profile.id);
    // Phone-photo credentials are hidden from employers/admins until the seeker
    // uploads a clear scan (needsClearScan flips false then).
    const docs = allDocs.filter(
      (doc) => !(doc.isPhotoCapture === true && doc.needsClearScan === true),
    );
    return Promise.all(
      docs.map(async (doc) => {
        const isCv = doc.kind === IndividualDocumentKind.CV;
        const downloadUrl = await this.storageService.presignedUrl(doc.filePath, 3600);
        return {
          id: doc.id,
          kind: doc.kind,
          originalFilename: doc.originalFilename,
          sizeBytes: doc.sizeBytes,
          label: doc.label,
          uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : null,
          downloadUrl,
          isCv,
        };
      }),
    );
  }

  async consentStatusForSeeker(email: string | null): Promise<{
    hasCandidate: boolean;
    consented: boolean;
    consentedAt: string | null;
    quota: {
      unlimited: boolean;
      allowance: number | null;
      used: number;
      remaining: number | null;
      resetsAt: string;
    } | null;
  }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { hasCandidate: false, consented: false, consentedAt: null, quota: null };
    }
    const consented = candidates.every((c) => c.popiaConsent);
    const consentedAt = candidates
      .map((c) => c.popiaConsentedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const quota = await this.quotaForSeeker(email, candidates);
    return {
      hasCandidate: true,
      consented,
      consentedAt: consentedAt ? consentedAt.toISOString() : null,
      quota,
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
    await this.candidateRepo.grantMatchingConsent(candidateIds, consentedAt);
    return { candidatesAffected: candidateIds.length };
  }

  // Translate a provider-name filter into the source ids that back it, so the
  // count and the list filter on the same job field (sourceId).
  private async resolveRepoFilters(
    filters: RecommendedJobFilters | null,
  ): Promise<RecommendedJobFilters | null> {
    if (!filters?.provider) return filters;
    const sources = await this.sourceRepo.findManyWhere({
      companyId: null,
    } as Partial<JobMarketSource>);
    const ids = sources.filter((s) => s.provider === filters.provider).map((s) => s.id);
    return { ...filters, sourceIds: ids.length > 0 ? ids : [-1] };
  }

  async recommendedForSeeker(
    email: string | null,
    options: { includeDismissed?: boolean; filters?: RecommendedJobFilters | null } = {},
  ): Promise<{ matches: SeekerJobMatch[]; candidateIds: number[]; total: number }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { matches: [], candidateIds: [], total: 0 };
    }

    // The chosen plan is authoritative for match allowance. Self-heal any
    // candidate whose stored matchTier has drifted from it so the matching,
    // storage and stats paths all agree — this keeps every package change wired
    // through, even for accounts that selected a plan before this sync existed.
    const selectedTier = await this.selectedTierForEmail(email);
    if (selectedTier) {
      const stale = candidates.filter((candidate) => candidate.matchTier !== selectedTier);
      if (stale.length > 0) {
        await Promise.all(
          stale.map((candidate) => this.candidateRepo.updateMatchTier(candidate.id, selectedTier)),
        );
        stale.forEach((candidate) => {
          candidate.matchTier = selectedTier;
        });
      }
    }

    // The "source" filter is a provider name; resolve it to the source ids that
    // back it so both the count and the list filter on the same job field.
    const repoFilters = await this.resolveRepoFilters(options.filters ?? null);

    // Country gate: the seeker's target countries, narrowed to one when the Region
    // dropdown is used. UK jobs only reach seekers who opted into "gb".
    const targetCountries = await this.targetCountriesForCandidates(candidates);
    const region = options.filters?.region ?? null;
    const effectiveCountries = region ? [region] : targetCountries;
    const displayFilters: RecommendedJobFilters = {
      ...(repoFilters ?? {}),
      countries: effectiveCountries,
    };

    // The true count of matching jobs, counted in memory from cached rows. The plan
    // caps how many a seeker may see (null = unlimited), applied to both the headline
    // total and the loaded page size.
    const candidateIds = candidates.map((c) => c.id);
    const capTier = selectedTier ?? this.effectiveTier(candidates);
    const capability = await this.tierCapabilityRepo.findByTier(capTier);
    const maxResults = capability ? capability.maxJobResults : null;
    const facetRows = await this.cachedFacetRows(candidateIds);
    const rawTotal = countMatchingRows(facetRows, {
      ...(repoFilters ?? {}),
      targetCountries,
      region,
    });
    const total = maxResults == null ? rawTotal : Math.min(rawTotal, maxResults);
    const displayLimit =
      maxResults == null
        ? RECOMMENDED_DISPLAY_LIMIT
        : Math.min(RECOMMENDED_DISPLAY_LIMIT, maxResults);

    const perCandidateLists = await Promise.all(
      candidates.map((candidate) =>
        this.matchingService.recommendedJobsForCandidate(candidate.id, {
          includeDismissed: options.includeDismissed ?? false,
          filters: displayFilters,
          tierOverride: selectedTier,
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
      return { matches: [], candidateIds, total };
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

    // Per-source tier gating: a source's jobs only show to seekers whose match-
    // tier is in the source's visibleTiers (null/empty = visible to all). Use the
    // seeker's highest tier across their candidates.
    const tierRank: Record<MatchTier, number> = { soft: 0, medium: 1, hard: 2 };
    const seekerTier = candidates.reduce<MatchTier>((best, candidate) => {
      const tier = isMatchTier(candidate.matchTier) ? candidate.matchTier : DEFAULT_MATCH_TIER;
      return tierRank[tier] > tierRank[best] ? tier : best;
    }, DEFAULT_MATCH_TIER);
    const sourceVisibleToSeeker = (sourceId: number): boolean => {
      const source = sourceById.get(sourceId);
      const tiers = source?.visibleTiers;
      if (!tiers || tiers.length === 0) return true;
      return tiers.includes(seekerTier);
    };

    const bestByJob = new Map<number, CandidateJobMatch & { externalJob: ExternalJob }>();
    const lockedByJob = new Map<number, CandidateJobMatch & { externalJob: ExternalJob }>();
    flat.forEach((match) => {
      const jobId = match.externalJobId;
      const target = sourceVisibleToSeeker(match.externalJob.sourceId) ? bestByJob : lockedByJob;
      const existing = target.get(jobId);
      if (!existing || match.overallScore > existing.overallScore) {
        target.set(jobId, match);
      }
    });
    // A job available from any visible source is never shown as locked.
    bestByJob.forEach((_match, jobId) => lockedByJob.delete(jobId));

    const sorted = [...bestByJob.values()]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, displayLimit);
    const lockedSorted = [...lockedByJob.values()]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, MAX_LOCKED_TEASERS);

    const matches = [
      ...sorted.map((match) =>
        toSeekerMatch(match, sourceById.get(match.externalJob.sourceId) ?? null, false),
      ),
      ...lockedSorted.map((match) =>
        toSeekerMatch(match, sourceById.get(match.externalJob.sourceId) ?? null, true),
      ),
    ];
    return { matches, candidateIds, total };
  }

  async nixSearchEstimateMs(): Promise<number> {
    const stats = await this.metrics.stats(NIX_SEARCH_METRIC_CATEGORY, NIX_SEARCH_METRIC_OPERATION);
    const learned = stats.averageMs;
    return learned != null && learned > 0 ? Math.round(learned) : NIX_SEARCH_FALLBACK_MS;
  }

  async rematchForSeeker(
    email: string | null,
    userId: number | null,
  ): Promise<
    | { triggered: true; rematchedCandidates: number[] }
    | { triggered: false; reason: "no-candidate" }
    | { triggered: false; reason: "rate-limited"; retryAfterSeconds: number }
    | {
        triggered: false;
        reason: "quota-exceeded";
        used: number;
        allowance: number;
        resetsAt: string;
      }
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

    const quota = await this.quotaForSeeker(email, candidates);
    if (!quota.unlimited && quota.allowance != null && quota.used >= quota.allowance) {
      return {
        triggered: false,
        reason: "quota-exceeded",
        used: quota.used,
        allowance: quota.allowance,
        resetsAt: quota.resetsAt,
      };
    }

    candidates.forEach((c) => this.lastRematchByCandidate.set(c.id, now));

    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    void Promise.all(
      candidates.map((candidate) =>
        this.metrics
          .time(NIX_SEARCH_METRIC_CATEGORY, NIX_SEARCH_METRIC_OPERATION, () =>
            this.matchingService.matchCandidateToJobs(candidate.id),
          )
          .then((matches) => ({ ran: true, matches }))
          .catch((err) => {
            this.logger.warn(
              `Manual rematch failed for candidate ${candidate.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
            return { ran: false, matches: [] as CandidateJobMatch[] };
          }),
      ),
    ).then(async (results) => {
      const ranSuccessfully = results.some((r) => r.ran);
      if (!ranSuccessfully) {
        candidates.forEach((c) => this.lastRematchByCandidate.delete(c.id));
        return;
      }
      if (!quota.unlimited) {
        await this.usageCounterRepo.increment(
          normalizedEmail,
          HELP_FIND_JOB_OPERATION,
          DateTime.now().toFormat("yyyy-LL"),
        );
      }
      const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
      await this.notifySearchComplete(userId, totalMatches);
    });

    return { triggered: true, rematchedCandidates: candidates.map((c) => c.id) };
  }

  private async notifySearchComplete(userId: number | null, totalMatches: number): Promise<void> {
    if (userId == null) return;
    const body =
      totalMatches > 0
        ? `Nix matched ${totalMatches} role${totalMatches === 1 ? "" : "s"} to your CV. Tap to view your matches.`
        : "Nix finished searching — tap to view your job matches.";
    await this.notificationService
      .sendPushToUser(userId, {
        title: "Your job matches are ready",
        body,
        tag: "orbit-nix-search-complete",
        data: { url: "/annix/orbit/seeker/jobs" },
      })
      .catch((err) =>
        this.logger.warn(
          `Failed to send search-complete push to user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }

  async withdrawMatchingForSeeker(
    email: string | null,
  ): Promise<{ candidatesAffected: number; matchesCleared: number }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { candidatesAffected: 0, matchesCleared: 0 };
    }
    const candidateIds = candidates.map((c) => c.id);

    const matchesCleared = await this.matchRepo.deleteForCandidates(candidateIds);

    await this.candidateRepo.withdrawMatching(candidateIds);
    this.invalidateFacetCache();

    candidateIds.forEach((id) => this.lastRematchByCandidate.delete(id));

    return {
      candidatesAffected: candidateIds.length,
      matchesCleared,
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

    const totalMatches = await this.matchRepo.countActiveForCandidates(candidateIds);

    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();
    const matchesLast7Days = await this.matchRepo.countActiveForCandidatesSince(
      candidateIds,
      sevenDaysAgo,
    );

    return { hasCandidate: true, totalMatches, matchesLast7Days };
  }

  async dismissForSeeker(
    email: string | null,
    matchId: number,
    reason?: string | null,
  ): Promise<boolean> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) return false;
    const candidateIds = new Set(candidates.map((c) => c.id));

    const found = await this.matchRepo.findById(matchId);
    if (!found || !candidateIds.has(found.candidateId)) {
      return false;
    }
    await this.matchingService.dismissMatch(matchId, reason ?? null);
    this.invalidateFacetCache();

    // Deterministic filter, driven by the admin-configured reason: a reason
    // with muteAction "company"/"category" mutes that job's company/category.
    if (reason) {
      const reasonRow = await this.dismissReasonRepo.findByCode(reason);
      const muteAction = reasonRow ? reasonRow.muteAction : null;
      if (muteAction === "company" || muteAction === "category") {
        const job = await this.externalJobRepo.findById(found.externalJobId);
        if (job) {
          if (muteAction === "company" && job.company) {
            await this.muteCompanyForSeeker(email, job.company);
          } else if (muteAction === "category" && job.category) {
            await this.muteCategoryForSeeker(email, job.category);
          }
        }
      }
    }
    return true;
  }

  async reportJobDelisted(
    email: string | null,
    externalJobId: number,
  ): Promise<{ reported: boolean }> {
    const job = await this.externalJobRepo.findById(externalJobId);
    if (!job) return { reported: false };

    await this.externalJobRepo.reportDelist(
      externalJobId,
      email ?? null,
      DateTime.now().toJSDate(),
    );

    const candidates = await this.candidatesForSeeker(email);
    await Promise.all(
      candidates.map(async (candidate) => {
        const match = await this.matchRepo.findByCandidateAndJob(candidate.id, externalJobId);
        if (match) {
          await this.matchingService.dismissMatch(match.id, "reported-delisted");
        }
      }),
    );
    return { reported: true };
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

    let jobs = await this.externalJobRepo.coldStartJobs([...locationTokens], MAX_COLD_START * 2);

    if (jobs.length === 0 && locationTokens.size > 0) {
      const fallback = await this.externalJobRepo.coldStartFallbackJobs(MAX_COLD_START * 2);
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
      const match = await this.matchRepo.findById(input.matchId);
      if (!match || !candidateIds.has(match.candidateId)) {
        return { recorded: false, clickId: null };
      }
      candidateId = match.candidateId;
    } else {
      candidateId = candidates[0].id;
    }

    if (input.externalJobId !== null && candidateId !== null) {
      const cutoff = fromJSDate(new Date(nowMillis() - APPLY_CLICK_DEDUP_MS)).toJSDate();
      const existing = await this.applyClickRepo.findRecentClick(
        candidateId,
        input.externalJobId,
        cutoff,
      );
      if (existing) {
        return { recorded: false, clickId: existing.id };
      }
    }

    const saved = await this.applyClickRepo.create({
      candidateId,
      externalJobId: input.externalJobId,
      matchId: input.matchId,
      sourceUrl: input.sourceUrl,
    });
    return { recorded: true, clickId: saved.id };
  }

  async matchTierForSeeker(email: string | null): Promise<{
    hasCandidate: boolean;
    matchTier: MatchTier;
    targetCategories: string[];
    candidateIds: number[];
  }> {
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return {
        hasCandidate: false,
        matchTier: DEFAULT_MATCH_TIER,
        targetCategories: [],
        candidateIds: [],
      };
    }
    const primary = candidates[0];
    const matchTier = isMatchTier(primary.matchTier) ? primary.matchTier : DEFAULT_MATCH_TIER;
    return {
      hasCandidate: true,
      matchTier,
      targetCategories: primary.targetCategories ?? [],
      candidateIds: candidates.map((c) => c.id),
    };
  }

  async setMatchTierForSeeker(
    email: string | null,
    tier: string,
  ): Promise<{ candidatesAffected: number; matchTier: MatchTier }> {
    if (!isMatchTier(tier)) {
      throw new BadRequestException(`Invalid match tier: ${tier}`);
    }
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { candidatesAffected: 0, matchTier: tier };
    }
    await Promise.all(
      candidates.map((candidate) => this.candidateRepo.updateMatchTier(candidate.id, tier)),
    );
    this.logger.log(`Set match tier "${tier}" for ${candidates.length} candidate(s) of ${email}`);
    return { candidatesAffected: candidates.length, matchTier: tier };
  }

  async inviteSeekerTrial(
    email: string | null,
    tier: string,
    freeDays: number,
  ): Promise<{ candidatesAffected: number; trialEndsAt: string | null }> {
    if (!isMatchTier(tier)) {
      throw new BadRequestException(`Invalid tier: ${tier}`);
    }
    if (!Number.isFinite(freeDays) || freeDays <= 0) {
      throw new BadRequestException("Free days must be a positive number.");
    }
    const candidates = await this.candidatesForSeeker(email);
    if (candidates.length === 0) {
      return { candidatesAffected: 0, trialEndsAt: null };
    }
    const trialEndsAt = DateTime.now().plus({ days: freeDays }).toJSDate();
    await Promise.all(
      candidates.map((candidate) => this.candidateRepo.setTrial(candidate.id, tier, trialEndsAt)),
    );
    this.logger.log(`Granted "${tier}" trial (${freeDays}d) to ${candidates.length} of ${email}`);
    return { candidatesAffected: candidates.length, trialEndsAt: trialEndsAt.toISOString() };
  }
}

function toSeekerMatch(
  match: CandidateJobMatch & { externalJob: ExternalJob },
  source: JobMarketSource | null,
  locked = false,
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
    locked,
    lockedSourceName: locked ? (source?.name ?? null) : null,
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
      canonicalCategory: job.canonicalCategory,
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
    locked: false,
    lockedSourceName: null,
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
      canonicalCategory: job.canonicalCategory,
      sourceUrl: job.sourceUrl,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
      sourceProvider: source?.provider ?? null,
      sourceName: source?.name ?? null,
    },
  };
}
