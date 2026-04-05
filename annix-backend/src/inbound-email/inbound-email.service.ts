import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { decrypt, encrypt } from "../secure-documents/crypto.util";
import { InboundEmail, InboundEmailStatus } from "./entities/inbound-email.entity";
import {
  AttachmentExtractionStatus,
  InboundEmailAttachment,
} from "./entities/inbound-email-attachment.entity";
import { InboundEmailConfig } from "./entities/inbound-email-config.entity";

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
    @InjectRepository(InboundEmailConfig)
    private readonly configRepo: Repository<InboundEmailConfig>,
    @InjectRepository(InboundEmail)
    private readonly emailRepo: Repository<InboundEmail>,
    @InjectRepository(InboundEmailAttachment)
    private readonly attachmentRepo: Repository<InboundEmailAttachment>,
    private readonly configService: ConfigService,
  ) {}

  private encryptionKey(): string | null {
    return this.configService.get<string>("DOCUMENT_ENCRYPTION_KEY") ?? null;
  }

  async rawEmailConfig(app: string, companyId: number): Promise<InboundEmailConfig | null> {
    return this.configRepo.findOne({ where: { app, companyId } });
  }

  async emailConfig(app: string, companyId: number): Promise<InboundEmailConfigResponse> {
    const config = await this.configRepo.findOne({ where: { app, companyId } });

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
    const key = this.encryptionKey();

    let config = await this.configRepo.findOne({ where: { app, companyId } });

    if (!dto.emailHost) {
      if (config) {
        await this.configRepo.remove(config);
      }
      return { message: "Inbound email configuration cleared." };
    }

    if (!key) {
      throw new Error("DOCUMENT_ENCRYPTION_KEY not configured. Cannot store email credentials.");
    }

    if (!config) {
      config = this.configRepo.create({ app, companyId });
    }

    config.emailHost = dto.emailHost;
    config.emailPort = dto.emailPort ?? 993;
    config.emailUser = dto.emailUser ?? "";
    config.tlsEnabled = dto.tlsEnabled;
    config.tlsServerName = dto.tlsServerName;
    config.enabled = dto.enabled;

    if (dto.emailPass) {
      config.emailPassEncrypted = encrypt(dto.emailPass, key);
    }

    await this.configRepo.save(config);
    return { message: "Inbound email configuration saved." };
  }

  async enabledConfigs(): Promise<InboundEmailConfig[]> {
    return this.configRepo.find({ where: { enabled: true } });
  }

  async decryptPassword(config: InboundEmailConfig): Promise<string> {
    const key = this.encryptionKey();
    if (!key) {
      throw new Error("DOCUMENT_ENCRYPTION_KEY not configured");
    }
    return decrypt(config.emailPassEncrypted, key);
  }

  async updateLastPoll(configId: number, error: string | null): Promise<void> {
    await this.configRepo.update(configId, {
      lastPollAt: new Date(),
      lastError: error,
    });
  }

  async emailExists(messageId: string): Promise<boolean> {
    const count = await this.emailRepo.count({ where: { messageId } });
    return count > 0;
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
    const email = this.emailRepo.create({
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
    return this.emailRepo.save(email);
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
    const attachment = this.attachmentRepo.create(data);
    return this.attachmentRepo.save(attachment);
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
    await this.attachmentRepo.update(id, data);
  }

  async updateEmailStatus(
    id: number,
    status: InboundEmailStatus,
    errorMessage?: string,
  ): Promise<void> {
    await this.emailRepo.update(id, {
      processingStatus: status,
      errorMessage: errorMessage ?? null,
    });
  }

  async listEmails(
    app: string,
    companyId: number,
    filters: InboundEmailListFilters,
  ): Promise<{ items: InboundEmail[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    const qb = this.emailRepo
      .createQueryBuilder("email")
      .leftJoinAndSelect("email.attachments", "attachment")
      .where("email.app = :app", { app })
      .andWhere("email.company_id = :companyId", { companyId })
      .orderBy("email.created_at", "DESC");

    if (filters.status) {
      qb.andWhere("email.processing_status = :status", { status: filters.status });
    }

    if (filters.dateFrom) {
      qb.andWhere("email.created_at >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("email.created_at <= :dateTo", { dateTo: filters.dateTo });
    }

    if (filters.documentType) {
      qb.andWhere("attachment.document_type = :docType", { docType: filters.documentType });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async emailDetail(app: string, companyId: number, emailId: number): Promise<InboundEmail> {
    const email = await this.emailRepo.findOne({
      where: { id: emailId, app, companyId },
      relations: ["attachments"],
    });

    if (!email) {
      throw new NotFoundException(`Inbound email ${emailId} not found`);
    }

    return email;
  }

  async reclassifyAttachment(
    attachmentId: number,
    newDocumentType: string,
  ): Promise<InboundEmailAttachment> {
    const attachment = await this.attachmentRepo.findOne({ where: { id: attachmentId } });

    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    attachment.documentType = newDocumentType;
    attachment.classificationSource = "manual";
    attachment.classificationConfidence = 1.0;
    attachment.linkedEntityType = null;
    attachment.linkedEntityId = null;
    attachment.extractionStatus = AttachmentExtractionStatus.PENDING;

    return this.attachmentRepo.save(attachment);
  }

  async attachmentById(attachmentId: number): Promise<InboundEmailAttachment> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId },
      relations: ["inboundEmail"],
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }

    return attachment;
  }

  async emailStats(
    app: string,
    companyId: number,
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    unclassified: number;
    pending: number;
  }> {
    const results = await this.emailRepo
      .createQueryBuilder("email")
      .select("email.processing_status", "status")
      .addSelect("COUNT(*)", "count")
      .where("email.app = :app", { app })
      .andWhere("email.company_id = :companyId", { companyId })
      .groupBy("email.processing_status")
      .getRawMany();

    const counts = results.reduce(
      (acc: Record<string, number>, row: { status: string; count: string }) => ({
        ...acc,
        [row.status]: parseInt(row.count, 10),
      }),
      {} as Record<string, number>,
    );

    const total = (Object.values(counts) as number[]).reduce(
      (sum: number, c: number) => sum + c,
      0,
    );

    return {
      total,
      completed: counts[InboundEmailStatus.COMPLETED] ?? 0,
      failed: counts[InboundEmailStatus.FAILED] ?? 0,
      unclassified: counts[InboundEmailStatus.UNCLASSIFIED] ?? 0,
      pending:
        (counts[InboundEmailStatus.PENDING] ?? 0) + (counts[InboundEmailStatus.PROCESSING] ?? 0),
    };
  }
}
