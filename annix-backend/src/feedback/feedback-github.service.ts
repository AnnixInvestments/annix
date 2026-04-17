import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Octokit } from "@octokit/rest";
import { Repository } from "typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { type IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { CustomerFeedback, type FeedbackClassification } from "./entities/customer-feedback.entity";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";

interface FeedbackTranslation {
  classification: FeedbackClassification;
  confidence: number;
  likelyLocation: string | null;
  reproductionSteps: string[];
  likelyCause: string | null;
  affectedSurface: string | null;
  riskFlags: string[];
  fixScope: string | null;
  autoFixable: boolean;
}

type ClaudeRoutingMode = "autofix" | "investigation" | "skip";

const TRANSLATOR_PROMPT = `You are a software feedback translator.

Convert the report into strict engineering JSON using only evidence from the provided report and captured context.

Valid classifications:
- bug
- ui-issue
- data-issue
- feature-request
- question

Return JSON with exactly these keys:
- classification
- confidence
- likelyLocation
- reproductionSteps
- likelyCause
- affectedSurface
- riskFlags
- fixScope
- autoFixable

Rules:
- confidence must be a number from 0 to 1
- reproductionSteps must be an array of concise strings
- riskFlags must be an array of concise lowercase strings
- likelyLocation, likelyCause, affectedSurface, and fixScope must be strings or null
- autoFixable must be true only for narrow frontend-local issues with strong context
- distinguish ordinary user questions from engineering investigation requests
- when a question is really asking for code inspection, consistency review, DRYness, reuse, architecture, or implementation verification, classify it as question and set fixScope to investigation
- for investigation requests with enough codebase context, set autoFixable true so they can be routed to Claude for autonomous investigation
- do not suggest code changes
- do not invent evidence
- if the report is weak or risky, lower confidence and set autoFixable false`;

const VALID_CLASSIFICATIONS: FeedbackClassification[] = [
  "bug",
  "feature-request",
  "question",
  "ui-issue",
  "data-issue",
];

const CLAUDE_AUTO_FIX_CLASSIFICATIONS: FeedbackClassification[] = ["bug", "ui-issue", "data-issue"];
const BLOCKED_RISK_FLAGS = new Set([
  "auth",
  "billing",
  "permissions",
  "backend",
  "data-integrity",
  "compliance",
  "mixed-surface",
  "unclear",
]);
const APPROVED_FIX_SCOPES = new Set([
  "copy",
  "frontend-local",
  "frontend-ui",
  "frontend-render",
  "frontend-event-handler",
  "conditional-rendering",
  "label",
]);
const INVESTIGATION_FIX_SCOPES = new Set([
  "investigation",
  "implementation-review",
  "consistency-review",
  "refactor-review",
  "architecture-review",
]);
const FORCE_CLAUDE_LABEL = "force-claude";
const SKIP_CLAUDE_LABEL = "skip-claude";

const APP_ISSUE_MAP: Record<string, number> = {
  "au-rubber": 154,
  customer: 156,
  admin: 157,
  "stock-control": 158,
  supplier: 156,
  "cv-assistant": 160,
  "annix-rep": 161,
  "comply-sa": 159,
};

@Injectable()
export class FeedbackGithubService {
  private readonly logger = new Logger(FeedbackGithubService.name);
  private readonly octokit: Octokit | null;
  private readonly owner: string;
  private readonly repo: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiChatService: AiChatService,
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepository: Repository<CustomerFeedback>,
    @InjectRepository(FeedbackAttachment)
    private readonly attachmentRepository: Repository<FeedbackAttachment>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {
    const token =
      this.configService.get<string>("GITHUB_TOKEN") ||
      this.configService.get<string>("PROJECT_TOKEN");
    const repoFull = this.configService.get<string>("GITHUB_REPO") || "AnnixInvestments/annix";
    const [owner, repo] = repoFull.split("/");
    this.owner = owner;
    this.repo = repo;

    if (token) {
      this.octokit = new Octokit({ auth: token });
    } else {
      this.octokit = null;
      this.logger.warn(
        "No GITHUB_TOKEN or PROJECT_TOKEN configured — GitHub issue creation disabled",
      );
    }
  }

