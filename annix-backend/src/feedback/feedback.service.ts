import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { formatDateTime, now } from "../lib/datetime";
import { SubmitFeedbackDto, SubmitFeedbackResponseDto } from "./dto";
import { CustomerFeedback } from "./entities/customer-feedback.entity";
import { GithubIssueService } from "./github-issue.service";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepository: Repository<CustomerFeedback>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepository: Repository<CustomerProfile>,
    private readonly githubIssueService: GithubIssueService,
  ) {}

  async submitFeedback(
    customerId: number,
    dto: SubmitFeedbackDto,
  ): Promise<SubmitFeedbackResponseDto> {
    const profile = await this.customerProfileRepository.findOne({
      where: { id: customerId },
      relations: ["user", "company"],
    });

    if (!profile) {
      throw new Error("Customer profile not found");
    }

    const customerInfo: CustomerInfo = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.user.email,
      companyName: profile.company.legalName,
    };

    let issueNumber = profile.githubFeedbackIssueNumber;
    let issueUrl: string;

    if (issueNumber) {
      const commentBody = this.formatCommentBody(dto, customerInfo);
      const result = await this.githubIssueService.addComment(issueNumber, commentBody);
      issueUrl = result.url.split("#")[0];
    } else {
      const title = `Customer Feedback - ${customerInfo.companyName}`;
      const body = this.formatIssueBody(dto, customerInfo);
      const result = await this.githubIssueService.createIssue(title, body);
      issueNumber = result.issueNumber;
      issueUrl = result.url;

      await this.customerProfileRepository.update(
        { id: customerId },
        { githubFeedbackIssueNumber: issueNumber },
      );
    }

    const feedback = this.feedbackRepository.create({
      customerProfileId: customerId,
      githubIssueNumber: issueNumber,
      content: dto.content,
      source: dto.source,
      pageUrl: dto.pageUrl || null,
    });

    await this.feedbackRepository.save(feedback);

    this.logger.log(`Feedback submitted by customer ${customerId} to GitHub issue #${issueNumber}`);

    return {
      id: feedback.id,
      githubIssueNumber: issueNumber,
      githubIssueUrl: issueUrl,
      message: "Feedback submitted successfully",
    };
  }

  private formatIssueBody(dto: SubmitFeedbackDto, customer: CustomerInfo): string {
    const timestamp = formatDateTime(now().toJSDate());

    return `**Customer:** ${customer.firstName} ${customer.lastName}
**Company:** ${customer.companyName}
**Email:** ${customer.email}

---
## Feedback
${dto.content}

*Submitted via: ${dto.source} from ${dto.pageUrl || "unknown page"}*
*Date: ${timestamp}*`;
  }

  private formatCommentBody(dto: SubmitFeedbackDto, _customer: CustomerInfo): string {
    const timestamp = formatDateTime(now().toJSDate());

    return `## Feedback
${dto.content}

*Submitted via: ${dto.source} from ${dto.pageUrl || "unknown page"}*
*Date: ${timestamp}*`;
  }
}
