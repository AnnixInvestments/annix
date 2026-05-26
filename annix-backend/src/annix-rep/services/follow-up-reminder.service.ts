import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { groupBy, keys } from "es-toolkit/compat";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { UserRepository } from "../../user/user.repository";
import { isAnnixRepCronEnabled } from "../annix-rep-cron.config";
import { ProspectStatus } from "../entities";
import { ProspectRepository } from "../prospect.repository";

@Injectable()
export class FollowUpReminderService {
  private readonly logger = new Logger(FollowUpReminderService.name);

  constructor(
    private readonly prospectRepo: ProspectRepository,
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: "fieldflow:daily-reminders" })
  async sendDailyReminders(): Promise<void> {
    if (!isAnnixRepCronEnabled()) return;

    this.logger.log("Starting daily follow-up reminder job");

    const overdueProspects = await this.prospectRepo.findOverdueFollowUps(now().toJSDate());

    if (overdueProspects.length === 0) {
      this.logger.log("No overdue follow-ups found");
      return;
    }

    const filteredProspects = overdueProspects.filter(
      (p) => p.status !== ProspectStatus.WON && p.status !== ProspectStatus.LOST,
    );

    if (filteredProspects.length === 0) {
      this.logger.log("No actionable overdue follow-ups found");
      return;
    }

    const groupedByOwner = groupBy(filteredProspects, (p) => p.ownerId);
    const ownerIds = keys(groupedByOwner).map((id) => parseInt(id, 10));

    const owners = await this.userRepo.findByIds(ownerIds);
    const ownerMap = new Map(owners.map((u) => [u.id, u]));

    const emailPromises = ownerIds.map(async (ownerId) => {
      const owner = ownerMap.get(ownerId);
      if (!owner?.email) {
        this.logger.warn(`No email found for user ${ownerId}`);
        return;
      }

      const prospects = groupedByOwner[ownerId];
      await this.emailService.sendFollowUpReminderEmail(
        owner.email,
        owner.firstName || owner.username || "Sales Rep",
        prospects,
      );
    });

    await Promise.all(emailPromises);
    this.logger.log(
      `Sent follow-up reminders to ${ownerIds.length} users for ${filteredProspects.length} prospects`,
    );
  }
}
