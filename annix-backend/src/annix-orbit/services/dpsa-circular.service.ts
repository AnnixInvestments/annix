import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { chunk } from "es-toolkit/compat";
import { now } from "../../lib/datetime";
import { extractTextFromPdf } from "../../lib/document-extraction";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { normaliseTitleKey } from "../repositories/external-job.repository.mongo";
import { JobMarketSourceRepository } from "../repositories/job-market-source.repository";
import { CandidateJobMatchingService } from "./candidate-job-matching.service";
import { EmbeddingService } from "./embedding.service";

interface DpsaVacancy {
  postNumber: string;
  title: string;
  department: string | null;
  centre: string | null;
  salary: string | null;
  closingDate: string | null;
  enquiries: string | null;
  dutiesSummary: string | null;
  requirementsSummary: string | null;
}

const DPSA_EXTRACTION_PROMPT = `You are extracting vacancy posts from a South African Department of Public Service and Administration (DPSA) Public Service Vacancy Circular (PSVC) PDF.

Return a strict JSON array of objects. Each object MUST use these exact camelCase field names (NOT the uppercase labels from the PDF):

{
  "postNumber":          string,        // e.g. "POST 15/01"
  "title":               string,        // job title, e.g. "Senior Agricultural Economist Ref No: 3/3/1/27/2026"
  "department":          string|null,
  "centre":              string|null,   // location, e.g. "Gauteng: Pretoria"
  "salary":              string|null,   // e.g. "R605 742 per annum (Level 10)"
  "closingDate":         string|null,
  "enquiries":           string|null,
  "dutiesSummary":       string|null,   // 2-3 sentence summary, MAX 400 chars
  "requirementsSummary": string|null    // 2-3 sentence summary, MAX 400 chars
}

Rules:
- Use the exact field names above. Do NOT use "POST NUMBER" or "POST TITLE" — use "postNumber" and "title".
- dutiesSummary and requirementsSummary MUST be summaries, not the verbatim PDF text. Hard cap 400 characters each — full verbatim text causes output truncation.
- Use null for any missing field.
- Trim whitespace; collapse repeated spaces.
- One object per post. Extract every post you can find.
- Do NOT include any prose, markdown, or explanation outside the JSON array.
- The reference number (e.g. "REF NO: 3/3/1/27/2026") is part of the title — keep it in the title string.

The full text of the circular follows.`;

const PSVC_INDEX_URL = "https://www.dpsa.gov.za/newsroom/psvc/";
const DPSA_VACANCIES_PER_CHUNK = 10;
const DPSA_CHUNK_CONCURRENCY = 5;
const DPSA_CHUNK_MAX_OUTPUT_TOKENS = 12_000;

@Injectable()
export class DpsaCircularService {
  private readonly logger = new Logger(DpsaCircularService.name);

  constructor(
    private readonly sourceRepo: JobMarketSourceRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly aiChatService: AiChatService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
  ) {}

