import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Or } from 'typeorm';
import { CustomerCompany } from '../entities/customer-company.entity';
import { CustomerProfile } from '../entities/customer-profile.entity';
import { EmailService } from '../../email/email.service';
import { now, formatDate } from '../../lib/datetime';

@Injectable()
export class CertificateExpiryService {
  private readonly logger = new Logger(CertificateExpiryService.name);

  constructor(
    @InjectRepository(CustomerCompany)
    private readonly companyRepo: Repository<CustomerCompany>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkBeeExpiryNotifications(): Promise<void> {
    this.logger.log('Running daily BEE certificate expiry check...');

    try {
      const today = now().startOf('day').toJSDate();
      const todayStr = now().toFormat('yyyy-MM-dd');

      const companiesWithExpiredBee = await this.companyRepo
        .createQueryBuilder('company')
        .leftJoinAndSelect('company.profiles', 'profile')
        .leftJoinAndSelect('profile.user', 'user')
        .where('company.beeCertificateExpiry IS NOT NULL')
        .andWhere('DATE(company.beeCertificateExpiry) <= :today', {
          today: todayStr,
        })
        .andWhere(
          '(company.beeExpiryNotificationSentAt IS NULL OR DATE(company.beeExpiryNotificationSentAt) < DATE(company.beeCertificateExpiry))',
        )
        .getMany();

      this.logger.log(
        `Found ${companiesWithExpiredBee.length} companies with expiring/expired BEE certificates`,
      );

      for (const company of companiesWithExpiredBee) {
        await this.sendExpiryNotification(company);
      }

      this.logger.log('BEE certificate expiry check completed');
    } catch (error) {
      this.logger.error(
        `Failed to run BEE expiry check: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendExpiryNotification(company: CustomerCompany): Promise<void> {
    const profiles = company.profiles || [];

    if (profiles.length === 0) {
      this.logger.warn(
        `Company ${company.id} (${company.legalName}) has no profiles to notify`,
      );
      return;
    }

    const expiryDate = company.beeCertificateExpiry
      ? formatDate(company.beeCertificateExpiry)
      : 'Unknown';

    for (const profile of profiles) {
      if (!profile.user?.email) {
        continue;
      }

      try {
        const contactName = `${profile.firstName} ${profile.lastName}`;
        const companyName =
          company.tradingName || company.legalName || 'Your Company';

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
    this.logger.log('Manually triggering BEE expiry check...');
    await this.checkBeeExpiryNotifications();
    return { companiesChecked: 0, notificationsSent: 0 };
  }
}
