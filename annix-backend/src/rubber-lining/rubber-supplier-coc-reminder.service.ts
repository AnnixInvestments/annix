import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EmailService } from "../email/email.service";
import { fromJSDate, now } from "../lib/datetime";
import { CompanyType } from "./entities/rubber-company.entity";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";

/**
 * A supplier CoC is a hard prerequisite for the customer (AU) CoC chain - without
 * it, the customer certificate can never be generated. This service watches for
 * supplier delivery notes that have been in the system for more than
 * OVERDUE_DAYS without a linked supplier CoC and emails a warning so the gap can
 * be chased before it blocks downstream certificates. Each DN is warned about
 * exactly once (tracked via cocOverdueWarnedAt).
 */
@Injectable()
export class RubberSupplierCocReminderService {
  private readonly logger = new Logger(RubberSupplierCocReminderService.name);
  private static readonly WARNING_RECIPIENT = "andy@auind.co.za";
  private static readonly OVERDUE_DAYS = 4;

  constructor(
    private readonly deliveryNoteRepo: RubberDeliveryNoteRepository,
    private readonly companyRepo: RubberCompanyRepository,
    private readonly emailService: EmailService,
  ) {}

  @Cron("0 8 * * *", { name: "au-rubber:warn-overdue-supplier-cocs" })
  async cronWarnOverdueSupplierCocs(): Promise<void> {
    try {
      const warned = await this.warnOverdueSupplierCocs();
      if (warned > 0) {
        this.logger.log(`[cron au-rubber:warn-overdue-supplier-cocs] warned about ${warned} DN(s)`);
      }
    } catch (error) {
      this.logger.error(
        `[cron au-rubber:warn-overdue-supplier-cocs] failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async warnOverdueSupplierCocs(): Promise<number> {
    const suppliers = await this.companyRepo.findByCompanyType(CompanyType.SUPPLIER);
    if (suppliers.length === 0) return 0;
    const supplierNameById = new Map(suppliers.map((c) => [c.id, c.name]));

    const cutoff = now().minus({ days: RubberSupplierCocReminderService.OVERDUE_DAYS }).toJSDate();

    const overdue = await this.deliveryNoteRepo.findOverdueWithoutCoc(
      [...supplierNameById.keys()],
      cutoff,
    );
    if (overdue.length === 0) return 0;

    const today = now();
    const rows = overdue
      .map((dn) => {
        const days = Math.floor(today.diff(fromJSDate(dn.createdAt), "days").days);
        return `<tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${dn.deliveryNoteNumber}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${supplierNameById.get(dn.supplierCompanyId) ?? "-"}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${dn.customerReference ?? "-"}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${fromJSDate(dn.createdAt).toFormat("dd/MM/yyyy")}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center;">${days}</td>
        </tr>`;
      })
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;max-width:680px;">
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px;margin-bottom:16px;">
          <h2 style="margin:0 0 6px 0;font-size:18px;color:#92400e;">Supplier CoC overdue</h2>
          <p style="margin:0;color:#92400e;">
            ${overdue.length} supplier delivery note(s) have been in the system for more than
            ${RubberSupplierCocReminderService.OVERDUE_DAYS} days with no supplier Certificate of
            Conformance linked. Until the CoC arrives, the customer (AU) CoC for these rolls
            cannot be generated.
          </p>
        </div>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left;">Supplier DN</th>
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left;">Supplier</th>
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left;">PO / Ref</th>
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left;">Uploaded</th>
              <th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center;">Days waiting</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px;color:#555;">Please follow up with the supplier to obtain the outstanding CoC(s).</p>
      </div>`;

    await this.emailService.sendEmail({
      to: RubberSupplierCocReminderService.WARNING_RECIPIENT,
      subject: `Supplier CoC overdue - ${overdue.length} delivery note(s) awaiting a CoC`,
      fromName: "AU Industries",
      html,
    });

    await this.deliveryNoteRepo.markCocOverdueWarned(
      overdue.map((dn) => dn.id),
      now().toJSDate(),
    );

    this.logger.log(
      `Warned ${RubberSupplierCocReminderService.WARNING_RECIPIENT} about ${overdue.length} overdue supplier CoC(s): ${overdue.map((d) => d.deliveryNoteNumber).join(", ")}`,
    );
    return overdue.length;
  }
}