  @Cron("0 7 * * 1", { name: "annix-orbit:dpsa-weekly" })
  async pollDpsa(): Promise<void> {
    if (!isAnnixOrbitCronEnabled()) return;
    const source = await this.sourceRepo.findEnabledByProvider(JobSourceProvider.DPSA);
    if (!source) {
      this.logger.warn("No enabled DPSA source configured — skipping weekly poll");
      return;
    }
    try {
      await this.ingestLatestCircular(source);
    } catch (err) {
      this.logger.error(
        `DPSA weekly ingestion failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async ingestLatestCircular(source: JobMarketSource): Promise<{ ingested: number }> {
    const pdfUrl = await this.discoverLatestCircularUrl();
    if (!pdfUrl) {
      this.logger.warn("Could not discover latest PSVC PDF URL");
      return { ingested: 0 };
    }
    return this.ingestFromUrl(source, pdfUrl);
  }

  async ingestFromUrl(source: JobMarketSource, pdfUrl: string): Promise<{ ingested: number }> {
    this.logger.log(`Fetching DPSA PSVC from ${pdfUrl}`);
    const buffer = await this.downloadPdf(pdfUrl);
    const text = await extractTextFromPdf(buffer);
    if (!text || text.length < 200) {
      this.logger.warn(`PSVC PDF text too short (${text.length} chars) — likely scan/OCR needed`);
      return { ingested: 0 };
    }

    const vacancies = await this.extractVacancies(text, pdfUrl);
    if (vacancies.length === 0) {
      this.logger.warn("AI returned 0 vacancies from PSVC — prompt may need tuning");
      return { ingested: 0 };
    }

    const externalIds = vacancies.map((v) => buildPostExternalId(pdfUrl, v.postNumber));
    const existing = await this.externalJobRepo.findByExternalIds(externalIds, source.id);
    const existingIds = new Set(existing.map((e) => e.sourceExternalId));

    const seenAt = now().toJSDate();
    await this.externalJobRepo.stampLastSeenByExternalIds(source.id, externalIds, seenAt);

    const fresh = vacancies.filter(
      (v) => !existingIds.has(buildPostExternalId(pdfUrl, v.postNumber)),
    );

    const saved = await Promise.all(
      fresh.map((v) =>
        this.externalJobRepo.create({
          title: truncate(v.title, 500),
          titleKey: normaliseTitleKey(v.title),
          company: truncate(v.department ?? "Department of Public Service and Administration", 500),
          country: "za",
          locationRaw: truncate(v.centre, 500),
          locationArea: truncate(v.centre, 255),
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: "ZAR",
          description: buildDescription(v),
          extractedSkills: [],
          category: "public-service",
          sourceExternalId: buildPostExternalId(pdfUrl, v.postNumber),
          sourceUrl: pdfUrl,
          postedAt: null,
          expiresAt: null,
          lastSeenAt: seenAt,
          sourceId: source.id,
        }),
      ),
    );

    saved.forEach((job) => {
      this.embeddingService
        .embedExternalJob(job.id)
        .then((embedded) => {
          if (embedded) {
            return this.candidateJobMatchingService.matchJobToCandidates(job.id);
          }
          return null;
        })
        .catch((err) => {
          this.logger.warn(`Failed to embed/match DPSA job ${job.id}: ${err.message}`);
        });
    });

    this.logger.log(`DPSA ingestion: ${saved.length} new posts from ${pdfUrl}`);
    return { ingested: saved.length };
  }

  private async discoverLatestCircularUrl(): Promise<string | null> {
    try {
      const indexResponse = await fetch(PSVC_INDEX_URL);
      if (!indexResponse.ok) return null;
      const indexHtml = await indexResponse.text();

      const circularPageHref = findLatestCircularPageHref(indexHtml);
      if (!circularPageHref) {
        this.logger.warn("PSVC discovery: no circular subpage link on index");
        return null;
      }
      const circularPageUrl = circularPageHref.startsWith("http")
        ? circularPageHref
        : `https://www.dpsa.gov.za${circularPageHref.startsWith("/") ? "" : "/"}${circularPageHref}`;

      const circularResponse = await fetch(circularPageUrl);
      if (!circularResponse.ok) return null;
      const circularHtml = await circularResponse.text();

      const pdfHref = findCombinedCircularPdfHref(circularHtml);
      if (!pdfHref) {
        this.logger.warn(`PSVC discovery: no combined circular PDF on ${circularPageUrl}`);
        return null;
      }
      if (pdfHref.startsWith("http")) return pdfHref;
      if (pdfHref.startsWith("/")) return `https://www.dpsa.gov.za${pdfHref}`;
      return `https://www.dpsa.gov.za/${pdfHref}`;
    } catch (err) {
      this.logger.warn(
        `PSVC discovery failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async downloadPdf(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`PSVC download returned ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async extractVacancies(text: string, pdfUrl: string): Promise<DpsaVacancy[]> {
    const chunks = splitByVacancyBoundary(text, DPSA_VACANCIES_PER_CHUNK);
    if (chunks.length === 0) {
      this.logger.warn("DPSA extraction: no POST markers found in circular text");
      return [];
    }
    this.logger.log(`DPSA extraction: ${chunks.length} chunks from ${pdfUrl}`);

    const batches = chunk(chunks, DPSA_CHUNK_CONCURRENCY);
    const all: DpsaVacancy[] = [];
    let failedChunks = 0;

    await batches.reduce(async (prev, batch) => {
      await prev;
      const results = await Promise.all(
        batch.map(async (chunkText) => {
          try {
            return await this.extractChunk(chunkText, pdfUrl);
          } catch (err) {
            failedChunks += 1;
            this.logger.warn(
              `DPSA chunk extraction failed: ${err instanceof Error ? err.message : String(err)}`,
            );
            return [] as DpsaVacancy[];
          }
        }),
      );
      results.forEach((r) => all.push(...r));
    }, Promise.resolve());

    if (failedChunks > 0) {
      this.logger.warn(
        `DPSA extraction: ${failedChunks}/${chunks.length} chunks failed — ingesting ${all.length} from the rest`,
      );
    }

    const seen = new Set<string>();
    return all.filter((v) => {
      if (!v?.postNumber || !v?.title) return false;
      if (seen.has(v.postNumber)) return false;
      seen.add(v.postNumber);
      return true;
    });
  }

  private async extractChunk(chunkText: string, pdfUrl: string): Promise<DpsaVacancy[]> {
    const result = await this.aiChatService.chat(
      [{ role: "user", content: `${DPSA_EXTRACTION_PROMPT}\n\nSource: ${pdfUrl}\n\n${chunkText}` }],
      undefined,
      undefined,
      {
        maxOutputTokens: DPSA_CHUNK_MAX_OUTPUT_TOKENS,
        temperature: 0.1,
        responseFormat: "json",
        thinkingBudget: 0,
      },
    );
    const parsed = parseJsonFromAi<DpsaVacancy[]>(result.content);
    if (!Array.isArray(parsed)) {
      this.logger.warn("DPSA chunk returned non-array");
      return [];
    }
    return parsed.filter((v) => Boolean(v?.postNumber) && Boolean(v?.title));
  }
}

function splitByVacancyBoundary(text: string, vacanciesPerChunk: number): string[] {
  const segments = text
    .split(/(?=POST\s+\d+\/\d+\s*:)/i)
    .filter((s) => /POST\s+\d+\/\d+\s*:/i.test(s));
  if (segments.length === 0) return [];
  const groups = chunk(segments, vacanciesPerChunk);
  return groups.map((g) => g.join("\n"));
}

function findLatestCircularPageHref(html: string): string | null {
  const matches = [
    ...html.matchAll(/href=['"]([^'"]*\/newsroom\/psvc\/circular-(\d+)-of-(\d+)\/?[^'"]*)['"]/gi),
  ];
  if (matches.length === 0) return null;
  const ranked = matches
    .map((m) => ({
      href: m[1],
      year: Number(m[3]),
      number: Number(m[2]),
    }))
    .sort((a, b) => b.year - a.year || b.number - a.number);
  return ranked[0]?.href ?? null;
}

function findCombinedCircularPdfHref(html: string): string | null {
  const pdfs = [...html.matchAll(/href=['"]([^'"]+\.pdf)['"]/gi)].map((m) => m[1]);
  if (pdfs.length === 0) return null;
  const combined = pdfs.find((p) => /PSV[%20\s_-]*CIRCULAR/i.test(decodeURIComponent(p)));
  if (combined) return combined;
  const nonLetterSplit = pdfs.find((p) => !/\/[a-z]\.pdf$/i.test(p));
  return nonLetterSplit ?? pdfs[0];
}

function truncate<T extends string | null>(value: T, max: number): T {
  if (typeof value !== "string") return value;
  return (value.length > max ? value.slice(0, max) : value) as T;
}

function buildPostExternalId(pdfUrl: string, postNumber: string): string {
  const circular = pdfUrl.split("/").pop() ?? pdfUrl;
  const trimmed = circular.replace(/\.pdf$/i, "");
  return `${trimmed}::${postNumber}`.slice(0, 255);
}

function buildDescription(v: DpsaVacancy): string {
  const sections: string[] = [];
  if (v.salary) sections.push(`SALARY: ${v.salary}`);
  if (v.closingDate) sections.push(`CLOSING DATE: ${v.closingDate}`);
  if (v.requirementsSummary) sections.push(`REQUIREMENTS:\n${v.requirementsSummary}`);
  if (v.dutiesSummary) sections.push(`DUTIES:\n${v.dutiesSummary}`);
  if (v.enquiries) sections.push(`ENQUIRIES: ${v.enquiries}`);
  return sections.join("\n\n");
}
