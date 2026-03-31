import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Octokit } from "@octokit/rest";
import { Repository } from "typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { type IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { CustomerFeedback, type FeedbackClassification } from "./entities/customer-feedback.entity";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";

const CLASSIFICATION_PROMPT = `You are a feedback classifier for a software application suite. Classify the following user feedback into exactly one category.

Categories:
- bug: Something is broken, not working as expected, produces errors, or crashes
- ui-issue: Visual/layout problems, elements misaligned, hard to read, styling broken, or poor UX
- feature-request: User wants new functionality, enhancements, or improvements
- question: User is asking how something works or seeking help/clarification
- data-issue: Incorrect data displayed, missing records, wrong calculations, or data sync problems

Respond with ONLY the category name, nothing else. No explanation, no punctuation.`;

const VALID_CLASSIFICATIONS: FeedbackClassification[] = [
  "bug",
  "feature-request",
  "question",
  "ui-issue",
  "data-issue",
];

const APP_ISSUE_MAP: Record<string, number> = {
  "au-rubber": 154,
  customer: 156,
  admin: 157,
  "stock-control": 158,
  supplier: 159,
  "cv-assistant": 160,
  "annix-rep": 161,
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

  async classifyFeedback(content: string): Promise<FeedbackClassification> {
    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content }],
        CLASSIFICATION_PROMPT,
      );

      const classification = response.content.trim().toLowerCase() as FeedbackClassification;

      if (VALID_CLASSIFICATIONS.includes(classification)) {
        return classification;
      }

      this.logger.warn(
        `AI returned invalid classification "${response.content}", defaulting to "question"`,
      );
      return "question";
    } catch (error) {
      this.logger.error(`Failed to classify feedback: ${error}`);
      return "question";
    }
  }

  async createIssueFromFeedback(feedback: CustomerFeedback): Promise<number | null> {
    if (!this.octokit) {
      this.logger.warn("GitHub integration disabled — skipping issue creation");
      return null;
    }

    try {
      const classification = await this.classifyFeedback(feedback.content);

      feedback.aiClassification = classification;
      feedback.status = "triaged";
      await this.feedbackRepository.save(feedback);

      const attachments = await this.attachmentRepository.find({
        where: { feedbackId: feedback.id },
        order: { createdAt: "ASC" },
      });

      const commentBody = await this.formatCommentBody(feedback, classification, attachments);

      const appContext = feedback.appContext || "admin";
      const issueNumber = APP_ISSUE_MAP[appContext] || APP_ISSUE_MAP["admin"];

      const fullComment = `${commentBody}\n\n---\n@claude This feedback was classified as \`${classification}\`. Please investigate and either fix the issue (create a branch and PR) or comment explaining what you found and whether human intervention is needed. The feedback includes screenshots showing the current state.`;

      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: fullComment,
      });

      await this.addClassificationLabel(issueNumber, classification, appContext);

      feedback.githubIssueNumber = issueNumber;
      await this.feedbackRepository.save(feedback);

      this.logger.log(
        `Added comment to GitHub issue #${issueNumber} for feedback #${feedback.id} (${classification}) — Claude triggered`,
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

  private async formatCommentBody(
    feedback: CustomerFeedback,
    classification: FeedbackClassification,
    attachments: FeedbackAttachment[],
  ): Promise<string> {
    const sections = [
      `## Feedback #${feedback.id} — \`${classification}\``,
      "",
      "| Field | Value |",
      "|-------|-------|",
      `| **Submitter** | ${feedback.submitterName || "Unknown"} |`,
      `| **Email** | ${feedback.submitterEmail || "Unknown"} |`,
      `| **Type** | ${feedback.submitterType || "Unknown"} |`,
      `| **Page** | ${feedback.pageUrl || "Unknown"} |`,
      `| **Source** | ${feedback.source} |`,
      `| **Classification** | \`${classification}\` |`,
      "",
      "### Content",
      "",
      feedback.content,
      "",
    ];

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
}
