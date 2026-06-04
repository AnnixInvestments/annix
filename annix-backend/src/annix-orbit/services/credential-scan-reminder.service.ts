import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { now } from "../../lib/datetime";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";
import { UserRepository } from "../../user/user.repository";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import type { AnnixOrbitIndividualDocument } from "../entities/annix-orbit-individual-document.entity";
import { AnnixOrbitIndividualDocumentRepository } from "../repositories/annix-orbit-individual-document.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";

const REMINDER_INTERVAL_DAYS = 3;
const MAX_REMINDERS = 3;

@Injectable()
export class CredentialScanReminderService {
  private readonly logger = new Logger(CredentialScanReminderService.name);

  constructor(
    private readonly documentRepo: AnnixOrbitIndividualDocumentRepository,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly userRepo: UserRepository,
    private readonly dispatcher: NotificationDispatcherService,
    private readonly configService: ConfigService,
  ) {}

  @Cron("0 8 * * *", { name: "annix-orbit:credential-scan-reminders" })
  async run(): Promise<{ sent: number }> {
    if (!isAnnixOrbitCronEnabled()) return { sent: 0 };
    return this.dispatchDueReminders();
  }

  async dispatchDueReminders(): Promise<{ sent: number }> {
    const dueBefore = now().minus({ days: REMINDER_INTERVAL_DAYS }).toJSDate();
    const docs = await this.documentRepo.findPendingClearScan(dueBefore, MAX_REMINDERS);
    const results = await Promise.all(docs.map((doc) => this.processDocument(doc)));
    return { sent: results.filter(Boolean).length };
  }

  private async processDocument(doc: AnnixOrbitIndividualDocument): Promise<boolean> {
    const profile = await this.profileRepo.findById(doc.profileId);
    if (!profile) return false;
    const user = await this.userRepo.findById(profile.userId);
    const email = user?.email ?? null;
    if (!email) return false;

    const content = this.buildContent(doc);
    if (this.isProduction()) {
      await this.dispatcher.dispatch({
        recipient: { email },
        content,
        channels: ["email"],
      });
    } else {
      this.logger.log(
        `[dev] would remind ${email} to upload a clear scan for ${doc.kind} document ${doc.id}`,
      );
    }

    const sentSoFar = doc.scanRemindersSent ? doc.scanRemindersSent : 0;
    doc.scanRemindersSent = sentSoFar + 1;
    doc.lastScanReminderAt = now().toJSDate();
    await this.documentRepo.save(doc);
    return true;
  }

  private buildContent(doc: AnnixOrbitIndividualDocument): { subject: string; body: string } {
    const what = doc.kind === "qualification" ? "qualification" : "certificate";
    const named = doc.label ? ` (${doc.label})` : "";
    return {
      subject: "Add a clear scan of your credential on Annix Orbit",
      body: `You added a phone photo of a ${what}${named} to your Annix Orbit profile. Phone photos aren't shared with employers — please upload a clear scanned or PDF copy from your profile so we can show it to employers when you apply.`,
    };
  }

  private isProduction(): boolean {
    return this.configService.get<string>("NODE_ENV") === "production";
  }
}
