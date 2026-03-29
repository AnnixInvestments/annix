import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { EmailService } from "../email/email.service";
import { formatDateTime, now } from "../lib/datetime";
import { ConversationType, RelatedEntityType } from "../messaging/entities";
import { MessagingService } from "../messaging/messaging.service";
import { type IStorageService, STORAGE_SERVICE, StorageArea } from "../storage/storage.interface";
import { User } from "../user/entities/user.entity";
import { SubmitFeedbackDto, SubmitFeedbackResponseDto } from "./dto";
import { CustomerFeedback, type SubmitterType } from "./entities/customer-feedback.entity";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";
import { FeedbackGithubService } from "./feedback-github.service";
import type { FeedbackSubmitter } from "./guards/feedback-auth.guard";

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  userId: number;
}

interface GeneralFeedbackDto {
  content: string;
  source: "text" | "voice";
  pageUrl: string | null;
  appContext: string | null;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(CustomerFeedback)
    private readonly feedbackRepository: Repository<CustomerFeedback>,
    @InjectRepository(FeedbackAttachment)
    private readonly attachmentRepository: Repository<FeedbackAttachment>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly feedbackGithubService: FeedbackGithubService,
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
      submitterType: "customer",
      submitterName: `${customerInfo.firstName} ${customerInfo.lastName}`,
      submitterEmail: customerInfo.email,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    const conversationId = await this.createFeedbackConversation(savedFeedback, dto, customerInfo);

    if (conversationId) {
      savedFeedback.conversationId = conversationId;
      await this.feedbackRepository.save(savedFeedback);
    }

    await this.sendEmailNotification(dto, customerInfo);

    this.createGithubIssueAsync(savedFeedback.id);

    this.logger.log(
      `Feedback submitted by customer ${customerId}, conversation #${conversationId}`,
    );

