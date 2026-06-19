import { CREDENTIAL_LABELS, type CredentialType } from "@annix/product-data/sa-market";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import type { AnnixOrbitTalentCandidate } from "../entities/annix-orbit-talent-candidate.entity";
import { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import { AnnixOrbitTalentCredentialRepository } from "../repositories/annix-orbit-talent-credential.repository";
import { classifyCredentialExpiry, toIsoDate } from "./credential-expiry";
import { parseNixJson } from "./nix-prompts";
import { computeSiteReady, type SiteReadyStatus } from "./site-ready";

const METRIC_CATEGORY = "orbit-recruiter-assist";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_OUTPUT_TOKENS = 512;

function credentialLabel(code: string): string {
  const label = CREDENTIAL_LABELS[code as CredentialType];
  return label ?? code;
}

export interface ComplianceGapResult {
  candidateId: number;
  score: number;
  status: SiteReadyStatus;
  gaps: Array<{ credential: string; status: "expired" | "expiring"; expiresAt: string | null }>;
  summary: string;
  suggestions: string[];
}

export interface RecruiterSearchCriteria {
  roleKeywords: string[];
  skillKeywords: string[];
  province: string | null;
  city: string | null;
  availabilityNote: string | null;
  requireSiteReady: boolean;
  limit: number;
}

export interface RecruiterSearchCandidate {
  candidateId: number;
  fullName: string;
  currentRole: string | null;
  location: string | null;
  availability: string | null;
  siteReadyScore: number;
  siteReadyStatus: SiteReadyStatus;
  matchReason: string;
}

export interface RecruiterSearchResult {
  interpretation: string;
  criteria: RecruiterSearchCriteria;
  summary: string;
  candidates: RecruiterSearchCandidate[];
}

@Injectable()
export class AnnixOrbitRecruiterAssistantService {
  private readonly logger = new Logger(AnnixOrbitRecruiterAssistantService.name);

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly candidateRepo: AnnixOrbitTalentCandidateRepository,
    private readonly credentialRepo: AnnixOrbitTalentCredentialRepository,
    private readonly metrics: ExtractionMetricService,
  ) {}

  private today(): string {
    return DateTime.now().toISODate() ?? new Date().toISOString().slice(0, 10);
  }

  // AI-narrated compliance gap analysis. The gaps are computed
  // deterministically from the passport; the model only phrases
  // recruiter-facing advice from the supplied facts (no invention).
  async complianceGapAnalysis(
    candidateId: number,
    companyId: number,
  ): Promise<ComplianceGapResult> {
    const candidate = await this.candidateRepo.findByIdForCompany(candidateId, companyId);
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    const credentials = await this.credentialRepo.findByCandidate(candidateId);
    const today = this.today();
    const siteReady = computeSiteReady(credentials, today);
    const gaps = siteReady.gaps.map((gap) => ({
      credential: credentialLabel(gap.credentialType),
      status: gap.status,
      expiresAt: gap.expiresAt,
    }));

    if (credentials.length === 0) {
      return {
        candidateId,
        score: 0,
        status: "no_passport",
        gaps: [],
        summary:
          "No credentials captured yet — build this candidate's Skills Passport to assess site-readiness.",
        suggestions: [
          "Capture the candidate's medical, induction and trade tickets to start the passport.",
        ],
      };
    }

    const ai = await this.metrics.time(METRIC_CATEGORY, "compliance-gap", () =>
      this.narrateGaps(candidate, credentials, gaps, siteReady.score, siteReady.status),
    );

    return {
      candidateId,
      score: siteReady.score,
      status: siteReady.status,
      gaps,
      summary: ai.summary,
      suggestions: ai.suggestions,
    };
  }

  private async narrateGaps(
    candidate: AnnixOrbitTalentCandidate,
    credentials: Array<{
      credentialType: string;
      expiresAt: string | Date | null;
      verified: boolean;
    }>,
    gaps: ComplianceGapResult["gaps"],
    score: number,
    status: SiteReadyStatus,
  ): Promise<{ summary: string; suggestions: string[] }> {
    const today = this.today();
    const held = credentials
      .map((credential) => {
        const credStatus = classifyCredentialExpiry(credential.expiresAt, today);
        const expiry = toIsoDate(credential.expiresAt);
        return `- ${credentialLabel(credential.credentialType)}: ${credStatus}${expiry ? ` (expires ${expiry})` : ""}${credential.verified ? " [verified]" : ""}`;
      })
      .join("\n");
    const role = candidate.currentRole ?? "industrial worker";

    const system =
      "You are an assistant to a South African industrial recruiter. Given a candidate's site-readiness data, write a brief, factual assessment for the recruiter. Use ONLY the supplied facts — never invent credentials or dates. Return STRICT JSON.";
    const prompt = [
      `Candidate role: ${role}`,
      `Site-ready score: ${score}/100 (${status}).`,
      "Credentials held:",
      held,
      gaps.length > 0
        ? `Gaps (expired/expiring): ${gaps.map((g) => `${g.credential} ${g.status}`).join(", ")}`
        : "No expired or expiring credentials.",
      "",
      'Return JSON: { "summary": string (1-2 sentences for the recruiter), "suggestions": string[] (max 4 short, concrete next actions) }',
    ].join("\n");

    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: prompt }],
        system,
        "gemini",
        { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingBudget: 0 },
      );
      const parsed = parseNixJson<{ summary?: string; suggestions?: string[] }>(content);
      const summary =
        typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : this.fallbackSummary(score, status, gaps);
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === "string").slice(0, 4)
        : [];
      return { summary, suggestions };
    } catch (error) {
      this.logger.warn(
        `Compliance gap narration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { summary: this.fallbackSummary(score, status, gaps), suggestions: [] };
    }
  }

  private fallbackSummary(
    score: number,
    status: SiteReadyStatus,
    gaps: ComplianceGapResult["gaps"],
  ): string {
    if (gaps.length === 0) {
      return `Site-ready score ${score}/100 (${status}). No expired or expiring credentials.`;
    }
    const list = gaps.map((g) => `${g.credential} (${g.status})`).join(", ");
    return `Site-ready score ${score}/100 (${status}). Attention needed: ${list}.`;
  }

  // Natural-language talent search over the recruiter's OWN pool.
  // The AI parses intent; retrieval is a structured filter over the
  // recruiter's talent candidates (a private dataset the seeker↔job
  // embedding matcher does not cover), ranked by site-readiness. No new
  // matching engine.
  async findCandidates(
    companyId: number,
    userId: number,
    query: string,
  ): Promise<RecruiterSearchResult> {
    return this.metrics.time(METRIC_CATEGORY, "find-candidates", () =>
      this.runFindCandidates(companyId, userId, query),
    );
  }

  private async runFindCandidates(
    companyId: number,
    userId: number,
    query: string,
  ): Promise<RecruiterSearchResult> {
    const criteria = await this.parseQuery(query);
    const candidates = await this.candidateRepo.findVisibleForCompany(companyId, userId);
    const candidateIds = candidates.map((candidate) => candidate.id);
    const credentials = await this.credentialRepo.listForCandidates(candidateIds);
    const today = this.today();
    const credsByCandidate = credentials.reduce((acc, credential) => {
      const list = acc.get(credential.candidateId);
      if (list) {
        list.push(credential);
      } else {
        acc.set(credential.candidateId, [credential]);
      }
      return acc;
    }, new Map<number, typeof credentials>());

    const keywords = [...criteria.roleKeywords, ...criteria.skillKeywords].map((k) =>
      k.toLowerCase(),
    );

    const matched = candidates
      .filter((candidate) => this.matchesText(candidate, keywords))
      .filter((candidate) => this.matchesLocation(candidate, criteria))
      .map((candidate) => {
        const siteReady = computeSiteReady(credsByCandidate.get(candidate.id) ?? [], today);
        return { candidate, siteReady };
      })
      .filter((entry) => !criteria.requireSiteReady || entry.siteReady.status === "ready")
      .sort((a, b) => b.siteReady.score - a.siteReady.score)
      .slice(0, criteria.limit)
      .map(({ candidate, siteReady }) => this.toSearchCandidate(candidate, siteReady, keywords));

    const interpretation = this.describeCriteria(criteria);
    const summary =
      matched.length === 0
        ? `No candidates in your talent pool match ${interpretation}.`
        : `Found ${matched.length} candidate${matched.length === 1 ? "" : "s"} matching ${interpretation}, ranked by site-readiness.`;

    return { interpretation, criteria, summary, candidates: matched };
  }

  private matchesText(candidate: AnnixOrbitTalentCandidate, keywords: string[]): boolean {
    if (keywords.length === 0) {
      return true;
    }
    const rawSkills = candidate.skills;
    const skills = rawSkills ? rawSkills.join(" ") : "";
    const haystack = `${candidate.fullName} ${candidate.currentRole ?? ""} ${skills}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  }

  private matchesLocation(
    candidate: AnnixOrbitTalentCandidate,
    criteria: RecruiterSearchCriteria,
  ): boolean {
    const province = criteria.province ? criteria.province.toLowerCase() : null;
    const city = criteria.city ? criteria.city.toLowerCase() : null;
    if (!province && !city) {
      return true;
    }
    const candidateProvince = candidate.province ? candidate.province.toLowerCase() : "";
    const candidateCity = candidate.city ? candidate.city.toLowerCase() : "";
    const provinceOk = province ? candidateProvince.includes(province) : true;
    const cityOk = city ? candidateCity.includes(city) : true;
    return provinceOk && cityOk;
  }

  private toSearchCandidate(
    candidate: AnnixOrbitTalentCandidate,
    siteReady: ReturnType<typeof computeSiteReady>,
    keywords: string[],
  ): RecruiterSearchCandidate {
    const locationParts = [candidate.city, candidate.province].filter(
      (part): part is string => !!part,
    );
    const location = locationParts.length > 0 ? locationParts.join(", ") : null;
    const reasons = [
      keywords.length > 0 ? "matches role/skills" : null,
      siteReady.status === "ready" ? "site-ready" : `site-readiness ${siteReady.score}%`,
    ].filter((reason): reason is string => reason !== null);
    return {
      candidateId: candidate.id,
      fullName: candidate.fullName,
      currentRole: candidate.currentRole,
      location,
      availability: candidate.availability,
      siteReadyScore: siteReady.score,
      siteReadyStatus: siteReady.status,
      matchReason: reasons.join(" · "),
    };
  }

  private describeCriteria(criteria: RecruiterSearchCriteria): string {
    const parts: string[] = [];
    const roleSkills = [...criteria.roleKeywords, ...criteria.skillKeywords];
    if (roleSkills.length > 0) {
      parts.push(`"${roleSkills.join(", ")}"`);
    }
    if (criteria.city) parts.push(`in ${criteria.city}`);
    if (criteria.province) parts.push(`in ${criteria.province}`);
    if (criteria.requireSiteReady) parts.push("site-ready");
    if (criteria.availabilityNote) parts.push(`available ${criteria.availabilityNote}`);
    return parts.length > 0 ? parts.join(" ") : "your query";
  }

  private async parseQuery(query: string): Promise<RecruiterSearchCriteria> {
    const system =
      "You convert a South African recruiter's natural-language talent search into structured filters. Return STRICT JSON only.";
    const prompt = [
      `Recruiter request: "${query}"`,
      "",
      "Return JSON with this shape:",
      "{",
      '  "roleKeywords": string[],   // job titles/trades, e.g. ["boilermaker"]',
      '  "skillKeywords": string[],  // skills/tickets mentioned',
      '  "province": string | null,  // SA province if named',
      '  "city": string | null,',
      '  "availabilityNote": string | null,  // e.g. "within 30 days" if mentioned',
      '  "requireSiteReady": boolean,        // true if they ask for site-ready/compliant/ticketed',
      '  "limit": number | null              // how many they asked for',
      "}",
      "Only include what the request states. Use null / [] / false when not mentioned.",
    ].join("\n");

    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: prompt }],
        system,
        "gemini",
        { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingBudget: 0 },
      );
      const parsed = parseNixJson<Partial<RecruiterSearchCriteria>>(content);
      return this.normaliseCriteria(parsed);
    } catch (error) {
      this.logger.warn(
        `Talent query parse failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback: treat the whole query as role keywords.
      return {
        roleKeywords: query.trim() ? [query.trim()] : [],
        skillKeywords: [],
        province: null,
        city: null,
        availabilityNote: null,
        requireSiteReady: /site[- ]?ready|compliant|ticketed/i.test(query),
        limit: DEFAULT_LIMIT,
      };
    }
  }

  private normaliseCriteria(parsed: Partial<RecruiterSearchCriteria>): RecruiterSearchCriteria {
    const stringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
    const rawLimit = parsed.limit;
    const limit =
      typeof rawLimit === "number" && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
    return {
      roleKeywords: stringArray(parsed.roleKeywords),
      skillKeywords: stringArray(parsed.skillKeywords),
      province: typeof parsed.province === "string" ? parsed.province : null,
      city: typeof parsed.city === "string" ? parsed.city : null,
      availabilityNote:
        typeof parsed.availabilityNote === "string" ? parsed.availabilityNote : null,
      requireSiteReady: parsed.requireSiteReady === true,
      limit,
    };
  }
}
