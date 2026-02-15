import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { EmailService } from "../email/email.service";
import { formatDateTime, now } from "../lib/datetime";
import { BroadcastService } from "../messaging/broadcast.service";
import { BroadcastPriority, BroadcastTarget } from "../messaging/entities";
import { User } from "../user/entities/user.entity";
import { UserRole } from "../user-roles/entities/user-role.entity";
import { SubmitFeedbackDto, SubmitFeedbackResponseDto } from "./dto";
import { CustomerFeedback } from "./entities/customer-feedback.entity";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
}

const TEST_SITE_URL = "https://annix-frontend-test.fly.dev";

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepository: Repository<CustomerFeedback>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly broadcastService: BroadcastService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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

    const feedback = this.feedbackRepository.create({
      customerProfileId: customerId,
      content: dto.content,
      source: dto.source,
      pageUrl: dto.pageUrl || null,
    });

    await this.feedbackRepository.save(feedback);

    if (this.isTestSite()) {
      await this.notifyAdmins(dto, customerInfo);
    }

    this.logger.log(`Feedback submitted by customer ${customerId}`);

    return {
      id: feedback.id,
      message: "Feedback submitted successfully",
    };
  }

  private isTestSite(): boolean {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    return frontendUrl === TEST_SITE_URL;
  }

  private async adminUserIds(): Promise<number[]> {
    const adminRole = await this.userRoleRepository.findOne({
      where: { name: "admin" },
      relations: ["users"],
    });
    return adminRole?.users.map((u) => u.id) ?? [];
  }

  private async notifyAdmins(dto: SubmitFeedbackDto, customerInfo: CustomerInfo): Promise<void> {
    const adminIds = await this.adminUserIds();

    if (adminIds.length === 0) {
      this.logger.warn("No admin users found to notify about customer feedback");
      return;
    }

    const broadcastContent = this.formatBroadcastContent(dto, customerInfo);

    await this.broadcastService.createBroadcast(adminIds[0], {
      title: `Customer Feedback - ${customerInfo.companyName}`,
      content: broadcastContent,
      targetAudience: BroadcastTarget.SPECIFIC,
      specificUserIds: adminIds,
      priority: BroadcastPriority.NORMAL,
      sendEmail: false,
    });

    const supportEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";
    await this.emailService.sendCustomerFeedbackNotificationEmail(
      supportEmail,
      customerInfo,
      dto.content,
      dto.source,
      dto.pageUrl || null,
    );

    this.logger.log(
      `Admin notification sent for customer feedback from ${customerInfo.companyName}`,
    );
  }

  private formatBroadcastContent(dto: SubmitFeedbackDto, customer: CustomerInfo): string {
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
}
