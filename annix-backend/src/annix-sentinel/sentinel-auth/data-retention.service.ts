import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { AnnixSentinelCompanyDetails } from "../companies/entities/annix-sentinel-company-details.entity";
import { now } from "../lib/datetime";

const TAX_DATA_RETENTION_YEARS = 5;
const COMPANY_RECORD_RETENTION_YEARS = 7;
const DELETED_ACCOUNT_RETENTION_YEARS = 1;

@Injectable()
export class AnnixSentinelDataRetentionService {
  private readonly logger = new Logger(AnnixSentinelDataRetentionService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(AnnixSentinelCompanyDetails)
    private readonly detailsRepository: Repository<AnnixSentinelCompanyDetails>,
  ) {}

  @Cron("0 3 1 * *", {
    name: "annix-sentinel:data-retention-cleanup",
    timeZone: "Africa/Johannesburg",
  })
  async processRetentionCleanup(): Promise<void> {
    this.logger.log("Starting monthly data retention cleanup");

    try {
      const taxCutoff = now().minus({ years: TAX_DATA_RETENTION_YEARS }).toJSDate();

      const companyCutoff = now().minus({ years: COMPANY_RECORD_RETENTION_YEARS }).toJSDate();

      const deletedAccountCutoff = now()
        .minus({ years: DELETED_ACCOUNT_RETENTION_YEARS })
        .toJSDate();

      const expiredTaxRecords = await this.detailsRepository.count({
        where: {
          createdAt: LessThan(taxCutoff),
          subscriptionStatus: "cancelled",
        },
      });

      const expiredCompanyRecords = await this.detailsRepository.count({
        where: {
          createdAt: LessThan(companyCutoff),
          subscriptionStatus: "cancelled",
        },
      });

      const expiredDeletedAccounts = await this.usersRepository.count({
        where: {
          createdAt: LessThan(deletedAccountCutoff),
          emailVerified: false,
        },
      });

      this.logger.log(
        `Retention audit: ${expiredTaxRecords} tax records past ${TAX_DATA_RETENTION_YEARS}y, ` +
          `${expiredCompanyRecords} company records past ${COMPANY_RECORD_RETENTION_YEARS}y, ` +
          `${expiredDeletedAccounts} unverified accounts past ${DELETED_ACCOUNT_RETENTION_YEARS}y`,
      );

      if (expiredDeletedAccounts > 0) {
        const result = await this.usersRepository.delete({
          createdAt: LessThan(deletedAccountCutoff),
          emailVerified: false,
        });

        this.logger.log(
          `Deleted ${result.affected} unverified accounts older than ${DELETED_ACCOUNT_RETENTION_YEARS} year(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Data retention cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
