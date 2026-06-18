import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { UserRepository } from "../../user/user.repository";
import { AnnixSentinelCompanyDetailsRepository } from "../companies/annix-sentinel-company-details.repository";
import { now } from "../lib/datetime";

const TAX_DATA_RETENTION_YEARS = 5;
const COMPANY_RECORD_RETENTION_YEARS = 7;
const DELETED_ACCOUNT_RETENTION_YEARS = 1;

@Injectable()
export class AnnixSentinelDataRetentionService {
  private readonly logger = new Logger(AnnixSentinelDataRetentionService.name);

  constructor(
    private readonly usersRepository: UserRepository,
    private readonly detailsRepository: AnnixSentinelCompanyDetailsRepository,
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

      const expiredTaxRecords = await this.detailsRepository.countCancelledCreatedBefore(taxCutoff);

      const expiredCompanyRecords =
        await this.detailsRepository.countCancelledCreatedBefore(companyCutoff);

      const expiredDeletedAccounts =
        await this.usersRepository.countUnverifiedCreatedBefore(deletedAccountCutoff);

      this.logger.log(
        `Retention audit: ${expiredTaxRecords} tax records past ${TAX_DATA_RETENTION_YEARS}y, ` +
          `${expiredCompanyRecords} company records past ${COMPANY_RECORD_RETENTION_YEARS}y, ` +
          `${expiredDeletedAccounts} unverified accounts past ${DELETED_ACCOUNT_RETENTION_YEARS}y`,
      );

      if (expiredDeletedAccounts > 0) {
        const deletedCount =
          await this.usersRepository.deleteUnverifiedCreatedBefore(deletedAccountCutoff);

        this.logger.log(
          `Deleted ${deletedCount} unverified accounts older than ${DELETED_ACCOUNT_RETENTION_YEARS} year(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Data retention cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
