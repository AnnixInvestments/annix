import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { now } from "../../../lib/datetime";
import {
  type IStorageService,
  STORAGE_SERVICE,
  StorageArea,
} from "../../../storage/storage.interface";
import { StockControlRole, StockControlUser } from "../../entities/stock-control-user.entity";
import {
  NotificationActionType,
  WorkflowNotification,
} from "../../entities/workflow-notification.entity";
import { CompanyEmailService } from "../../services/company-email.service";
import { WebPushService } from "../../services/web-push.service";
import { CalibrationCertificate } from "../entities/calibration-certificate.entity";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface UploadCalibrationCertificateDto {
  equipmentName: string;
  equipmentIdentifier?: string | null;
  certificateNumber?: string | null;
  description?: string | null;
  expiryDate: string;
}

export interface UpdateCalibrationCertificateDto {
  equipmentName?: string;
  equipmentIdentifier?: string | null;
  certificateNumber?: string | null;
  description?: string | null;
  expiryDate?: string;
}

@Injectable()
export class CalibrationCertificateService {
  private readonly logger = new Logger(CalibrationCertificateService.name);

  constructor(
    @InjectRepository(CalibrationCertificate)
    private readonly calCertRepo: Repository<CalibrationCertificate>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(WorkflowNotification)
    private readonly notificationRepo: Repository<WorkflowNotification>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly companyEmailService: CompanyEmailService,
    private readonly webPushService: WebPushService,
  ) {}

  async uploadCalibrationCertificate(
    companyId: number,
    dto: UploadCalibrationCertificateDto,
    file: Express.Multer.File,
    user: UserContext,
  ): Promise<CalibrationCertificate> {
    if (!dto.equipmentName || dto.equipmentName.trim().length === 0) {
      throw new BadRequestException("Equipment name is required");
    }

    if (!dto.expiryDate) {
      throw new BadRequestException("Expiry date is required");
    }

    const subPath = `${StorageArea.STOCK_CONTROL}/calibration-certificates/${companyId}`;
    const storageResult = await this.storageService.upload(file, subPath);

    const certificate = this.calCertRepo.create({
      companyId,
      equipmentName: dto.equipmentName.trim(),
      equipmentIdentifier: dto.equipmentIdentifier?.trim() || null,
      certificateNumber: dto.certificateNumber?.trim() || null,
      filePath: storageResult.path,
      originalFilename: storageResult.originalFilename,
      fileSizeBytes: storageResult.size,
      mimeType: storageResult.mimeType,
      description: dto.description || null,
      expiryDate: dto.expiryDate,
      isActive: true,
      uploadedById: user.id,
      uploadedByName: user.name,
    });

    const saved = await this.calCertRepo.save(certificate);
    this.logger.log(
      `Calibration certificate uploaded: ${dto.equipmentName} expires=${dto.expiryDate} by ${user.name}`,
    );

    return saved;
  }

  async findAll(
    companyId: number,
    filters?: { active?: boolean },
  ): Promise<CalibrationCertificate[]> {
    const qb = this.calCertRepo
      .createQueryBuilder("cal")
      .where("cal.companyId = :companyId", { companyId })
      .orderBy("cal.expiryDate", "ASC");

    if (filters?.active !== undefined) {
      qb.andWhere("cal.isActive = :active", { active: filters.active });
    }

    return qb.getMany();
  }

  async findById(companyId: number, id: number): Promise<CalibrationCertificate> {
    const cert = await this.calCertRepo.findOne({
      where: { id, companyId },
    });

    if (!cert) {
      throw new NotFoundException("Calibration certificate not found");
    }

    return cert;
  }

  async presignedUrl(companyId: number, id: number): Promise<string> {
    const cert = await this.findById(companyId, id);
    return this.storageService.getPresignedUrl(cert.filePath, 3600);
  }

  async updateCertificate(
    companyId: number,
    id: number,
    dto: UpdateCalibrationCertificateDto,
  ): Promise<CalibrationCertificate> {
    const cert = await this.findById(companyId, id);

    if (dto.equipmentName !== undefined) cert.equipmentName = dto.equipmentName.trim();
    if (dto.equipmentIdentifier !== undefined)
      cert.equipmentIdentifier = dto.equipmentIdentifier?.trim() || null;
    if (dto.certificateNumber !== undefined)
      cert.certificateNumber = dto.certificateNumber?.trim() || null;
    if (dto.description !== undefined) cert.description = dto.description || null;
    if (dto.expiryDate !== undefined) {
      cert.expiryDate = dto.expiryDate;
      cert.expiryWarningSentAt = null;
      cert.expiryNotificationSentAt = null;
    }

    return this.calCertRepo.save(cert);
  }

  async deactivateCertificate(companyId: number, id: number): Promise<CalibrationCertificate> {
    const cert = await this.findById(companyId, id);
    cert.isActive = false;
    return this.calCertRepo.save(cert);
  }

  async deleteCertificate(companyId: number, id: number): Promise<void> {
    const cert = await this.findById(companyId, id);

    await this.storageService.delete(cert.filePath);
    await this.calCertRepo.remove(cert);

    this.logger.log(`Calibration certificate deleted: id=${id} equipment=${cert.equipmentName}`);
  }

