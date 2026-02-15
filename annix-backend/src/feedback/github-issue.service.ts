import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface CreateIssueResult {
  issueNumber: number;
  url: string;
}

export interface AddCommentResult {
  commentId: number;
  url: string;
}

@Injectable()
export class GithubIssueService {
  private readonly logger = new Logger(GithubIssueService.name);
  private readonly githubToken: string | null;
  private readonly repoOwner: string | null;
  private readonly repoName: string | null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.githubToken = this.configService.get<string>("GITHUB_TOKEN") || null;
    this.repoOwner = this.configService.get<string>("GITHUB_REPO_OWNER") || null;
    this.repoName = this.configService.get<string>("GITHUB_REPO_NAME") || null;

    this.isConfigured = !!(this.githubToken && this.repoOwner && this.repoName);

    if (!this.isConfigured) {
      this.logger.warn(
        "GitHub integration not configured - feedback issues will be logged to console",
      );
    } else {
      this.logger.log(`GitHub integration configured for ${this.repoOwner}/${this.repoName}`);
    }
  }

  async createIssue(title: string, body: string): Promise<CreateIssueResult> {
    if (!this.isConfigured) {
      this.logger.log("=== GITHUB ISSUE (Console Mode) ===");
      this.logger.log(`Title: ${title}`);
      this.logger.log(`Body: ${body}`);
      this.logger.log("=== END GITHUB ISSUE ===");

      const mockIssueNumber = Math.floor(Math.random() * 10000) + 1;
      return {
        issueNumber: mockIssueNumber,
        url: `https://github.com/mock/repo/issues/${mockIssueNumber}`,
      };
    }

    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels: ["customer-feedback"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to create GitHub issue: ${response.status} - ${errorText}`);
      throw new Error(`Failed to create GitHub issue: ${response.status}`);
    }

    const data = await response.json();
    this.logger.log(`Created GitHub issue #${data.number}: ${data.html_url}`);

    return {
      issueNumber: data.number,
      url: data.html_url,
    };
  }

  async addComment(issueNumber: number, body: string): Promise<AddCommentResult> {
    if (!this.isConfigured) {
      this.logger.log("=== GITHUB COMMENT (Console Mode) ===");
      this.logger.log(`Issue #${issueNumber}`);
      this.logger.log(`Comment: ${body}`);
      this.logger.log("=== END GITHUB COMMENT ===");

      const mockCommentId = Math.floor(Math.random() * 100000) + 1;
      return {
        commentId: mockCommentId,
        url: `https://github.com/mock/repo/issues/${issueNumber}#issuecomment-${mockCommentId}`,
      };
    }

    const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues/${issueNumber}/comments`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to add comment to GitHub issue: ${response.status} - ${errorText}`);
      throw new Error(`Failed to add comment to GitHub issue: ${response.status}`);
    }

    const data = await response.json();
    this.logger.log(`Added comment to issue #${issueNumber}: ${data.html_url}`);

    return {
      commentId: data.id,
      url: data.html_url,
    };
  }
}
