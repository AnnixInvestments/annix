import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decrypt, encrypt } from "../secure-documents/crypto.util";
import { InboundEmail, InboundEmailStatus } from "./entities/inbound-email.entity";
import {
  AttachmentExtractionStatus,
  InboundEmailAttachment,
} from "./entities/inbound-email-attachment.entity";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";
import { InboundEmailRepository, InboundEmailStatusCounts } from "./inbound-email.repository";
import { InboundEmailAttachmentRepository } from "./inbound-email-attachment.repository";
import { InboundEmailConfigRepository } from "./inbound-email-config.repository";

export interface InboundEmailConfigDto {
  emailHost: string | null;
  emailPort: number | null;
  emailUser: string | null;
  emailPass: string | null;
  tlsEnabled: boolean;
  tlsServerName: string | null;
  enabled: boolean;
}

export interface InboundEmailConfigResponse {
  emailHost: string | null;
  emailPort: number | null;
  emailUser: string | null;
  emailPassSet: boolean;
  tlsEnabled: boolean;
  tlsServerName: string | null;
  enabled: boolean;
  lastPollAt: string | null;
  lastError: string | null;
}

export interface InboundEmailListFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  documentType?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InboundEmailService {
  private readonly logger = new Logger(InboundEmailService.name);

  constructor(
    private readonly configRepo: InboundEmailConfigRepository,
    private readonly emailRepo: InboundEmailRepository,
    private readonly attachmentRepo: InboundEmailAttachmentRepository,
    private readonly configService: ConfigService,
  ) {}

  private encryptionKey(): string | null {
    return this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY") ?? null;
  }

  async rawEmailConfig(app: string, companyId: number | null): Promise<InboundEmailConfig | null> {
    return this.configRepo.findByAppAndCompany(app, companyId);
  }

  async allConfigs(): Promise<InboundEmailConfig[]> {
    return this.configRepo.findAllConfigs();
  }

  async setEnabled(
    app: string,
    companyId: number | null,
    enabled: boolean,
  ): Promise<{ message: string }> {
    const config = await this.configRepo.findByAppAndCompany(app, companyId);

    if (!config) {
      throw new NotFoundException("Inbound email configuration not found.");
    }

    config.enabled = enabled;
    await this.configRepo.save(config);

    return { message: enabled ? "Inbound email enabled." : "Inbound email disabled." };
  }

  async emailConfig(app: string, companyId: number): Promise<InboundEmailConfigResponse> {
    const config = await this.configRepo.findByAppAndCompany(app, companyId);

    if (!config) {
      return {
        emailHost: null,
        emailPort: 993,
        emailUser: null,
        emailPassSet: false,
        tlsEnabled: true,
        tlsServerName: null,
        enabled: false,
        lastPollAt: null,
        lastError: null,
      };
    }

    return {
      emailHost: config.emailHost,
      emailPort: config.emailPort,
      emailUser: config.emailUser,
      emailPassSet: !!config.emailPassEncrypted,
      tlsEnabled: config.tlsEnabled,
      tlsServerName: config.tlsServerName,
      enabled: config.enabled,
      lastPollAt: config.lastPollAt?.toISOString() ?? null,
      lastError: config.lastError,
    };
  }

  async updateEmailConfig(
    app: string,
    companyId: number,
    dto: InboundEmailConfigDto,
  ): Promise<{ message: string }> {
    const config = await this.configRepo.findByAppAndCompany(app, companyId);

    if (!dto.emailHost) {
      if (config) {
        await this.configRepo.remove(config);
      }
      return { message: "Inbound email configuration cleared." };
    }

    const key = this.encryptionKey();
    if (!key) {
      throw new Error("DOCUMENT_ENCRYPTION_KEY not configured. Cannot store email credentials.");
    }

    const emailPassEncrypted = dto.emailPass
      ? encrypt(dto.emailPass, key)
      : (config?.emailPassEncrypted ?? null);

    if (!emailPassEncrypted) {
      throw new BadRequestException("A mailbox password is required to enable inbound email.");
    }

    if (!config) {
      await this.configRepo.create({
        app,
        companyId,
        emailHost: dto.emailHost,
        emailPort: dto.emailPort ?? 993,
        emailUser: dto.emailUser ?? "",
        emailPassEncrypted,
        tlsEnabled: dto.tlsEnabled,
        tlsServerName: dto.tlsServerName,
        enabled: dto.enabled,
      } as Partial<InboundEmailConfig> as InboundEmailConfig);
      return { message: "Inbound email configuration saved." };
    }

    config.emailHost = dto.emailHost;
    config.emailPort = dto.emailPort ?? 993;
    config.emailUser = dto.emailUser ?? "";
    config.emailPassEncrypted = emailPassEncrypted;
    config.tlsEnabled = dto.tlsEnabled;
    config.tlsServerName = dto.tlsServerName;
    config.enabled = dto.enabled;

    await this.configRepo.save(config);
    return { message: "Inbound email configuration saved." };
  }