  async activeCertificatesForCompany(companyId: number): Promise<CalibrationCertificate[]> {
    return this.calCertRepo.find({
      where: { companyId, isActive: true },
      order: { equipmentName: "ASC" },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiryNotifications(): Promise<void> {
    this.logger.log("Running daily calibration certificate expiry check...");

    const today = now().startOf("day");
    const thirtyDaysFromNow = today.plus({ days: 30 }).toJSDate();
    const todayDate = today.toJSDate();

    const warningCerts = await this.calCertRepo.find({
      where: {
        isActive: true,
        expiryDate: LessThanOrEqual(thirtyDaysFromNow.toISOString().split("T")[0]),
        expiryWarningSentAt: IsNull(),
        expiryNotificationSentAt: IsNull(),
      },
    });

    const expiredCerts = await this.calCertRepo.find({
      where: {
        isActive: true,
        expiryDate: LessThanOrEqual(todayDate.toISOString().split("T")[0]),
        expiryNotificationSentAt: IsNull(),
      },
    });

    if (warningCerts.length === 0 && expiredCerts.length === 0) {
      this.logger.log("No calibration certificates need expiry notifications");
      return;
    }

    const allCerts = [...warningCerts, ...expiredCerts];
    const companyIds = [...new Set(allCerts.map((c) => c.companyId))];

    await Promise.all(
      companyIds.map(async (companyId) => {
        const managers = await this.userRepo.find({
          where: [
            { companyId, role: StockControlRole.MANAGER },
            { companyId, role: StockControlRole.ADMIN },
          ],
        });

        if (managers.length === 0) return;

        const companyExpired = expiredCerts.filter((c) => c.companyId === companyId);
        const companyWarning = warningCerts.filter(
          (c) => c.companyId === companyId && !companyExpired.some((e) => e.id === c.id),
        );

        await Promise.all(
          companyExpired.map((cert) =>
            this.sendExpiryNotification(companyId, cert, managers, true),
          ),
        );

        await Promise.all(
          companyWarning.map((cert) =>
            this.sendExpiryNotification(companyId, cert, managers, false),
          ),
        );
      }),
    );

    this.logger.log(
      `Calibration expiry check complete: ${expiredCerts.length} expired, ${warningCerts.length} warnings`,
    );
  }

  private async sendExpiryNotification(
    companyId: number,
    cert: CalibrationCertificate,
    recipients: StockControlUser[],
    isExpired: boolean,
  ): Promise<void> {
    const actionType = isExpired
      ? NotificationActionType.CALIBRATION_EXPIRED
      : NotificationActionType.CALIBRATION_EXPIRY_WARNING;

    const title = isExpired
      ? `Calibration Expired: ${cert.equipmentName}`
      : `Calibration Expiring Soon: ${cert.equipmentName}`;

    const message = isExpired
      ? `The calibration certificate for ${cert.equipmentName}${cert.equipmentIdentifier ? ` (${cert.equipmentIdentifier})` : ""} expired on ${cert.expiryDate}. Please arrange recertification.`
      : `The calibration certificate for ${cert.equipmentName}${cert.equipmentIdentifier ? ` (${cert.equipmentIdentifier})` : ""} expires on ${cert.expiryDate}. Please arrange recertification before the expiry date.`;

    const notifications = recipients.map((user) =>
      this.notificationRepo.create({
        companyId,
        userId: user.id,
        jobCardId: null,
        title,
        message,
        actionType,
        actionUrl: null,
      }),
    );

    await this.notificationRepo.save(notifications);

    this.webPushService
      .sendToUsers(
        recipients.map((u) => u.id),
        {
          title,
          body: message,
          tag: `cal-expiry-${cert.id}`,
          data: {},
        },
      )
      .catch((err) => this.logger.warn(`Push notification failed: ${err.message}`));

    await Promise.all(
      recipients.map((user) =>
        this.sendCalibrationExpiryEmail(companyId, user.email, user.name, cert, isExpired),
      ),
    );

    if (isExpired) {
      cert.expiryNotificationSentAt = now().toJSDate();
    } else {
      cert.expiryWarningSentAt = now().toJSDate();
    }

    await this.calCertRepo.save(cert);

    this.logger.log(
      `Sent ${isExpired ? "expiry" : "warning"} notification for ${cert.equipmentName} to ${recipients.length} users`,
    );
  }

  private async sendCalibrationExpiryEmail(
    companyId: number,
    email: string,
    recipientName: string,
    cert: CalibrationCertificate,
    isExpired: boolean,
  ): Promise<boolean> {
    const statusColor = isExpired ? "#dc2626" : "#f59e0b";
    const statusLabel = isExpired ? "Expired" : "Expiring Soon";
    const statusBg = isExpired ? "#fef2f2" : "#fffbeb";

    const identifierLine = cert.equipmentIdentifier
      ? `<strong>Equipment ID:</strong> ${cert.equipmentIdentifier}<br/>`
      : "";
    const certNumberLine = cert.certificateNumber
      ? `<strong>Certificate No:</strong> ${cert.certificateNumber}<br/>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Calibration Certificate ${statusLabel} - Stock Control</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${statusColor};">Calibration Certificate ${statusLabel}</h1>
          <p>Hello ${recipientName},</p>
          <p>${isExpired ? "A calibration certificate has expired and needs immediate attention." : "A calibration certificate is expiring within 30 days."}</p>

          <div style="background-color: ${statusBg}; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0;">
            <strong>Certificate Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Equipment:</strong> ${cert.equipmentName}<br/>
              ${identifierLine}
              ${certNumberLine}
              <strong>Expiry Date:</strong> ${cert.expiryDate}<br/>
              <strong>File:</strong> ${cert.originalFilename}
            </p>
          </div>

          <p>${isExpired ? "Please arrange recertification as soon as possible." : "Please arrange recertification before the expiry date to avoid any gaps in compliance."}</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from Stock Control.
          </p>
        </div>
      </body>
      </html>
    `;

    const subject = isExpired
      ? `Calibration Expired: ${cert.equipmentName} (expired ${cert.expiryDate})`
      : `Calibration Expiring: ${cert.equipmentName} (expires ${cert.expiryDate})`;

    return this.companyEmailService.sendEmail(companyId, { to: email, subject, html });
  }
}
