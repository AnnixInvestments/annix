import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { StockTakeRepository } from "../repositories/stock-take.repository";
import { StockTakeService } from "./stock-take.service";

@Injectable()
export class StockTakeCronService {
  private readonly logger = new Logger(StockTakeCronService.name);

  constructor(
    private readonly stockTakeRepo: StockTakeRepository,
    private readonly stockTakeService: StockTakeService,
  ) {}

  @Cron("0 0 1 * *", {
    name: "stock-management:monthly-snapshot",
    timeZone: "Africa/Johannesburg",
  })
  async monthlySnapshot(): Promise<void> {
    this.logger.log("Running monthly stock take snapshot cron");
    const companyIds = await this.stockTakeRepo.distinctCompanyIds();

    const previousMonth = now().minus({ months: 1 });
    const periodLabel = previousMonth.toFormat("yyyy-MM");
    const name = `${previousMonth.toFormat("LLLL yyyy")} Month-End`;

    for (const companyId of companyIds) {
      try {
        const existing = await this.stockTakeRepo.findDraftForPeriod(companyId, periodLabel);
        if (existing) {
          await this.stockTakeService.captureSnapshot(companyId, existing.id);
          this.logger.log(
            `Attached snapshot to existing draft stock take ${existing.id} for company ${companyId}`,
          );
          continue;
        }
        const created = await this.stockTakeService.createSession(companyId, {
          name,
          periodLabel,
          periodStart: previousMonth.startOf("month").toISODate(),
          periodEnd: previousMonth.endOf("month").toISODate(),
          notes: "Auto-created by monthly snapshot cron",
        });
        await this.stockTakeService.captureSnapshot(companyId, created.id);
        this.logger.log(
          `Created new stock take ${created.id} for company ${companyId} period ${periodLabel}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to create monthly snapshot for company ${companyId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