    return {
      id: savedFeedback.id,
      message: "Feedback submitted successfully",
    };
  }

  async submitGeneralFeedback(
    submitter: FeedbackSubmitter,
    dto: GeneralFeedbackDto,
    files: Express.Multer.File[],
  ): Promise<SubmitFeedbackResponseDto> {
    const feedback = this.feedbackRepository.create({
      customerProfileId: null,
      content: dto.content,
      source: dto.source,
      pageUrl: dto.pageUrl,
      submitterType: submitter.type as SubmitterType,
      submitterName: submitter.displayName,
      submitterEmail: submitter.email,
      appContext: dto.appContext,
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    const attachments = await this.uploadAttachments(savedFeedback.id, files);

    const conversationId = await this.createGeneralFeedbackConversation(
      savedFeedback,
      submitter,
      attachments,
    );

    if (conversationId) {
      savedFeedback.conversationId = conversationId;
      await this.feedbackRepository.save(savedFeedback);
    }

    await this.sendGeneralEmailNotification(submitter, dto, attachments.length);

    this.createGithubIssueAsync(savedFeedback.id);

    this.logger.log(
      `Feedback submitted by ${submitter.type} user ${submitter.userId} (${submitter.displayName}), ${attachments.length} attachment(s)`,
    );

    return {
      id: savedFeedback.id,
      message: "Feedback submitted successfully",
    };
  }

  private async uploadAttachments(
    feedbackId: number,
    files: Express.Multer.File[],
  ): Promise<FeedbackAttachment[]> {
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const isAutoScreenshot = file.originalname === "auto-screenshot.png";
        const result = await this.storageService.upload(
          file,
          `${StorageArea.ANNIX_APP}/feedback/${feedbackId}`,
        );

        const attachment = this.attachmentRepository.create({
          feedbackId,
          filePath: result.path,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          isAutoScreenshot,
        });

        return this.attachmentRepository.save(attachment);
      }),
    );

    return uploadResults;
  }

  async attachmentUrls(
    feedbackId: number,
  ): Promise<Array<{ id: number; url: string; filename: string; isAutoScreenshot: boolean }>> {
    const attachments = await this.attachmentRepository.find({
      where: { feedbackId },
      order: { createdAt: "ASC" },
    });

    const urls = await Promise.all(
      attachments.map(async (att) => ({
        id: att.id,
        url: await this.storageService.presignedUrl(att.filePath),
        filename: att.originalFilename,
        isAutoScreenshot: att.isAutoScreenshot,
      })),
    );

    return urls;
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
      relations: [
        "customerProfile",
        "customerProfile.company",
        "assignedTo",
        "conversation",
        "attachments",
      ],
    });
  }

  async markResolvedByIssue(issueNumber: number, prNumber: number): Promise<void> {
    const feedback = await this.feedbackRepository.findOne({
      where: { githubIssueNumber: issueNumber },
      relations: ["conversation"],
    });

    if (!feedback) {
      this.logger.warn(`No feedback found for GitHub issue #${issueNumber}`);
      return;
    }

    feedback.status = "resolved";
    await this.feedbackRepository.save(feedback);

    if (feedback.conversationId) {
      const adminIds = await this.adminUserIds();
      const senderId = adminIds[0];

      if (senderId) {
        await this.messagingService.sendMessage(feedback.conversationId, senderId, {
          content: `*Your feedback has been addressed in PR #${prNumber} and deployed. Thank you for reporting this!*`,
        });
      }
    }

    this.logger.log(
      `Feedback #${feedback.id} resolved via GitHub issue #${issueNumber}, PR #${prNumber}`,
    );
  }

  async allFeedback(): Promise<CustomerFeedback[]> {
    return this.feedbackRepository.find({
      relations: ["customerProfile", "customerProfile.company", "assignedTo", "attachments"],
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

  private async createGeneralFeedbackConversation(
    feedback: CustomerFeedback,
    submitter: FeedbackSubmitter,
    attachments: FeedbackAttachment[],
  ): Promise<number | null> {
    const adminIds = await this.adminUserIds();

    if (adminIds.length === 0) {
      this.logger.warn("No admin users found to create feedback conversation");
      return null;
    }

    const uniqueParticipantIds = [...new Set(adminIds)];

    const timestamp = formatDateTime(now().toJSDate());
    const attachmentNote =
      attachments.length > 0
        ? `\n\n*${attachments.length} attachment(s) included${attachments.some((a) => a.isAutoScreenshot) ? " (including auto-screenshot)" : ""}*`
        : "";

    const initialMessage = `**Feedback from ${submitter.type} user**

**From:** ${submitter.displayName}
**Email:** ${submitter.email}
**App:** ${feedback.appContext || submitter.type}
**Page:** ${feedback.pageUrl || "unknown"}

---

${feedback.content}

---
*Submitted via ${feedback.source === "voice" ? "voice recording" : "text"}*
*Date: ${timestamp}*${attachmentNote}`;

    const creatorId = adminIds[0];

    const conversation = await this.messagingService.createConversation(creatorId, {
      subject: `Feedback: ${submitter.displayName} (${submitter.type})`,
      conversationType: ConversationType.SUPPORT,
      relatedEntityType: RelatedEntityType.FEEDBACK,
      relatedEntityId: feedback.id,
      participantIds: uniqueParticipantIds,
      initialMessage,
    });

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

  private async sendGeneralEmailNotification(
    submitter: FeedbackSubmitter,
    dto: GeneralFeedbackDto,
    attachmentCount: number,
  ): Promise<void> {
    const supportEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";

    const customerInfo: CustomerInfo = {
      firstName: submitter.displayName.split(" ")[0] || submitter.displayName,
      lastName: submitter.displayName.split(" ").slice(1).join(" ") || "",
      email: submitter.email,
      companyName: `${submitter.type} user`,
      userId: submitter.userId,
    };

    const contentWithAttachments =
      attachmentCount > 0
        ? `${dto.content}\n\n[${attachmentCount} attachment(s) included]`
        : dto.content;

    await this.emailService.sendCustomerFeedbackNotificationEmail(
      supportEmail,
      customerInfo,
      contentWithAttachments,
      dto.source,
      dto.pageUrl,
    );
  }

  private createGithubIssueAsync(feedbackId: number): void {
    this.feedbackRepository
      .findOne({ where: { id: feedbackId } })
      .then((feedback) => {
        if (feedback) {
          return this.feedbackGithubService.createIssueFromFeedback(feedback);
        }
        return null;
      })
      .catch((error) => {
        this.logger.error(
          `Background GitHub issue creation failed for feedback #${feedbackId}: ${error}`,
        );
      });
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
