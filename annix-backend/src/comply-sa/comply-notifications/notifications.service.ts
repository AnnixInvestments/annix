import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { daysBetween, fromISO, now, nowISO } from "../lib/datetime";
import { ComplySaNotification } from "./entities/notification.entity";

@Injectable()
export class ComplySaNotificationsService {
  private readonly logger = new Logger(ComplySaNotificationsService.name);

  constructor(
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
    @InjectRepository(ComplySaNotification)
    private readonly notificationRepository: Repository<ComplySaNotification>,
  ) {}

  @Cron("0 6 * * *", { timeZone: "Africa/Johannesburg" })
  async processDeadlineNotifications(): Promise<void> {
    const statusesWithDueDates = await this.statusRepository.find({
      where: { nextDueDate: Not(IsNull()) },
      relations: ["requirement"],
    });

    const today = now();

    const notifications = statusesWithDueDates
      .map((status) => {
        const dueDate = fromISO(status.nextDueDate!);
        const daysUntilDue = daysBetween(today, dueDate);

        if (daysUntilDue < 0) {
          return this.createOverdueNotification(status);
        } else if (daysUntilDue <= 3) {
          return this.createReminderNotification(status, "reminder_3d", daysUntilDue);
        } else if (daysUntilDue <= 14) {
          return this.createReminderNotification(status, "reminder_14d", daysUntilDue);
        } else if (daysUntilDue <= 30) {
          return this.createReminderNotification(status, "reminder_30d", daysUntilDue);
        } else {
          return null;
        }
      })
      .filter((n): n is ComplySaNotification => n !== null);

    if (notifications.length > 0) {
      await this.notificationRepository.save(notifications);
      this.logger.log(`Created ${notifications.length} deadline notifications`);
    }

    const overdueStatuses = statusesWithDueDates.filter((status) => {
      const dueDate = fromISO(status.nextDueDate!);
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
      const dueDate = fromISO(status.nextDueDate!);
      const daysUntil = daysBetween(today, dueDate);
      return daysUntil <= 30 && daysUntil >= 0 && status.status === "in_progress";
    });

    if (warningStatuses.length > 0) {
      await Promise.all(
        warningStatuses.map((status) => {
          status.status = "warning";
          return this.statusRepository.save(status);
        }),
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

    if (notification !== null) {
      notification.readAt = nowISO();
      return this.notificationRepository.save(notification);
    }

    return notification!;
  }

  private createOverdueNotification(status: ComplySaComplianceStatus): ComplySaNotification {
    return this.notificationRepository.create({
      companyId: status.companyId,
      requirementId: status.requirementId,
      channel: "in_app",
      type: "overdue",
      message: `OVERDUE: ${status.requirement?.name ?? "Requirement"} was due on ${status.nextDueDate}`,
    });
  }

  private createReminderNotification(
    status: ComplySaComplianceStatus,
    type: string,
    daysUntilDue: number,
  ): ComplySaNotification {
    return this.notificationRepository.create({
      companyId: status.companyId,
      requirementId: status.requirementId,
      channel: "in_app",
      type,
      message: `REMINDER: ${status.requirement?.name ?? "Requirement"} is due in ${daysUntilDue} days (${status.nextDueDate})`,
    });
  }
}