  async translateFeedback(feedback: CustomerFeedback): Promise<FeedbackTranslation> {
    const input = JSON.stringify(
      {
        content: feedback.content,
        pageUrl: feedback.pageUrl,
        appContext: feedback.appContext,
        captureCompletenessScore: feedback.captureCompletenessScore,
        captureContext: feedback.captureContext,
      },
      null,
      2,
    );

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: input }],
        TRANSLATOR_PROMPT,
      );
      const parsed = this.parseTranslatorResponse(response.content);
      if (parsed) {
        return parsed;
      }
      this.logger.warn(`AI returned invalid translator output for feedback #${feedback.id}`);
    } catch (error) {
      this.logger.error(`Failed to translate feedback: ${error}`);
    }

    return {
      classification: "question",
      confidence: 0,
      likelyLocation: feedback.pageUrl || null,
      reproductionSteps: [],
      likelyCause: null,
      affectedSurface: feedback.appContext || null,
      riskFlags: ["unclear"],
      fixScope: null,
      autoFixable: false,
    };
  }

  async classifyFeedback(content: string): Promise<FeedbackClassification> {
    const translation = await this.translateFeedback({
      id: 0,
      content,
      pageUrl: null,
      appContext: null,
      captureCompletenessScore: null,
      captureContext: null,
    } as CustomerFeedback);
    return translation.classification;
  }

  async createIssueFromFeedback(feedback: CustomerFeedback): Promise<number | null> {
    if (!this.octokit) {
      this.logger.warn("GitHub integration disabled — skipping issue creation");
      return null;
    }

    try {
      const translation = await this.translateFeedback(feedback);
      const classification = translation.classification;

      feedback.aiClassification = classification;
      feedback.translatorConfidence = translation.confidence;
      feedback.translatorLikelyLocation = translation.likelyLocation;
      feedback.translatorReproductionSteps = translation.reproductionSteps;
      feedback.translatorLikelyCause = translation.likelyCause;
      feedback.translatorAffectedSurface = translation.affectedSurface;
      feedback.translatorRiskFlags = translation.riskFlags;
      feedback.translatorFixScope = translation.fixScope;
      feedback.translatorAutoFixable = translation.autoFixable;
      feedback.status = "triaged";
      await this.feedbackRepository.save(feedback);

      const attachments = await this.attachmentRepository.find({
        where: { feedbackId: feedback.id },
        order: { createdAt: "ASC" },
      });

      const commentBody = await this.formatCommentBody(feedback, translation, attachments);

      const appContext = feedback.appContext || "admin";
      const issueNumber = APP_ISSUE_MAP[appContext] || APP_ISSUE_MAP["admin"];
      const existingLabels = await this.getIssueLabels(issueNumber);
      const fullComment = this.buildCommentBody(commentBody, translation, existingLabels);

      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: fullComment,
      });

      await this.addClassificationLabel(issueNumber, classification, appContext);

      feedback.githubIssueNumber = issueNumber;
      await this.feedbackRepository.save(feedback);

      const claudeOverride = this.resolveClaudeOverride(existingLabels);
      const claudeTriggered = this.shouldTriggerClaude(translation, claudeOverride);
      const triggerStatus = claudeTriggered ? "Claude triggered" : "Claude skipped";

      this.logger.log(
        `Added comment to GitHub issue #${issueNumber} for feedback #${feedback.id} (${classification}) — ${triggerStatus}`,
      );

      return issueNumber;
    } catch (error) {
      this.logger.error(`Failed to add feedback #${feedback.id} to GitHub issue: ${error}`);
      return null;
    }
  }

  private async addClassificationLabel(
    issueNumber: number,
    classification: FeedbackClassification,
    appContext: string,
  ): Promise<void> {
    if (!this.octokit) {
      return;
    }

    try {
      const { data: issue } = await this.octokit.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
      });

      const existingLabels = issue.labels
        .map((l) => (typeof l === "string" ? l : l.name))
        .filter((name): name is string => name !== undefined);

      const desiredLabels = [
        ...new Set([...existingLabels, "feedback", classification, appContext]),
      ];

      await this.octokit.issues.setLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels: desiredLabels,
      });
    } catch (error) {
      this.logger.warn(`Failed to update labels on issue #${issueNumber}: ${error}`);
    }
  }

  private async getIssueLabels(issueNumber: number): Promise<string[]> {
    if (!this.octokit) {
      return [];
    }

    try {
      const { data: issue } = await this.octokit.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
      });

      return issue.labels
        .map((label) => (typeof label === "string" ? label : label.name))
        .filter((labelName): labelName is string => labelName !== undefined);
    } catch (error) {
      this.logger.warn(`Failed to fetch labels on issue #${issueNumber}: ${error}`);
      return [];
    }
  }

  private resolveClaudeOverride(labels: string[]): "force" | "skip" | null {
    if (labels.includes(SKIP_CLAUDE_LABEL)) {
      return "skip";
    }
    if (labels.includes(FORCE_CLAUDE_LABEL)) {
      return "force";
    }
    return null;
  }

  private buildCommentBody(
    commentBody: string,
    translation: FeedbackTranslation,
    labels: string[],
  ): string {
    const claudeOverride = this.resolveClaudeOverride(labels);
    const claudeRoutingMode = this.getClaudeRoutingMode(translation, claudeOverride);

    if (claudeRoutingMode === "skip") {
      if (claudeOverride === "skip") {
        return `${commentBody}\n\n---\nClaude auto-fix was skipped because the tracker issue has the \`${SKIP_CLAUDE_LABEL}\` label.`;
      }

      return `${commentBody}\n\n---\nNo Claude auto-fix trigger was added because the translator marked this report as outside the narrow safe auto-fix path.`;
    }

    const overrideNote =
      claudeOverride === "force"
        ? ` The tracker issue has the \`${FORCE_CLAUDE_LABEL}\` label, so Claude was triggered regardless of classification.`
        : "";

    if (claudeRoutingMode === "investigation") {
      return `${commentBody}\n\n---\n@claude This feedback was translated as an engineering investigation request with confidence ${translation.confidence.toFixed(2)}. Inspect the relevant code paths, assess whether the implementation is consistent and appropriately reused, and make the smallest safe change if a contained improvement is clearly warranted. If the issue is broader than a safe autonomous change, comment with a concrete investigation summary and recommended next steps instead of forcing a PR.${overrideNote}`;
    }

    return `${commentBody}\n\n---\n@claude This feedback was translated as \`${translation.classification}\` with confidence ${translation.confidence.toFixed(2)}. Stay inside the structured brief and narrow safe scope. Please investigate and either fix the issue (create a branch and PR) or comment explaining what you found and whether human intervention is needed. The feedback includes screenshots showing the current state.${overrideNote}`;
  }

  private async formatCommentBody(
    feedback: CustomerFeedback,
    translation: FeedbackTranslation,
    attachments: FeedbackAttachment[],
  ): Promise<string> {
    const sections = [
      `## Feedback #${feedback.id} — \`${translation.classification}\``,
      "",
      "| Field | Value |",
      "|-------|-------|",
      `| **Submitter** | ${feedback.submitterName || "Unknown"} |`,
      `| **Email** | ${feedback.submitterEmail || "Unknown"} |`,
      `| **Type** | ${feedback.submitterType || "Unknown"} |`,
      `| **Page** | ${feedback.pageUrl || "Unknown"} |`,
      `| **Source** | ${feedback.source} |`,
      `| **Classification** | \`${translation.classification}\` |`,
      `| **Confidence** | ${translation.confidence.toFixed(2)} |`,
      `| **Auto-fixable** | ${translation.autoFixable ? "yes" : "no"} |`,
      `| **Likely location** | ${translation.likelyLocation || "Unknown"} |`,
      `| **Affected surface** | ${translation.affectedSurface || "Unknown"} |`,
      `| **Fix scope** | ${translation.fixScope || "Unknown"} |`,
      `| **Capture score** | ${feedback.captureCompletenessScore ?? 0} |`,
      "",
      "### Content",
      "",
      feedback.content,
      "",
      "### Engineering Brief",
      "",
    ];

    sections.push(
      `- Likely cause: ${translation.likelyCause || "Unknown"}`,
      `- Risk flags: ${translation.riskFlags.length > 0 ? translation.riskFlags.join(", ") : "none"}`,
    );

    if (translation.reproductionSteps.length > 0) {
      sections.push(
        "",
        "### Reproduction Steps",
        "",
        ...translation.reproductionSteps.map((step) => `- ${step}`),
      );
    }

    if (attachments.length > 0) {
      sections.push("### Attachments", "");

      const attachmentLines = await Promise.all(
        attachments.map(async (att) => {
          const url = await this.storageService.presignedUrl(att.filePath, 604800);
          const label = att.isAutoScreenshot ? "Auto-Screenshot" : att.originalFilename;
          if (att.mimeType.startsWith("image/")) {
            return `**${label}**\n![${label}](${url})`;
          }
          return `**${label}**\n[Download ${att.originalFilename}](${url})`;
        }),
      );

      sections.push(...attachmentLines, "");
    }

    sections.push("---", `*Auto-created from feedback widget submission #${feedback.id}*`);

    return sections.join("\n");
  }

  private parseTranslatorResponse(content: string): FeedbackTranslation | null {
    try {
      const normalized = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "");
      const parsed = JSON.parse(normalized) as Partial<FeedbackTranslation>;
      if (!parsed.classification || !VALID_CLASSIFICATIONS.includes(parsed.classification)) {
        return null;
      }
      return {
        classification: parsed.classification,
        confidence: this.normalizeConfidence(parsed.confidence),
        likelyLocation: this.normalizeNullableString(parsed.likelyLocation, 255),
        reproductionSteps: this.normalizeStringArray(parsed.reproductionSteps, 6),
        likelyCause: this.normalizeNullableString(parsed.likelyCause, 2000),
        affectedSurface: this.normalizeNullableString(parsed.affectedSurface, 255),
        riskFlags: this.normalizeStringArray(parsed.riskFlags, 8).map((flag) => flag.toLowerCase()),
        fixScope: this.normalizeNullableString(parsed.fixScope, 100),
        autoFixable: Boolean(parsed.autoFixable),
      };
    } catch {
      return null;
    }
  }

  private normalizeConfidence(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(0, Math.min(1, Number(value.toFixed(2))));
  }

  private normalizeNullableString(value: unknown, maxLength: number): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeStringArray(value: unknown, limit: number): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, limit);
  }

  private isInvestigationRequest(translation: FeedbackTranslation): boolean {
    return (
      translation.classification === "question" &&
      Boolean(translation.fixScope) &&
      INVESTIGATION_FIX_SCOPES.has(translation.fixScope ?? "")
    );
  }

  private getClaudeRoutingMode(
    translation: FeedbackTranslation,
    claudeOverride: "force" | "skip" | null,
  ): ClaudeRoutingMode {
    if (claudeOverride === "skip") {
      return "skip";
    }
    if (claudeOverride === "force") {
      return this.isInvestigationRequest(translation) ? "investigation" : "autofix";
    }
    if (!translation.autoFixable) {
      return "skip";
    }
    if (this.isInvestigationRequest(translation)) {
      if (translation.confidence < 0.7) {
        return "skip";
      }
      return "investigation";
    }
    if (!CLAUDE_AUTO_FIX_CLASSIFICATIONS.includes(translation.classification)) {
      return "skip";
    }
    if (translation.confidence < 0.7) {
      return "skip";
    }
    if (translation.fixScope && !APPROVED_FIX_SCOPES.has(translation.fixScope)) {
      return "skip";
    }
    return translation.riskFlags.some((flag) => BLOCKED_RISK_FLAGS.has(flag)) ? "skip" : "autofix";
  }

  private shouldTriggerClaude(
    translation: FeedbackTranslation,
    claudeOverride: "force" | "skip" | null,
  ): boolean {
    return this.getClaudeRoutingMode(translation, claudeOverride) !== "skip";
  }
}
