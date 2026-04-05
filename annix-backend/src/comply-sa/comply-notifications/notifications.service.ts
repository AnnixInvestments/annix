import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import {
  ChannelKey,
  NotificationDispatcherService,
} from "../../notifications/notification-dispatcher.service";
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
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  @Cron("0 6 * * *", { name: "comply-sa:deadline-notifications", timeZone: "Africa/Johannesburg" })
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

              const channelKeys: ChannelKey[] = [];
              if (channels.email) {
                channelKeys.push("email");
              }
              if (isCritical && channels.sms && prefs?.phone) {
                channelKeys.push("sms");
              }
              if (isCritical && channels.whatsapp && prefs?.phone) {
                channelKeys.push("whatsapp");
              }

              if (channelKeys.length > 0) {
                const subject = this.emailSubject(type, status.requirement?.name ?? "Requirement");
                await this.dispatcher.dispatch({
                  recipient: {
                    userId: user.id,
                    email: user.email,
                    phone: prefs?.phone ?? null,
                  },
                  content: {
                    subject,
                    body: message,
                    html: this.emailHtml(subject, message),
                  },
                  channels: channelKeys,
                });
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

  @Cron("0 7 * * *", { name: "comply-sa:document-expiry", timeZone: "Africa/Johannesburg" })
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
                await this.dispatcher.dispatch({
                  recipient: { userId: user.id, email: user.email },
                  content: {
                    subject,
                    body: message,
                    html: this.emailHtml(subject, message),
                  },
                  channels: ["email"],
                });
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
}
