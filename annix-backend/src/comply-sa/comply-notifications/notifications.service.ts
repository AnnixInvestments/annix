import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { ComplySaUser } from "../companies/entities/user.entity";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { ComplySaDocument } from "../comply-documents/entities/document.entity";
import { daysBetween, formatDateZA, fromJSDate, now } from "../lib/datetime";
import { ComplySaNotification } from "./entities/notification.entity";
import { ComplySaNotificationPreferences } from "./entities/notification-preferences.entity";

const REMINDER_THRESHOLD_DAYS = 30;

interface DeliveryChannels {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

@Injectable()
export class ComplySaNotificationsService {
  private readonly logger = new Logger(ComplySaNotificationsService.name);
  private readonly twilioAccountSid: string | null;
  private readonly twilioAuthToken: string | null;
  private readonly twilioPhoneNumber: string | null;
  private readonly twilioWhatsappNumber: string | null;

  constructor(
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
    @InjectRepository(ComplySaNotification)
    private readonly notificationRepository: Repository<ComplySaNotification>,
    @InjectRepository(ComplySaNotificationPreferences)
    private readonly preferencesRepository: Repository<ComplySaNotificationPreferences>,
    @InjectRepository(ComplySaUser)
    private readonly userRepository: Repository<ComplySaUser>,
    @InjectRepository(ComplySaDocument)
    private readonly documentRepository: Repository<ComplySaDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.twilioAccountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID") ?? null;
    this.twilioAuthToken = this.configService.get<string>("TWILIO_AUTH_TOKEN") ?? null;
    this.twilioPhoneNumber = this.configService.get<string>("TWILIO_PHONE_NUMBER") ?? null;
    this.twilioWhatsappNumber = this.configService.get<string>("TWILIO_WHATSAPP_NUMBER") ?? null;
  }