  async enabledConfigs(): Promise<InboundEmailConfig[]> {
    return this.configRepo.findAllEnabled();
  }

  async decryptPassword(config: InboundEmailConfig): Promise<string> {
    const key = this.encryptionKey();
    if (!key) {
      throw new Error("DOCUMENT_ENCRYPTION_KEY not configured");
    }
    return decrypt(config.emailPassEncrypted, key);
  }

  async updateLastPoll(configId: number, error: string | null): Promise<void> {
    await this.configRepo.updateLastPoll(configId, new Date(), error);
  }

  async emailExists(messageId: string): Promise<boolean> {
    return this.emailRepo.existsByMessageId(messageId);
  }

  async recordEmail(data: {
    configId: number;
    app: string;
    companyId: number | null;
    messageId: string;
    fromEmail: string;
    fromName: string | null;
    subject: string | null;
    receivedAt: Date | null;
    attachmentCount: number;
  }): Promise<InboundEmail> {
    return this.emailRepo.create({
      configId: data.configId,
      app: data.app,
      companyId: data.companyId,
      messageId: data.messageId,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
      subject: data.subject,
      receivedAt: data.receivedAt,
      attachmentCount: data.attachmentCount,
      processingStatus: InboundEmailStatus.PROCESSING,
    });
  }

  async createAttachment(data: {
    inboundEmailId: number;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    s3Path: string | null;
    documentType: string;
    classificationConfidence: number | null;
    classificationSource: string | null;
  }): Promise<InboundEmailAttachment> {
    // extractionStatus is schema-required; it starts PENDING and is updated to
    // the real outcome (completed/skipped/failed) once routing finishes.
    return this.attachmentRepo.create({
      ...data,
      extractionStatus: AttachmentExtractionStatus.PENDING,
    });
  }

  async updateAttachment(
    id: number,
    data: Partial<
      Pick<
        InboundEmailAttachment,
        | "linkedEntityType"
        | "linkedEntityId"
        | "extractionStatus"
        | "errorMessage"
        | "documentType"
        | "classificationConfidence"
        | "classificationSource"
        | "extractedData"
        | "s3Path"
      >
    >,
  ): Promise<void> {
    await this.attachmentRepo.updateFields(id, data);
  }

  async updateEmailStatus(
    id: number,
    status: InboundEmailStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.emailRepo.updateStatus(id, status, errorMessage ?? null);
  }

  async listEmails(
    app: string,
    companyId: number,
    filters: InboundEmailListFilters,
  ): Promise<{ items: InboundEmail[]; total: number }> {
    return this.emailRepo.listByAppAndCompany(app, companyId, filters);
  }

  async emailDetail(app: string, companyId: number, emailId: number): Promise<InboundEmail> {
    const email = await this.emailRepo.findById(emailId, ["attachments"]);

    if (!email || email.app !== app || email.companyId !== companyId) {
      throw new NotFoundException(`Inbound email ${emailId} not found`);
    }

    return email;
  }

  async reclassifyAttachment(
    attachmentId: number,
    newDocumentType: string,
  ): Promise<InboundEmailAttachment> {
    const attachment = await this.attachmentRepo.findById(attachmentId);

    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    attachment.documentType = newDocumentType;
    attachment.classificationSource = "manual";
    attachment.classificationConfidence = 1.0;
    attachment.linkedEntityType = null;
    attachment.linkedEntityId = null;
    attachment.extractionStatus = AttachmentExtractionStatus.SKIPPED;

    return this.attachmentRepo.save(attachment);
  }

  async attachmentById(attachmentId: number): Promise<InboundEmailAttachment> {
    const attachment = await this.attachmentRepo.findById(attachmentId, ["inboundEmail"]);

    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    return attachment;
  }

  async listSkippedAttachments(app: string): Promise<InboundEmailAttachment[]> {
    return this.attachmentRepo.findSkippedClassifiedByApp(app);
  }

  async emailStats(app: string, companyId: number): Promise<InboundEmailStatusCounts> {
    return this.emailRepo.statsByAppAndCompany(app, companyId);
  }
}
