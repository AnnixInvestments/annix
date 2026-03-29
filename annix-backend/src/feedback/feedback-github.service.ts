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

      const body = await this.formatIssueBody(feedback, classification, attachments);
      const title = this.formatIssueTitle(feedback);
      const labels = this.issueLabels(feedback, classification);

      const shouldTriggerClaude = classification === "bug" || classification === "ui-issue";

      const fullBody = shouldTriggerClaude
        ? `${body}\n\n---\n@claude Please investigate and fix this issue. The feedback includes screenshots showing the current state.`
        : body;

      const issue = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body: fullBody,
        labels,
      });

      feedback.githubIssueNumber = issue.data.number;
      await this.feedbackRepository.save(feedback);

      this.logger.log(
        `Created GitHub issue #${issue.data.number} for feedback #${feedback.id} (${classification})${shouldTriggerClaude ? " — Claude auto-fix triggered" : ""}`,
      );

      return issue.data.number;
    } catch (error) {
      this.logger.error(`Failed to create GitHub issue for feedback #${feedback.id}: ${error}`);
      return null;
    }
  }

  private formatIssueTitle(feedback: CustomerFeedback): string {
    const truncatedContent =
      feedback.content.length > 80 ? `${feedback.content.substring(0, 77)}...` : feedback.content;

    const context = feedback.appContext || feedback.submitterType || "unknown";
    return `[Feedback] ${truncatedContent} (${context})`;
  }

  private issueLabels(
    feedback: CustomerFeedback,
    classification: FeedbackClassification,
  ): string[] {
    return feedback.appContext
      ? ["feedback", classification, feedback.appContext]
      : ["feedback", classification];
  }

  private async formatIssueBody(
    feedback: CustomerFeedback,
    classification: FeedbackClassification,
    attachments: FeedbackAttachment[],
  ): Promise<string> {
    const sections = [
      "## Feedback Details",
      "",
      "| Field | Value |",
      "|-------|-------|",
      `| **Submitter** | ${feedback.submitterName || "Unknown"} |`,
      `| **Email** | ${feedback.submitterEmail || "Unknown"} |`,
      `| **Type** | ${feedback.submitterType || "Unknown"} |`,
      `| **App** | ${feedback.appContext || "Unknown"} |`,
      `| **Page** | ${feedback.pageUrl || "Unknown"} |`,
      `| **Source** | ${feedback.source} |`,
      `| **Classification** | \`${classification}\` |`,
      `| **Feedback ID** | #${feedback.id} |`,
      "",
      "## Content",
      "",
      feedback.content,
      "",
    ];

    if (attachments.length > 0) {
      sections.push("## Attachments", "");

      const attachmentLines = await Promise.all(
        attachments.map(async (att) => {
          const url = await this.storageService.presignedUrl(att.filePath, 604800);
          const label = att.isAutoScreenshot ? "Auto-Screenshot" : att.originalFilename;
          if (att.mimeType.startsWith("image/")) {
            return `### ${label}\n![${label}](${url})`;
          }
          return `### ${label}\n[Download ${att.originalFilename}](${url})`;
        }),
      );

      sections.push(...attachmentLines, "");
    }

    sections.push("---", `*Auto-created from feedback widget submission #${feedback.id}*`);

    return sections.join("\n");
  }
}
