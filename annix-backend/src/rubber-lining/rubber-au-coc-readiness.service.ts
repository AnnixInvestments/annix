import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { EmailService } from "../email/email.service";
import { nowISO } from "../lib/datetime";
import {
  AuCocReadinessStatus,
  AuCocStatus,
  type ReadinessDetails,
  RubberAuCoc,
} from "./entities/rubber-au-coc.entity";
import { CocProcessingStatus, RubberSupplierCoc } from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { RubberAuCocService } from "./rubber-au-coc.service";

export interface ReadinessResult {
  ready: boolean;
  readinessStatus: AuCocReadinessStatus;
  calendererCoc: RubberSupplierCoc | null;
  compounderCoc: RubberSupplierCoc | null;
  graphPdfPath: string | null;
  missingDocuments: string[];
  details: ReadinessDetails;
}

@Injectable()
export class RubberAuCocReadinessService {
  private readonly logger = new Logger(RubberAuCocReadinessService.name);
  private readonly deliveryNotesInFlight = new Set<number>();
  private readonly deliveryNotesPendingRecheck = new Set<number>();

  constructor(
    private auCocRepository: RubberAuCocRepository,
    private supplierCocRepository: RubberSupplierCocRepository,
    private deliveryNoteRepository: RubberDeliveryNoteRepository,
    private auCocService: RubberAuCocService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async checkReadiness(auCocId: number): Promise<ReadinessResult> {
    const auCoc = await this.auCocRepository.findById(auCocId);

    if (!auCoc) {
      return this.notReady("AU CoC not found", AuCocReadinessStatus.NOT_TRACKED);
    }

    const probe = await this.auCocService.generationReadiness(auCocId);

    const buildDetails = (missing: string[]): ReadinessDetails => ({
      calendererCocId: probe.resolvedSupplierCocId,
      compounderCocId: probe.resolvedCompounderCocId,
      graphPdfPath: probe.graphPdfPath,
      calendererApproved: !probe.sourceIncomplete,
      compounderApproved: probe.batchCount > 0,
      missingDocuments: missing,
      lastCheckedAt: nowISO(),
    });

    const make = (
      ready: boolean,
      status: AuCocReadinessStatus,
      missing: string[],
    ): ReadinessResult => ({
      ready,
      readinessStatus: status,
      calendererCoc: null,
      compounderCoc: null,
      graphPdfPath: probe.graphPdfPath,
      missingDocuments: missing,
      details: buildDetails(missing),
    });

    let result: ReadinessResult;
    if (probe.sourceIncomplete) {
      result = make(false, AuCocReadinessStatus.WAITING_FOR_CALENDERER_COC, [
        probe.reason || "Matching-compound calenderer / source CoC",
      ]);
    } else if (probe.batchCount === 0) {
      result = make(false, AuCocReadinessStatus.WAITING_FOR_COMPOUNDER_COC, [
        "Compounder batch test data",
      ]);
    } else if (!probe.hasGraph) {
      result = make(false, AuCocReadinessStatus.WAITING_FOR_GRAPH, ["Rheometer graph PDF"]);
    } else if (
      !(await this.batchSourceApproved(probe.resolvedCompounderCocId, probe.resolvedSupplierCocId))
    ) {
      result = make(false, AuCocReadinessStatus.WAITING_FOR_APPROVAL, ["Supplier CoC approval"]);
    } else if (auCoc.status !== AuCocStatus.DRAFT) {
      result = make(true, AuCocReadinessStatus.AUTO_GENERATED, []);
    } else {
      result = make(true, AuCocReadinessStatus.READY_FOR_GENERATION, []);
      this.logger.log(
        `AU CoC ${auCoc.cocNumber} is READY: source=${probe.resolvedSupplierCocId}, compounder=${probe.resolvedCompounderCocId}, batches=${probe.batchCount}, graph=${probe.graphPdfPath}`,
      );
    }

    await this.updateReadinessStatus(auCoc, result);
    return result;
  }

  private async batchSourceApproved(
    compounderCocId: number | null,
    supplierCocId: number | null,
  ): Promise<boolean> {
    const batchSourceId = compounderCocId ?? supplierCocId;
    if (!batchSourceId) return true;
    const coc = await this.supplierCocRepository.findById(batchSourceId);
    return !coc || coc.processingStatus === CocProcessingStatus.APPROVED;
  }

  async checkAndAutoGenerateForDeliveryNote(customerDeliveryNoteId: number): Promise<void> {
    if (this.deliveryNotesInFlight.has(customerDeliveryNoteId)) {
      this.deliveryNotesPendingRecheck.add(customerDeliveryNoteId);
      this.logger.debug(
        `Readiness check already running for DN ${customerDeliveryNoteId}; queued a re-check so newer data isn't dropped`,
      );
      return;
    }
    this.deliveryNotesInFlight.add(customerDeliveryNoteId);
    try {
      await this.runReadinessForDeliveryNote(customerDeliveryNoteId);
    } finally {
      this.deliveryNotesInFlight.delete(customerDeliveryNoteId);
    }
    if (this.deliveryNotesPendingRecheck.delete(customerDeliveryNoteId)) {
      this.logger.debug(`Running queued re-check for DN ${customerDeliveryNoteId}`);
      await this.checkAndAutoGenerateForDeliveryNote(customerDeliveryNoteId);
    }
  }

  private async runReadinessForDeliveryNote(customerDeliveryNoteId: number): Promise<void> {
    const auCoc = await this.auCocRepository.findOneWhere({
      sourceDeliveryNoteId: customerDeliveryNoteId,
    });

    if (!auCoc) {
      this.logger.debug(
        `No AU CoC found for delivery note ${customerDeliveryNoteId}, auto-creating`,
      );
      try {
        const created = await this.auCocService.createAuCocFromDeliveryNote(
          customerDeliveryNoteId,
          "auto-link",
        );
        await this.autoGenerateIfReady(created.id);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Could not auto-create AU CoC for DN ${customerDeliveryNoteId}: ${errorMsg}`,
        );
      }
      return;
    }

    await this.autoGenerateIfReady(auCoc.id);
  }

  async checkAndAutoGenerateForCoc(supplierCocId: number): Promise<void> {
    const supplierCoc = await this.supplierCocRepository.findById(supplierCocId);

    if (!supplierCoc) return;

    const orderNumber = supplierCoc.orderNumber || supplierCoc.extractedData?.orderNumber || null;

    if (!orderNumber) return;

    const pendingAuCocs = await this.findPendingAuCocsByOrderNumber(orderNumber);

    await Promise.all(pendingAuCocs.map((auCoc) => this.autoGenerateIfReady(auCoc.id)));
  }

  async autoGenerateAuCoc(
    auCocId: number,
  ): Promise<{ generated: boolean; auCocId: number; reason: string }> {
    const auCoc = await this.auCocRepository.findById(auCocId, ["customerCompany"]);

    if (!auCoc) {
      return { generated: false, auCocId, reason: "AU CoC not found" };
    }

    if (auCoc.status !== AuCocStatus.DRAFT) {
      return {
        generated: false,
        auCocId,
        reason: `AU CoC already in ${auCoc.status} state`,
      };
    }

    const readiness = await this.checkReadiness(auCocId);
    if (!readiness.ready) {
      const missing = (readiness.missingDocuments || []).join(", ") || "source data";
      return {
        generated: false,
        auCocId,
        reason: `Not ready — missing: ${missing}`,
      };
    }

    try {
      const { buffer, filename } = await this.auCocService.generatePdf(auCocId);

      await this.auCocRepository.updateById(auCocId, {
        readinessStatus: AuCocReadinessStatus.AUTO_GENERATED,
      });

      this.logger.log(
        `Auto-generated AU CoC ${auCoc.cocNumber} (${filename}, ${buffer.length} bytes)`,
      );

      this.notifyAdminForVerification(auCoc);

      const customer = auCoc.customerCompany;
      const autoSendEmail =
        customer?.auCocRecipientEmail || customer?.emailConfig?.outgoingCocEmail;
      if (customer?.autoApproveAuCocs && autoSendEmail) {
        try {
          await this.auCocService.approveAuCoc(auCocId, "auto-approve (system)");
          await this.auCocService.sendApprovedAuCocToCustomer(auCocId);
          this.logger.log(`AU CoC ${auCoc.cocNumber} auto-approved + sent to ${autoSendEmail}`);
          return {
            generated: true,
            auCocId,
            reason: "Auto-generated, auto-approved, and sent to customer",
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `AU CoC ${auCoc.cocNumber} generated but auto-approve/send failed: ${errorMsg}`,
          );
        }
      }

      return { generated: true, auCocId, reason: "Auto-generated successfully" };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Auto-generation failed for AU CoC ${auCoc.cocNumber}: ${errorMsg}`);
      return { generated: false, auCocId, reason: `Generation failed: ${errorMsg}` };
    }
  }

  async autoGenerateIfReady(auCocId: number): Promise<void> {
    const readiness = await this.checkReadiness(auCocId);

    if (!readiness.ready) return;

    const result = await this.autoGenerateAuCoc(auCocId);

    if (!result.generated) {
      this.logger.warn(`AU CoC ${auCocId} was ready but auto-generation failed: ${result.reason}`);
    }
  }

  async bulkAutoGenerateAllDraftAuCocs(): Promise<{
    checked: number;
    generated: number;
    details: string[];
  }> {
    const draftCocs = await this.auCocRepository.findByStatus(AuCocStatus.DRAFT);

    if (draftCocs.length === 0) {
      return { checked: 0, generated: 0, details: ["No draft AU CoCs found"] };
    }

    const results = await draftCocs.reduce(
      async (accPromise, auCoc) => {
        const acc = await accPromise;
        const result = await this.autoGenerateAuCoc(auCoc.id);
        if (result.generated) {
          return {
            ...acc,
            generated: acc.generated + 1,
            details: [...acc.details, `${auCoc.cocNumber}: generated successfully`],
          };
        }
        return {
          ...acc,
          details: [...acc.details, `${auCoc.cocNumber}: ${result.reason}`],
        };
      },
      Promise.resolve({ checked: draftCocs.length, generated: 0, details: [] as string[] }),
    );

    this.logger.log(
      `Bulk AU CoC generation: checked ${results.checked}, generated ${results.generated}`,
    );
    return results;
  }

  async recheckStuckAuCocs(): Promise<{ rechecked: number; nowReady: number }> {
    const stuckCocs = await this.auCocRepository.findByStatus(AuCocStatus.DRAFT);
    let nowReady = 0;
    for (const coc of stuckCocs) {
      const result = await this.checkReadiness(coc.id);
      if (result.ready) nowReady += 1;
    }
    return { rechecked: stuckCocs.length, nowReady };
  }

  async runScheduledAutoProcessing(): Promise<{
    rechecked: number;
    generated: number;
    details: string[];
  }> {
    const recheck = await this.recheckStuckAuCocs();
    const generation = await this.bulkAutoGenerateAllDraftAuCocs();
    return {
      rechecked: recheck.rechecked,
      generated: generation.generated,
      details: generation.details,
    };
  }

  @Cron("0 */3 * * *", { name: "au-rubber:auto-process-au-cocs" })
  async cronAutoProcessAuCocs(): Promise<void> {
    try {
      const result = await this.runScheduledAutoProcessing();
      if (result.rechecked > 0 || result.generated > 0) {
        this.logger.log(
          `[cron au-rubber:auto-process-au-cocs] rechecked ${result.rechecked}, generated ${result.generated}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[cron au-rubber:auto-process-au-cocs] failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findPendingAuCocsByOrderNumber(orderNumber: string): Promise<RubberAuCoc[]> {
    const allDraftCocs = await this.auCocRepository.findByStatus(AuCocStatus.DRAFT);

    return allDraftCocs.filter((coc) => {
      const rollNumbers = (coc.extractedRollData || [])
        .map((r) => r.rollNumber)
        .filter(Boolean) as string[];
      const prefixes = rollNumbers.map((rn) => rn.split("-")[0]?.trim());
      return prefixes.includes(orderNumber);
    });
  }

  private async updateReadinessStatus(auCoc: RubberAuCoc, result: ReadinessResult): Promise<void> {
    await this.auCocRepository.updateById(auCoc.id, {
      readinessStatus: result.readinessStatus,
      readinessDetails: result.details,
    });
  }

  private notReady(missingDocument: string, status: AuCocReadinessStatus): ReadinessResult {
    return {
      ready: false,
      readinessStatus: status,
      calendererCoc: null,
      compounderCoc: null,
      graphPdfPath: null,
      missingDocuments: [missingDocument],
      details: {
        calendererCocId: null,
        compounderCocId: null,
        graphPdfPath: null,
        calendererApproved: false,
        compounderApproved: false,
        missingDocuments: [missingDocument],
        lastCheckedAt: nowISO(),
      },
    };
  }

  private notifyAdminForVerification(auCoc: RubberAuCoc): void {
    const adminEmail = this.configService.get<string>("SUPPORT_EMAIL") || "info@annix.co.za";
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const cocLink = `${frontendUrl}/au-rubber/portal/au-cocs/${auCoc.id}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>AU CoC Auto-Generated</title></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #065f46; margin: 0 0 8px 0; font-size: 18px;">
              AU CoC Auto-Generated — Verification Required
            </h2>
            <p style="margin: 0; color: #065f46;">
              ${auCoc.cocNumber} has been automatically generated and requires your review.
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 140px;">CoC Number:</td>
              <td style="padding: 8px 0;">${auCoc.cocNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Customer:</td>
              <td style="padding: 8px 0;">${auCoc.customerCompany?.name || "—"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">PO / Ref:</td>
              <td style="padding: 8px 0;">${auCoc.poNumber || "—"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Delivery Note:</td>
              <td style="padding: 8px 0;">${auCoc.deliveryNoteRef || "—"}</td>
            </tr>
          </table>
          <p style="margin-bottom: 20px; color: #555;">The CoC PDF is attached for your convenience.</p>
          <a href="${cocLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Review AU CoC
          </a>
        </div>
      </body>
      </html>
    `;

    this.auCocService
      .pdfBuffer(auCoc.id)
      .then(({ buffer, filename }) =>
        this.emailService.sendEmail({
          to: adminEmail,
          subject: `AU CoC Auto-Generated — ${auCoc.cocNumber} — Verification Required`,
          html,
          attachments: [{ filename, content: buffer, contentType: "application/pdf" }],
        }),
      )
      .then(() => {
        this.logger.log(`Verification notification sent to ${adminEmail} for ${auCoc.cocNumber}`);
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send verification notification for ${auCoc.cocNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }
}
