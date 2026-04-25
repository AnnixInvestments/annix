import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PasskeyService } from "./passkey.service";

@Injectable()
export class PasskeyScheduler {
  private readonly logger = new Logger(PasskeyScheduler.name);

  constructor(private readonly passkeyService: PasskeyService) {}

  @Cron(CronExpression.EVERY_6_HOURS, { name: "passkey-purge-expired-challenges" })
  async purgeExpiredChallenges(): Promise<void> {
    const removed = await this.passkeyService.purgeExpiredChallenges();
    if (removed > 0) {
      this.logger.log(`Purged ${removed} expired passkey challenges`);
    }
  }
}
