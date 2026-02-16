import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { EmailService } from "../email/email.service";
import { formatDateTime, now } from "../lib/datetime";
import { ConversationType, RelatedEntityType } from "../messaging/entities";
import { MessagingService } from "../messaging/messaging.service";
import { User } from "../user/entities/user.entity";
import { SubmitFeedbackDto, SubmitFeedbackResponseDto } from "./dto";
import { CustomerFeedback } from "./entities/customer-feedback.entity";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  userId: number;
}

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
    private readonly messagingService: MessagingService,
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
      userId: profile.userId,
    };

    const feedback = this.feedbackRepository.create({
      customerProfileId: customerId,
      content: dto.content,
      source: dto.source,
      pageUrl: dto.pageUrl || null,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    const conversationId = await this.createFeedbackConversation(savedFeedback, dto, customerInfo);

    if (conversationId) {
      savedFeedback.conversationId = conversationId;
      await this.feedbackRepository.save(savedFeedback);
    }

    await this.sendEmailNotification(dto, customerInfo);

    this.logger.log(
      `Feedback submitted by customer ${customerId}, conversation #${conversationId}`,
    );

    return {
      id: savedFeedback.id,
      message: "Feedback submitted successfully",
    };
  }

  async assignFeedback(feedbackId: number, adminUserId: number): Promise<CustomerFeedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ["conversation"],
    });

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    feedback.assignedToId = adminUserId;
    await this.feedbackRepository.save(feedback);

    if (feedback.conversationId) {
      const admin = await this.userRepository.findOne({ where: { id: adminUserId } });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "An admin";

      await this.messagingService.sendMessage(feedback.conversationId, adminUserId, {
        content: `*${adminName} is now handling this feedback request.*`,
      });
    }

    this.logger.log(`Feedback #${feedbackId} assigned to admin user #${adminUserId}`);

    return feedback;
  }

  async unassignFeedback(feedbackId: number, adminUserId: number): Promise<CustomerFeedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    feedback.assignedToId = null;
    await this.feedbackRepository.save(feedback);

    if (feedback.conversationId) {
      const admin = await this.userRepository.findOne({ where: { id: adminUserId } });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "An admin";

      await this.messagingService.sendMessage(feedback.conversationId, adminUserId, {
        content: `*${adminName} has unassigned from this feedback request.*`,
      });
    }

    this.logger.log(`Feedback #${feedbackId} unassigned by admin user #${adminUserId}`);

    return feedback;
  }

  async feedbackById(feedbackId: number): Promise<CustomerFeedback | null> {
    return this.feedbackRepository.findOne({
      where: { id: feedbackId },
      relations: ["customerProfile", "customerProfile.company", "assignedTo", "conversation"],
    });
  }

  async allFeedback(): Promise<CustomerFeedback[]> {
    return this.feedbackRepository.find({
      relations: ["customerProfile", "customerProfile.company", "assignedTo"],
      order: { createdAt: "DESC" },
    });
  }

  private async createFeedbackConversation(
    feedback: CustomerFeedback,
    dto: SubmitFeedbackDto,
    customerInfo: CustomerInfo,
  ): Promise<number | null> {
    const adminIds = await this.adminUserIds();

    if (adminIds.length === 0) {
      this.logger.warn("No admin users found to create feedback conversation");
      return null;
    }

    const participantIds = [...adminIds, customerInfo.userId];
    const uniqueParticipantIds = [...new Set(participantIds)];

    const timestamp = formatDateTime(now().toJSDate());
    const initialMessage = this.formatInitialMessage(dto, customerInfo, timestamp);

    const conversation = await this.messagingService.createConversation(customerInfo.userId, {
      subject: `Feedback: ${customerInfo.companyName} - ${customerInfo.firstName} ${customerInfo.lastName}`,
      conversationType: ConversationType.SUPPORT,
      relatedEntityType: RelatedEntityType.FEEDBACK,
      relatedEntityId: feedback.id,
      participantIds: uniqueParticipantIds,
      initialMessage,
    });

    this.logger.log(
      `Created feedback conversation #${conversation.id} with ${uniqueParticipantIds.length} participants`,
    );

    return conversation.id;
  }

  private async adminUserIds(): Promise<number[]> {
    const adminUsers = await this.userRepository
      .createQueryBuilder("user")
      .innerJoin("user.roles", "role", "role.name = :roleName", { roleName: "admin" })
      .select("user.id")
      .getMany();

    return adminUsers.map((u) => u.id);
  }

  private async sendEmailNotification(
    dto: SubmitFeedbackDto,
    customerInfo: CustomerInfo,
  ): Promise<void> {
    const supportEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";

    await this.emailService.sendCustomerFeedbackNotificationEmail(
      supportEmail,
      customerInfo,
      dto.content,
      dto.source,
      dto.pageUrl || null,
    );
  }

  private formatInitialMessage(
    dto: SubmitFeedbackDto,
    customer: CustomerInfo,
    timestamp: string,
  ): string {
    return `**Customer Feedback**

**From:** ${customer.firstName} ${customer.lastName}
**Company:** ${customer.companyName}
**Email:** ${customer.email}

---

${dto.content}

---
*Submitted via ${dto.source === "voice" ? "voice recording" : "text"} from ${dto.pageUrl || "unknown page"}*
*Date: ${timestamp}*`;
  }
}
