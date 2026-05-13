import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { extractTextFromPdf } from "../../lib/document-extraction";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { isCvAssistantCronEnabled } from "../cv-assistant-cron.config";
import { ExternalJob } from "../entities/external-job.entity";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
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

@Injectable()
export class DpsaCircularService {
  private readonly logger = new Logger(DpsaCircularService.name);

  constructor(
    @InjectRepository(JobMarketSource)
    private readonly sourceRepo: Repository<JobMarketSource>,
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    private readonly aiChatService: AiChatService,
    private readonly embeddingService: EmbeddingService,
    private readonly candidateJobMatchingService: CandidateJobMatchingService,
  ) {}

  @Cron("0 7 * * 1", { name: "cv-assistant:dpsa-weekly" })
  async pollDpsa(): Promise<void> {
    if (!isCvAssistantCronEnabled()) return;
    if (process.env.DPSA_INGESTION_ENABLED !== "true") {
      this.logger.debug("DPSA ingestion disabled (DPSA_INGESTION_ENABLED not 'true')");
      return;
    }
    const source = await this.sourceRepo.findOne({
      where: { provider: JobSourceProvider.DPSA, enabled: true },
    });
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
    const existing = await this.externalJobRepo.find({
      where: { sourceExternalId: In(externalIds), sourceId: source.id },
      select: ["sourceExternalId"],
    });
    const existingIds = new Set(existing.map((e) => e.sourceExternalId));

    const fresh = vacancies.filter(
      (v) => !existingIds.has(buildPostExternalId(pdfUrl, v.postNumber)),
    );

    const saved = await Promise.all(
      fresh.map((v) =>
        this.externalJobRepo.save(
          this.externalJobRepo.create({
            title: v.title,
            company: v.department ?? "Department of Public Service and Administration",
            country: "za",
            locationRaw: v.centre,
            locationArea: v.centre,
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
            sourceId: source.id,
          }),
        ),
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
        this.logger.warn("PSVC discovery: no circular page link on index");
        return null;
      }
      const circularPageUrl = circularPageHref.startsWith("http")
        ? circularPageHref
        : `https://www.dpsa.gov.za${circularPageHref.startsWith("/") ? "" : "/"}${circularPageHref}`;

      const circularResponse = await fetch(circularPageUrl);
      if (!circularResponse.ok) return null;
      const circularHtml = await circularResponse.text();

      const pdfHref = findPdfHref(circularHtml);
      if (!pdfHref) {
        this.logger.warn(`PSVC discovery: no PDF link on ${circularPageUrl}`);
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
    const trimmed = text.length > 200_000 ? text.slice(0, 200_000) : text;
    const result = await this.aiChatService.chat(
      [{ role: "user", content: `${DPSA_EXTRACTION_PROMPT}\n\nSource: ${pdfUrl}\n\n${trimmed}` }],
      undefined,
      undefined,
      { maxOutputTokens: 65_000, temperature: 0.1, responseFormat: "json" },
    );
    try {
      const parsed = parseJsonFromAi<DpsaVacancy[]>(result.content);
      if (!Array.isArray(parsed)) {
        this.logger.warn("DPSA extraction returned non-array");
        return [];
      }
      return parsed.filter((v) => Boolean(v?.postNumber) && Boolean(v?.title));
    } catch (err) {
      this.logger.warn(
        `DPSA JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }
}

function findLatestCircularPageHref(html: string): string | null {
  const matches = [
    ...html.matchAll(/href="([^"]*\/newsroom\/psvc\/circular-(\d+)-of-(\d+)\/?[^"]*)"/gi),
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

function findPdfHref(html: string): string | null {
  const match = html.match(/href="([^"]+\.pdf)"/i);
  return match ? match[1] : null;
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
