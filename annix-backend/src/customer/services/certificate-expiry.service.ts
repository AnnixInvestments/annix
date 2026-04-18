import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { formatDate, now } from "../../lib/datetime";
import { Company } from "../../platform/entities/company.entity";
import { CustomerProfile } from "../entities/customer-profile.entity";

@Injectable()
export class CertificateExpiryService {
  private readonly logger = new Logger(CertificateExpiryService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: "customers:bee-expiry-check" })
  async checkBeeExpiryNotifications(): Promise<void> {
    this.logger.log("Running daily BEE certificate expiry check...");

    try {
      const todayStr = now().toFormat("yyyy-MM-dd");

      const profiles = await this.profileRepo
        .createQueryBuilder("profile")
        .leftJoinAndSelect("profile.company", "company")
        .leftJoinAndSelect("profile.user", "user")
        .where("company.beeCertificateExpiry IS NOT NULL")
        .andWhere("DATE(company.beeCertificateExpiry) <= :today", { today: todayStr })
        .andWhere(
          "(company.beeExpiryNotificationSentAt IS NULL OR DATE(company.beeExpiryNotificationSentAt) < DATE(company.beeCertificateExpiry))",
        )
        .getMany();

      const companiesMap = new Map<number, { company: Company; profiles: CustomerProfile[] }>();
      for (const profile of profiles) {
        const existing = companiesMap.get(profile.companyId);
        if (existing) {
          existing.profiles.push(profile);
        } else {
          companiesMap.set(profile.companyId, { company: profile.company, profiles: [profile] });
        }
      }

      this.logger.log(
        `Found ${companiesMap.size} companies with expiring/expired BEE certificates`,
      );

      for (const { company, profiles: companyProfiles } of companiesMap.values()) {
        await this.sendExpiryNotification(company, companyProfiles);
      }

      this.logger.log("BEE certificate expiry check completed");
    } catch (error) {
      this.logger.error(`Failed to run BEE expiry check: ${error.message}`, error.stack);
    }
  }

  private async sendExpiryNotification(
    company: Company,
    profiles: CustomerProfile[],
  ): Promise<void> {
    if (profiles.length === 0) {
      this.logger.warn(`Company ${company.id} (${company.legalName}) has no profiles to notify`);
      return;
    }

    const expiryDate = company.beeCertificateExpiry
      ? formatDate(company.beeCertificateExpiry)
      : "Unknown";

    for (const profile of profiles) {
      if (!profile.user?.email) {
        continue;
      }

      try {
        const contactName = `${profile.firstName} ${profile.lastName}`;
        const companyName = company.tradingName || company.legalName || "Your Company";

        await this.emailService.sendBeeExpiryNotificationEmail(
          profile.user.email,
          companyName,
          contactName,
          expiryDate,
          company.beeLevel,
        );

        this.logger.log(
          `Sent BEE expiry notification to ${profile.user.email} for company ${company.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send BEE expiry notification to ${profile.user?.email}: ${error.message}`,
        );
      }
    }

    company.beeExpiryNotificationSentAt = now().toJSDate();
    await this.companyRepo.save(company);
  }

  async manuallyTriggerExpiryCheck(): Promise<{
    companiesChecked: number;
    notificationsSent: number;
  }> {
    this.logger.log("Manually triggering BEE expiry check...");
    await this.checkBeeExpiryNotifications();
    return { companiesChecked: 0, notificationsSent: 0 };
  }
}
