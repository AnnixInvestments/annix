import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../email/email.service";
import { nowISO } from "../lib/datetime";
import {
  AuCocReadinessStatus,
  AuCocStatus,
  type ReadinessDetails,
  RubberAuCoc,
} from "./entities/rubber-au-coc.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import {
  CocProcessingStatus,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";
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

  constructor(
    @InjectRepository(RubberAuCoc)
    private auCocRepository: Repository<RubberAuCoc>,
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberDeliveryNote)
    private deliveryNoteRepository: Repository<RubberDeliveryNote>,
    private auCocService: RubberAuCocService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async checkReadiness(auCocId: number): Promise<ReadinessResult> {
    const auCoc = await this.auCocRepository.findOne({
      where: { id: auCocId },
    });

    if (!auCoc) {
      return this.notReady("AU CoC not found", AuCocReadinessStatus.NOT_TRACKED);
    }

    const rollNumbers = (auCoc.extractedRollData || [])
      .map((r) => r.rollNumber)
      .filter(Boolean) as string[];

    if (rollNumbers.length === 0) {
      return this.notReady(
        "No roll numbers in AU CoC extracted data",
        AuCocReadinessStatus.NOT_TRACKED,
      );
    }

    const orderPrefixes = [
      ...new Set(rollNumbers.map((rn) => rn.split("-")[0]?.trim()).filter(Boolean)),
    ];

    this.logger.log(
      `Checking readiness for AU CoC ${auCoc.cocNumber}: roll prefixes [${orderPrefixes.join(", ")}]`,
    );

    const calendererCoc = await this.findCalendererCoc(orderPrefixes);

    if (!calendererCoc) {
      const result = this.notReady(
        "Calenderer CoC (Impilo)",
        AuCocReadinessStatus.WAITING_FOR_CALENDERER_COC,
      );
      await this.updateReadinessStatus(auCoc, result);
      return result;
    }

    this.logger.log(
      `Found calenderer CoC ${calendererCoc.id} (order: ${calendererCoc.orderNumber}, compound: ${calendererCoc.compoundCode})`,
    );

    const compounderCoc = await this.findCompounderCoc(calendererCoc);

    if (!compounderCoc) {
      const result = this.notReadyWith(
        "Compounder CoC (S&N)",
        AuCocReadinessStatus.WAITING_FOR_COMPOUNDER_COC,
        calendererCoc,
        null,
      );
      await this.updateReadinessStatus(auCoc, result);
      return result;
    }

    this.logger.log(
      `Found compounder CoC ${compounderCoc.id} (compound: ${compounderCoc.compoundCode})`,
    );

    const graphPdfPath = compounderCoc.graphPdfPath || calendererCoc.graphPdfPath || null;

    if (!graphPdfPath) {
      const result = this.notReadyWith(
        "Rheometer graph PDF",
        AuCocReadinessStatus.WAITING_FOR_GRAPH,
        calendererCoc,
        compounderCoc,
      );
      await this.updateReadinessStatus(auCoc, result);
      return result;
    }

    const calendererApproved = calendererCoc.processingStatus === CocProcessingStatus.APPROVED;
    const compounderApproved = compounderCoc.processingStatus === CocProcessingStatus.APPROVED;

    if (!calendererApproved || !compounderApproved) {
      const missing = [
        ...(!calendererApproved ? ["Calenderer CoC approval"] : []),
        ...(!compounderApproved ? ["Compounder CoC approval"] : []),
      ];

      const result: ReadinessResult = {
        ready: false,
        readinessStatus: AuCocReadinessStatus.WAITING_FOR_APPROVAL,
        calendererCoc,
        compounderCoc,
        graphPdfPath,
        missingDocuments: missing,
        details: {
          calendererCocId: calendererCoc.id,
          compounderCocId: compounderCoc.id,
          graphPdfPath,
          calendererApproved,
          compounderApproved,
          missingDocuments: missing,
          lastCheckedAt: nowISO(),
        },
      };
      await this.updateReadinessStatus(auCoc, result);
      return result;
    }

    const hasBatchData = (compounderCoc.extractedData?.batches || []).length > 0;

    if (!hasBatchData) {
      const result = this.notReadyWith(
        "Compounder batch test data",
        AuCocReadinessStatus.WAITING_FOR_COMPOUNDER_COC,
        calendererCoc,
        compounderCoc,
      );
      await this.updateReadinessStatus(auCoc, result);
      return result;
    }

    const result: ReadinessResult = {
      ready: true,
      readinessStatus: AuCocReadinessStatus.READY_FOR_GENERATION,
      calendererCoc,
      compounderCoc,
      graphPdfPath,
      missingDocuments: [],
      details: {
        calendererCocId: calendererCoc.id,
        compounderCocId: compounderCoc.id,
        graphPdfPath,
        calendererApproved: true,
        compounderApproved: true,
        missingDocuments: [],
        lastCheckedAt: nowISO(),
      },
    };

    this.logger.log(
      `AU CoC ${auCoc.cocNumber} is READY for generation: calenderer=${calendererCoc.id}, compounder=${compounderCoc.id}, graph=${graphPdfPath}`,
    );

    await this.updateReadinessStatus(auCoc, result);
    return result;
  }

  async checkAndAutoGenerateForDeliveryNote(customerDeliveryNoteId: number): Promise<void> {
    const auCoc = await this.auCocRepository.findOne({
      where: { sourceDeliveryNoteId: customerDeliveryNoteId },
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
    const supplierCoc = await this.supplierCocRepository.findOne({
      where: { id: supplierCocId },
    });

    if (!supplierCoc) return;

    const orderNumber = supplierCoc.orderNumber || supplierCoc.extractedData?.orderNumber || null;

    if (!orderNumber) return;

    const pendingAuCocs = await this.findPendingAuCocsByOrderNumber(orderNumber);

    await Promise.all(pendingAuCocs.map((auCoc) => this.autoGenerateIfReady(auCoc.id)));
  }

  async autoGenerateAuCoc(
    auCocId: number,
  ): Promise<{ generated: boolean; auCocId: number; reason: string }> {
    const auCoc = await this.auCocRepository.findOne({
      where: { id: auCocId },
      relations: ["customerCompany"],
    });

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
      return {
        generated: false,
        auCocId,
        reason: `Not ready: ${readiness.missingDocuments.join(", ")}`,
      };
    }

    try {
      const { buffer, filename } = await this.auCocService.generatePdf(auCocId);

      await this.auCocRepository.update(auCocId, {
        readinessStatus: AuCocReadinessStatus.AUTO_GENERATED,
      });

      this.logger.log(
        `Auto-generated AU CoC ${auCoc.cocNumber} (${filename}, ${buffer.length} bytes) — ` +
          `calenderer=${readiness.details.calendererCocId}, ` +
          `compounder=${readiness.details.compounderCocId}, ` +
          `graph=${readiness.details.graphPdfPath}`,
      );

      this.notifyAdminForVerification(auCoc);

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
    const draftCocs = await this.auCocRepository.find({
      where: { status: "DRAFT" as never },
    });

    if (draftCocs.length === 0) {
      return { checked: 0, generated: 0, details: ["No draft AU CoCs found"] };
    }

    const results = await draftCocs.reduce(
      async (accPromise, auCoc) => {
        const acc = await accPromise;
        const readiness = await this.checkReadiness(auCoc.id);

        if (!readiness.ready) {
          return {
            ...acc,
            details: [
              ...acc.details,
              `${auCoc.cocNumber}: not ready (${readiness.missingDocuments.join(", ")})`,
            ],
          };
        }

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

  async findPendingAuCocsByOrderNumber(orderNumber: string): Promise<RubberAuCoc[]> {
    const allDraftCocs = await this.auCocRepository.find({
      where: { status: "DRAFT" as never },
    });

    return allDraftCocs.filter((coc) => {
      const rollNumbers = (coc.extractedRollData || [])
        .map((r) => r.rollNumber)
        .filter(Boolean) as string[];
      const prefixes = rollNumbers.map((rn) => rn.split("-")[0]?.trim());
      return prefixes.includes(orderNumber);
    });
  }

  private async findCalendererCoc(orderPrefixes: string[]): Promise<RubberSupplierCoc | null> {
    if (orderPrefixes.length === 0) return null;

    const calendererCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .getMany();

    const matched = calendererCocs.find((coc) => {
      const cocOrderNumber = (coc.orderNumber || coc.extractedData?.orderNumber || "")
        .trim()
        .toUpperCase();
      return orderPrefixes.some((p) => cocOrderNumber === p.toUpperCase());
    });

    return matched || null;
  }

  private async findCompounderCoc(
    calendererCoc: RubberSupplierCoc,
  ): Promise<RubberSupplierCoc | null> {
    const linkedIds = calendererCoc.extractedData?.linkedCompounderCocIds || [];

    if (linkedIds.length > 0) {
      const linked = await this.supplierCocRepository.findOne({
        where: { id: linkedIds[0] },
      });
      if (linked) return linked;
    }

    if (calendererCoc.orderNumber) {
      const byOrder = await this.supplierCocRepository.findOne({
        where: {
          cocType: SupplierCocType.COMPOUNDER,
          orderNumber: calendererCoc.orderNumber,
        },
        order: { id: "DESC" },
      });
      if (byOrder) {
        this.logger.log(
          `Matched compounder CoC ${byOrder.id} by shared order number ${calendererCoc.orderNumber}`,
        );
        return byOrder;
      }
    }

    const compoundCode = calendererCoc.compoundCode;
    if (!compoundCode) return null;

    return this.findCompounderByCompoundCode(compoundCode);
  }

  private async findCompounderByCompoundCode(
    calendererCompoundCode: string,
  ): Promise<RubberSupplierCoc | null> {
    const match = calendererCompoundCode.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) return null;

    const [, baseCode, hardness] = match;
    const baseWithoutGrade = baseCode.length > 2 ? baseCode.slice(0, -1) : baseCode;
    const candidates = [`AUA${hardness}${baseWithoutGrade}`, `AUA${hardness}${baseCode}`];

    this.logger.log(
      `Looking for compounder by compound code candidates: ${JSON.stringify(candidates)} (from calenderer ${calendererCompoundCode})`,
    );

    const compounderCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("coc.compound_code IN (:...codes)", { codes: candidates })
      .orderBy("coc.id", "DESC")
      .getMany();

    if (compounderCocs.length === 0) return null;

    const withGraph = compounderCocs.find((c) => c.graphPdfPath);
    return withGraph || compounderCocs[0];
  }

  private async updateReadinessStatus(auCoc: RubberAuCoc, result: ReadinessResult): Promise<void> {
    await this.auCocRepository.update(auCoc.id, {
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
          <a href="${cocLink}" style="display: inline-block; padding: 10px 20px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Review AU CoC
          </a>
        </div>
      </body>
      </html>
    `;

    this.emailService
      .sendEmail({
        to: adminEmail,
        subject: `AU CoC Auto-Generated — ${auCoc.cocNumber} — Verification Required`,
        html,
      })
      .then(() => {
        this.logger.log(`Verification notification sent to ${adminEmail} for ${auCoc.cocNumber}`);
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send verification notification for ${auCoc.cocNumber}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }

  private notReadyWith(
    missingDocument: string,
    status: AuCocReadinessStatus,
    calendererCoc: RubberSupplierCoc | null,
    compounderCoc: RubberSupplierCoc | null,
  ): ReadinessResult {
    return {
      ready: false,
      readinessStatus: status,
      calendererCoc,
      compounderCoc,
      graphPdfPath: null,
      missingDocuments: [missingDocument],
      details: {
        calendererCocId: calendererCoc?.id ?? null,
        compounderCocId: compounderCoc?.id ?? null,
        graphPdfPath: null,
        calendererApproved: calendererCoc?.processingStatus === CocProcessingStatus.APPROVED,
        compounderApproved: compounderCoc?.processingStatus === CocProcessingStatus.APPROVED,
        missingDocuments: [missingDocument],
        lastCheckedAt: nowISO(),
      },
    };
  }
}