  @Cron("0 6 * * *", { timeZone: "Africa/Johannesburg" })
  async processDeadlineNotifications(): Promise<void> {
    try {
      const statusesWithDueDates = await this.statusRepository.find({
        where: { nextDueDate: Not(IsNull()) },
        relations: ["requirement"],
      });

      const today = now();

      const pendingNotifications = statusesWithDueDates
        .map((status) => {
          const dueDate = fromJSDate(status.nextDueDate!);
          const daysUntilDue = daysBetween(today, dueDate);

          if (daysUntilDue < 0) {
            return { status, type: "overdue" as const, daysUntilDue };
          } else if (daysUntilDue <= 3) {
            return { status, type: "reminder_3d" as const, daysUntilDue };
          } else if (daysUntilDue <= 14) {
            return { status, type: "reminder_14d" as const, daysUntilDue };
          } else if (daysUntilDue <= REMINDER_THRESHOLD_DAYS) {
            return { status, type: "reminder_30d" as const, daysUntilDue };
          } else {
            return null;
          }
        })
        .filter(
          (
            n,
          ): n is {
            status: ComplySaComplianceStatus;
            type: "overdue" | "reminder_3d" | "reminder_14d" | "reminder_30d";
            daysUntilDue: number;
          } => n !== null,
        );

      const affectedCompanyIds = [
        ...new Set(pendingNotifications.map(({ status }) => status.companyId)),
      ];

      const allUsers =
        affectedCompanyIds.length > 0
          ? await this.userRepository.find({
              where: { companyId: In(affectedCompanyIds) },
            })
          : [];

      const allUserIds = allUsers.map((u) => u.id);

      const allPreferences =
        allUserIds.length > 0
          ? await this.preferencesRepository.find({
              where: { userId: In(allUserIds) },
            })
          : [];

      const usersByCompany = allUsers.reduce<Record<number, ComplySaUser[]>>(
        (acc, user) => ({
          ...acc,
          [user.companyId]: [...(acc[user.companyId] ?? []), user],
        }),
        {},
      );

      const preferencesByUserId = allPreferences.reduce<
        Record<number, ComplySaNotificationPreferences>
      >(
        (acc, prefs) => ({
          ...acc,
          [prefs.userId]: prefs,
        }),
        {},
      );

      const channelsFromPreferences = (userId: number): DeliveryChannels => {
        const prefs = preferencesByUserId[userId] ?? null;

        if (prefs === null) {
          return { inApp: true, email: true, sms: false, whatsapp: false };
        }

        return {
          inApp: prefs.inAppEnabled,
          email: prefs.emailEnabled,
          sms: prefs.smsEnabled,
          whatsapp: prefs.whatsappEnabled,
        };
      };

      await Promise.all(
        pendingNotifications.map(async ({ status, type, daysUntilDue }) => {
          const message = this.buildMessage(status, type, daysUntilDue);
          const isCritical = type === "overdue" || type === "reminder_3d";
          const users = usersByCompany[status.companyId] ?? [];

          await Promise.all(
            users.map(async (user) => {
              const channels = channelsFromPreferences(user.id);
              const prefs = preferencesByUserId[user.id] ?? null;

              if (channels.inApp) {
                const notification = this.notificationRepository.create({
                  companyId: status.companyId,
                  userId: user.id,
                  requirementId: status.requirementId,
                  channel: "in_app",
                  type,
                  message,
                });
                await this.notificationRepository.save(notification);
              }

              if (channels.email) {
                await this.sendEmail(
                  user.email,
                  this.emailSubject(type, status.requirement?.name ?? "Requirement"),
                  message,
                );
              }

              if (isCritical && channels.sms && prefs !== null && prefs.phone !== null) {
                await this.sendSms(prefs.phone, message);
              }

              if (isCritical && channels.whatsapp && prefs !== null && prefs.phone !== null) {
                await this.sendWhatsApp(prefs.phone, message);
              }
            }),
          );
        }),
      );

      this.logger.log(`Processed ${pendingNotifications.length} deadline notifications`);

      const overdueStatuses = statusesWithDueDates.filter((status) => {
        const dueDate = fromJSDate(status.nextDueDate!);
        return daysBetween(today, dueDate) < 0 && status.status !== "overdue";
      });

      if (overdueStatuses.length > 0) {
        await Promise.all(
          overdueStatuses.map((status) => {
            status.status = "overdue";
            return this.statusRepository.save(status);
          }),
        );
      }

      const warningStatuses = statusesWithDueDates.filter((status) => {
        const dueDate = fromJSDate(status.nextDueDate!);
        const daysUntil = daysBetween(today, dueDate);
        return (
          daysUntil <= REMINDER_THRESHOLD_DAYS && daysUntil >= 0 && status.status === "in_progress"
        );
      });

      if (warningStatuses.length > 0) {
        await Promise.all(
          warningStatuses.map((status) => {
            status.status = "warning";
            return this.statusRepository.save(status);
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process deadline notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @Cron("0 7 * * *", { timeZone: "Africa/Johannesburg" })
  async processDocumentExpiryWarnings(): Promise<void> {
    try {
      const today = now();

      const allDocumentsWithExpiry = await this.documentRepository.find({
        where: { expiryDate: Not(IsNull()) },
      });

      const documentsInRange = allDocumentsWithExpiry.filter((doc) => {
        const expiryDt = fromJSDate(doc.expiryDate!);
        const daysUntil = daysBetween(today, expiryDt);
        return daysUntil >= -1 && daysUntil <= REMINDER_THRESHOLD_DAYS;
      });

      const docCompanyIds = [...new Set(documentsInRange.map((doc) => doc.companyId))];

      const docUsers =
        docCompanyIds.length > 0
          ? await this.userRepository.find({
              where: { companyId: In(docCompanyIds) },
            })
          : [];

      const docUserIds = docUsers.map((u) => u.id);

      const docPreferences =
        docUserIds.length > 0
          ? await this.preferencesRepository.find({
              where: { userId: In(docUserIds) },
            })
          : [];

      const docUsersByCompany = docUsers.reduce<Record<number, ComplySaUser[]>>(
        (acc, user) => ({
          ...acc,
          [user.companyId]: [...(acc[user.companyId] ?? []), user],
        }),
        {},
      );

      const docPrefsByUserId = docPreferences.reduce<
        Record<number, ComplySaNotificationPreferences>
      >(
        (acc, prefs) => ({
          ...acc,
          [prefs.userId]: prefs,
        }),
        {},
      );

      const docChannelsFromPreferences = (userId: number): DeliveryChannels => {
        const prefs = docPrefsByUserId[userId] ?? null;

        if (prefs === null) {
          return { inApp: true, email: true, sms: false, whatsapp: false };
        }

        return {
          inApp: prefs.inAppEnabled,
          email: prefs.emailEnabled,
          sms: prefs.smsEnabled,
          whatsapp: prefs.whatsappEnabled,
        };
      };

      await Promise.all(
        documentsInRange.map(async (doc) => {
          const expiryDt = fromJSDate(doc.expiryDate!);
          const daysUntil = daysBetween(today, expiryDt);
          const formattedDate = formatDateZA(expiryDt);

          const message =
            daysUntil < 0
              ? `EXPIRED: Document "${doc.name}" expired on ${formattedDate}. Please upload a renewed version.`
              : `EXPIRING: Document "${doc.name}" expires on ${formattedDate} (${daysUntil} days). Please renew before expiry.`;

          const type = daysUntil < 0 ? "document_expired" : "document_expiring";
          const users = docUsersByCompany[doc.companyId] ?? [];

          await Promise.all(
            users.map(async (user) => {
              const channels = docChannelsFromPreferences(user.id);

              if (channels.inApp) {
                const notification = this.notificationRepository.create({
                  companyId: doc.companyId,
                  userId: user.id,
                  channel: "in_app",
                  type,
                  message,
                });
                await this.notificationRepository.save(notification);
              }

              if (channels.email) {
                const subject =
                  daysUntil < 0
                    ? `[EXPIRED] ${doc.name} - Comply SA`
                    : `[Expiring] ${doc.name} expires in ${daysUntil} days - Comply SA`;
                await this.sendEmail(user.email, subject, message);
              }
            }),
          );
        }),
      );

      this.logger.log(`Processed ${documentsInRange.length} document expiry warnings`);
    } catch (error) {
      this.logger.error(
        `Failed to process document expiry warnings: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async unreadForUser(userId: number): Promise<ComplySaNotification[]> {
    return this.notificationRepository.find({
      where: { userId, readAt: IsNull() },
      order: { sentAt: "DESC" },
    });
  }

  async markRead(notificationId: number): Promise<ComplySaNotification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (notification === null) {
      this.logger.warn(`Notification ${notificationId} not found for markRead`);
      throw new Error(`Notification ${notificationId} not found`);
    }

    notification.readAt = now().toJSDate();
    return this.notificationRepository.save(notification);
  }

  private buildMessage(
    status: ComplySaComplianceStatus,
    type: string,
    daysUntilDue: number,
  ): string {
    const requirementName = status.requirement?.name ?? "Requirement";

    const formattedDate =
      status.nextDueDate !== null ? formatDateZA(fromJSDate(status.nextDueDate)) : "unknown";

    if (type === "overdue") {
      return `OVERDUE: ${requirementName} was due on ${formattedDate}. Please address this immediately to avoid penalties.`;
    }

    return `REMINDER: ${requirementName} is due in ${daysUntilDue} days (${formattedDate}). Complete it before the deadline.`;
  }

  private emailSubject(type: string, requirementName: string): string {
    if (type === "overdue") {
      return `[OVERDUE] ${requirementName} - Comply SA`;
    } else if (type === "reminder_3d") {
      return `[URGENT] ${requirementName} due in 3 days - Comply SA`;
    } else if (type === "reminder_14d") {
      return `[Reminder] ${requirementName} due in 14 days - Comply SA`;
    } else {
      return `[Reminder] ${requirementName} due in 30 days - Comply SA`;
    }
  }

  private async sendEmail(to: string, subject: string, message: string): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to,
        subject,
        fromName: "Comply SA",
        isTransactional: true,
        html: this.emailHtml(subject, message),
        text: message,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private emailHtml(subject: string, message: string): string {
    return [
      "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>",
      "<body style='font-family:Arial,sans-serif;background:#f8fafc;padding:20px'>",
      "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0'>",
      "<div style='text-align:center;margin-bottom:24px'>",
      "<span style='font-size:24px;font-weight:bold;color:#0d9488'>Comply SA</span>",
      "</div>",
      `<h2 style='color:#1a365d;margin:0 0 16px'>${subject}</h2>`,
      `<p style='color:#4a5568;line-height:1.6'>${message}</p>`,
      "<div style='margin-top:24px;text-align:center'>",
      "<a href='https://comply-sa.annix.co.za/dashboard' style='display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold'>View Dashboard</a>",
      "</div>",
      "<hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0'>",
      "<p style='color:#a0aec0;font-size:12px;text-align:center'>Comply SA - SA SME Compliance Dashboard</p>",
      "</div></body></html>",
    ].join("");
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    if (
      this.twilioAccountSid === null ||
      this.twilioAuthToken === null ||
      this.twilioPhoneNumber === null
    ) {
      this.logger.warn("Twilio SMS not configured - skipping SMS delivery");
      return;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      const auth = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString(
        "base64",
      );

      const body = new URLSearchParams({
        To: phone,
        From: this.twilioPhoneNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Twilio SMS failed (${response.status}): ${errorBody}`);
      } else {
        this.logger.log(`SMS sent to ${phone}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${phone}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    if (
      this.twilioAccountSid === null ||
      this.twilioAuthToken === null ||
      this.twilioWhatsappNumber === null
    ) {
      this.logger.warn("Twilio WhatsApp not configured - skipping WhatsApp delivery");
      return;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      const auth = Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString(
        "base64",
      );

      const body = new URLSearchParams({
        To: `whatsapp:${phone}`,
        From: `whatsapp:${this.twilioWhatsappNumber}`,
        Body: message,
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Twilio WhatsApp failed (${response.status}): ${errorBody}`);
      } else {
        this.logger.log(`WhatsApp sent to ${phone}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp to ${phone}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
