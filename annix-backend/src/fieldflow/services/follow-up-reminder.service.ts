import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { groupBy, keys } from "es-toolkit/compat";
import { LessThanOrEqual, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { User } from "../../user/entities/user.entity";
import { Prospect, ProspectStatus } from "../entities";

@Injectable()
export class FollowUpReminderService {
  private readonly logger = new Logger(FollowUpReminderService.name);

  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailyReminders(): Promise<void> {
    this.logger.log("Starting daily follow-up reminder job");

    const overdueProspects = await this.prospectRepo.find({
      where: {
        nextFollowUpAt: LessThanOrEqual(now().toJSDate()),
        status: LessThanOrEqual(ProspectStatus.PROPOSAL) as unknown as ProspectStatus,
      },
    });

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
