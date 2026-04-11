import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationDispatcherService } from "../../notifications/notification-dispatcher.service";

interface NotifyOptions {
  subject: string;
  body: string;
  htmlBody?: string;
  channels?: Array<"email" | "web_push">;
}

@Injectable()
export class StockManagementNotificationsService {
  private readonly logger = new Logger(StockManagementNotificationsService.name);

  constructor(
    private readonly dispatcher: NotificationDispatcherService,
    private readonly configService: ConfigService,
  ) {}

  async notifyMissingDatasheet(opts: {
    productType: "paint" | "rubber_compound" | "solution";
    productId: number;
    productName: string;
  }): Promise<void> {
    const recipients = this.recipientsForRoles(["accounts", "admin"]);
    if (recipients.length === 0) {
      this.logger.warn(
        "notifyMissingDatasheet: no recipients configured for accounts/admin — skipping",
      );
      return;
    }
    const subject = `Datasheet missing — ${opts.productName}`;
    const body =
      `A new ${opts.productType.replace("_", " ")} product was created without a linked datasheet.\n\n` +
      `Product: ${opts.productName} (#${opts.productId})\n` +
      `Type: ${opts.productType}\n\n` +
      "Please upload the supplier datasheet from the admin > product datasheets page.";
    await this.dispatchToAll(recipients, { subject, body });
  }

  async notifyStockHoldFlagged(opts: {
    productName: string;
    holdItemId: number;
    reason: string;
    flaggedByName?: string;
    writeOffValueR: number;
  }): Promise<void> {
    const recipients = this.recipientsForRoles(["accounts", "admin"]);
    if (recipients.length === 0) {
      this.logger.warn(
        "notifyStockHoldFlagged: no recipients configured for accounts/admin — skipping",
      );
      return;
    }
    const subject = `Stock hold flagged — ${opts.productName} (${opts.reason})`;
    const body =
      `A stock item has been flagged as ${opts.reason}.\n\n` +
      `Product: ${opts.productName}\n` +
      `Hold item: #${opts.holdItemId}\n` +
      `Flagged by: ${opts.flaggedByName ?? "unknown"}\n` +
      `Write-off value: R ${opts.writeOffValueR.toFixed(2)}\n\n` +
      "Please review and choose a disposition (scrap, return to supplier, repair, donate, other) " +
      "from the admin > stock hold queue page.";
    await this.dispatchToAll(recipients, { subject, body });
  }

  async notifyCriticalVarianceSubmitted(opts: {
    stockTakeId: number;
    stockTakeName: string;
    criticalLineCount: number;
    totalVarianceAbsR: number;
    additionalRoles?: string[];
  }): Promise<void> {
    const roles = ["accounts", "admin", ...(opts.additionalRoles ?? [])];
    const recipients = this.recipientsForRoles(roles);
    if (recipients.length === 0) {
      this.logger.warn("notifyCriticalVarianceSubmitted: no recipients configured — skipping");
      return;
    }
    const subject = `Stock take ${opts.stockTakeName} submitted with critical variances`;
    const body =
      `A stock take has been submitted for approval with ${opts.criticalLineCount} critical-severity ` +
      "variance line(s).\n\n" +
      `Stock take: ${opts.stockTakeName} (#${opts.stockTakeId})\n` +
      `Total absolute variance: R ${opts.totalVarianceAbsR.toFixed(2)}\n\n` +
      "Please review the stock take and act on the critical variances before approving.";
    await this.dispatchToAll(recipients, { subject, body });
  }

  async notifyStockHoldAging(opts: {
    olderCount: number;
    monthCount: number;
    weekCount: number;
  }): Promise<void> {
    if (opts.olderCount === 0 && opts.monthCount === 0 && opts.weekCount === 0) {
      return;
    }
    const recipients = this.recipientsForRoles(["admin"]);
    if (recipients.length === 0) {
      return;
    }
    const subject = `Stock hold queue aging — ${opts.olderCount + opts.monthCount} items overdue`;
    const body =
      "The stock hold queue has items pending disposition for over a month.\n\n" +
      `90+ days: ${opts.olderCount}\n` +
      `31-90 days: ${opts.monthCount}\n` +
      `8-30 days: ${opts.weekCount}\n\n` +
      "Please clear these items from the admin > stock hold queue page.";
    await this.dispatchToAll(recipients, { subject, body });
  }

  private recipientsForRoles(roles: string[]): string[] {
    const all: string[] = [];
    for (const role of roles) {
      const envKey = `STOCK_MGMT_NOTIFY_${role.toUpperCase()}_EMAILS`;
      const value = this.configService.get<string>(envKey);
      if (typeof value === "string" && value.length > 0) {
        const emails = value
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e.length > 0);
        all.push(...emails);
      }
    }
    return Array.from(new Set(all));
  }

  private async dispatchToAll(emails: string[], options: NotifyOptions): Promise<void> {
    const channels = options.channels ?? ["email"];
    for (const email of emails) {
      try {
        await this.dispatcher.dispatch({
          recipient: { email, locale: "en" },
          content: {
            subject: options.subject,
            body: options.body,
            html: options.htmlBody ?? options.body.replace(/\n/g, "<br/>"),
          },
          channels,
        });
      } catch (err) {
        this.logger.error(
          `Failed to dispatch notification to ${email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
