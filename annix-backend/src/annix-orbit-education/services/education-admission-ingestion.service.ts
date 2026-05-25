import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { stripHtmlToText } from "../../lib/html-text";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import { type IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { EducationExtractionCorrection } from "../entities/education-extraction-correction.entity";
import { EducationRequirementDraft } from "../entities/education-requirement-draft.entity";

const HTML_TEXT_LIMIT = 18000;
const EXTRACTION_MAX_TOKENS = 2048;
const METRIC_CATEGORY = "orbit-admission-extract";

const ADMISSION_EXTRACTION_PROMPT = `You extract university admission requirements from an official admissions page.
Return STRICT JSON: { "requirements": [ { "fieldKey": string, "label": string, "value": object, "confidence": "high"|"medium"|"low", "snippet": string } ] }.
- fieldKey: a stable key, e.g. "aps_aggregate", "subject:mathematics", "subject:english_home_language".
- label: a short human label, e.g. "Minimum APS", "Mathematics (minimum)".
- value: the requirement as structured data, e.g. { "type": "aps", "min": 42 } or { "type": "subject", "subject": "Mathematics", "minPercent": 60 }.
- snippet: the exact text on the page the value was taken from.
CRITICAL RULES:
- Extract ONLY values that are explicitly stated on the page. NEVER invent, estimate, infer, or "fill in" a number.
- If the page does not state admission marks/requirements, return { "requirements": [] }.
- Do not guess. A missing requirement is far better than a fabricated one.`;

interface ExtractedRequirement {
  fieldKey: string;
  label?: string;
  value: Record<string, unknown>;
  confidence?: string;
  snippet?: string;
}

export interface IngestionResult {
  drafts: number;
  screenshotPath: string | null;
  sourceUrl: string;
}

export interface IngestionParams {
  institutionId: string | null;
  programmeId: string | null;
  intakeYear: number;
  sourceUrl: string;
}

@Injectable()
export class EducationAdmissionIngestionService {
  private readonly logger = new Logger(EducationAdmissionIngestionService.name);

  constructor(
    @InjectRepository(EducationRequirementDraft)
    private readonly draftRepo: Repository<EducationRequirementDraft>,
    @InjectRepository(EducationExtractionCorrection)
    private readonly correctionRepo: Repository<EducationExtractionCorrection>,
    private readonly puppeteerPool: PuppeteerPoolService,
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  async ingest(params: IngestionParams): Promise<IngestionResult> {
    const captured = await this.capture(params.sourceUrl);
    const screenshotPath = await this.storeScreenshot(captured.screenshot, params.sourceUrl);
    const text = stripHtmlToText(captured.html)?.slice(0, HTML_TEXT_LIMIT) ?? "";

    const fewShot = await this.recentCorrections(params.institutionId);
    const requirements = await this.metrics.time(
      METRIC_CATEGORY,
      "extract",
      () => this.extract(params.sourceUrl, text, fewShot),
      text.length,
    );

    const fetchedAt = now().toJSDate();
    const rows = requirements.map((req) =>
      this.draftRepo.create({
        institutionId: params.institutionId,
        programmeId: params.programmeId,
        intakeYear: params.intakeYear,
        fieldKey: req.fieldKey,
        label: req.label ?? "",
        extractedValue: req.value,
        approvedValue: null,
        status: "draft",
        confidence: req.confidence ?? null,
        sourceUrl: params.sourceUrl,
        screenshotPath,
        rawSnippet: req.snippet ?? null,
        fetchedAt,
      }),
    );
    await this.draftRepo.save(rows);
    this.logger.log(
      `Ingested ${rows.length} draft requirement(s) from ${params.sourceUrl} (programme ${params.programmeId ?? "n/a"})`,
    );
    return { drafts: rows.length, screenshotPath, sourceUrl: params.sourceUrl };
  }

  @Cron("0 3 1 */3 *", { name: "orbit-education:refresh-admission-data" })
  async refreshAdmissionData(): Promise<void> {
    const enabled =
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_ORBIT_ADMISSION_REFRESH === "true";
    if (!enabled) {
      return;
    }
    const sources = await this.distinctSources();
    this.logger.log(`Refreshing ${sources.length} admission source(s)`);
    await sources.reduce<Promise<void>>(async (previous, source) => {
      await previous;
      try {
        await this.draftRepo.delete({ sourceUrl: source.sourceUrl, status: "draft" });
        await this.ingest(source);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Refresh failed for ${source.sourceUrl}: ${message}`);
      }
    }, Promise.resolve());
  }

  private async distinctSources(): Promise<IngestionParams[]> {
    const rows = await this.draftRepo
      .createQueryBuilder("draft")
      .select("draft.institution_id", "institutionId")
      .addSelect("draft.programme_id", "programmeId")
      .addSelect("draft.intake_year", "intakeYear")
      .addSelect("draft.source_url", "sourceUrl")
      .distinct(true)
      .getRawMany<{
        institutionId: string | null;
        programmeId: string | null;
        intakeYear: number;
        sourceUrl: string;
      }>();
    return rows.map((row) => ({
      institutionId: row.institutionId,
      programmeId: row.programmeId,
      intakeYear: Number(row.intakeYear),
      sourceUrl: row.sourceUrl,
    }));
  }

  private async capture(url: string): Promise<{ html: string; screenshot: Buffer }> {
    return this.puppeteerPool.executeWithPage({
      url,
      waitUntil: "networkidle2",
      timeout: 45000,
      execute: async (page) => {
        const html = await page.content();
        const shot = await page.screenshot({ fullPage: true, type: "png" });
        return { html, screenshot: Buffer.from(shot) };
      },
    });
  }

  private async storeScreenshot(buffer: Buffer, url: string): Promise<string | null> {
    try {
      const file = {
        buffer,
        originalname: `admission-${now().toMillis()}.png`,
        mimetype: "image/png",
        size: buffer.length,
      } as Express.Multer.File;
      const result = await this.storage.upload(file, "orbit-education/admission-screenshots");
      return result.path;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Screenshot upload failed for ${url}: ${message}`);
      return null;
    }
  }

  private async recentCorrections(institutionId: string | null): Promise<string> {
    if (!institutionId) {
      return "";
    }
    const corrections = await this.correctionRepo.find({
      where: { institutionId },
      order: { createdAt: "DESC" },
      take: 8,
    });
    if (corrections.length === 0) {
      return "";
    }
    const examples = corrections
      .map(
        (correction) =>
          `- ${correction.fieldKey}: extracted ${JSON.stringify(correction.extractedValue)} but the correct value was ${JSON.stringify(correction.correctedValue)}.`,
      )
      .join("\n");
    return `\n\nPAST CORRECTIONS for this institution (learn from these — avoid repeating the mistake):\n${examples}`;
  }

  private async extract(
    sourceUrl: string,
    text: string,
    fewShot: string,
  ): Promise<ExtractedRequirement[]> {
    if (text.length < 80) {
      return [];
    }
    const prompt = `${ADMISSION_EXTRACTION_PROMPT}${fewShot}\n\nSource URL: ${sourceUrl}\n\nPAGE TEXT:\n${text}`;
    try {
      const result = await this.aiChatService.chat(
        [{ role: "user", content: prompt }],
        undefined,
        undefined,
        {
          responseFormat: "json",
          temperature: 0,
          thinkingBudget: 0,
          maxOutputTokens: EXTRACTION_MAX_TOKENS,
        },
      );
      const parsed = parseJsonFromAi<{ requirements?: ExtractedRequirement[] }>(result.content);
      const requirements = parsed.requirements ?? [];
      return requirements.filter((req) => Boolean(req?.fieldKey) && Boolean(req?.value));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Admission extraction failed for ${sourceUrl}: ${message}`);
      return [];
    }
  }
}
