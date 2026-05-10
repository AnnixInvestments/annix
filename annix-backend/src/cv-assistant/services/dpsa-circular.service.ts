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
  duties: string | null;
  requirements: string | null;
}

const DPSA_EXTRACTION_PROMPT = `You are extracting vacancy posts from a South African Department of Public Service and Administration (DPSA) Public Service Vacancy Circular (PSVC) PDF.

Each post in the circular has a structured shape:
- POST NUMBER (e.g. "POST 18/01")
- POST TITLE (job title)
- DEPARTMENT (national / provincial)
- CENTRE (location)
- SALARY (annual range, often a single grade)
- CLOSING DATE
- ENQUIRIES (contact)
- DUTIES (responsibilities)
- REQUIREMENTS (qualifications, experience, skills)

Return a strict JSON array of objects with these fields exactly. Use null for any field that's missing. Trim whitespace. Do NOT include any prose outside the JSON.

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
      const response = await fetch(PSVC_INDEX_URL);
      if (!response.ok) return null;
      const html = await response.text();
      const match = html.match(/href="([^"]+\.pdf)"/i);
      if (!match) return null;
      const href = match[1];
      if (href.startsWith("http")) return href;
      if (href.startsWith("/")) return `https://www.dpsa.gov.za${href}`;
      return `https://www.dpsa.gov.za/newsroom/psvc/${href}`;
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
      { maxOutputTokens: 16_000, temperature: 0.1, responseFormat: "json" },
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

function buildPostExternalId(pdfUrl: string, postNumber: string): string {
  const circular = pdfUrl.split("/").pop() ?? pdfUrl;
  const trimmed = circular.replace(/\.pdf$/i, "");
  return `${trimmed}::${postNumber}`.slice(0, 255);
}

function buildDescription(v: DpsaVacancy): string {
  const sections: string[] = [];
  if (v.salary) sections.push(`SALARY: ${v.salary}`);
  if (v.closingDate) sections.push(`CLOSING DATE: ${v.closingDate}`);
  if (v.requirements) sections.push(`REQUIREMENTS:\n${v.requirements}`);
  if (v.duties) sections.push(`DUTIES:\n${v.duties}`);
  if (v.enquiries) sections.push(`ENQUIRIES: ${v.enquiries}`);
  return sections.join("\n\n");
}
