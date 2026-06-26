import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import PDFMerger from "pdf-merger-js";
import sharp from "sharp";
import { EmailService } from "../email/email.service";
import { formatDateZA, generateUniqueId, now, nowISO } from "../lib/datetime";
import { pdfToPngOffThread } from "../lib/pdf/pdf-to-png-offthread";
import { createPdfDocument } from "../lib/pdf-builder";
import type { PdfDoc } from "../lib/pdf-templates/types";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  CreateAuCocDto,
  RubberAuCocDto,
  RubberAuCocItemDto,
  SendAuCocDto,
} from "./dto/rubber-coc.dto";
import {
  AuCocReadinessStatus,
  AuCocStatus,
  type ExtractedRollData,
  RubberAuCoc,
} from "./entities/rubber-au-coc.entity";
import { RubberAuCocItem } from "./entities/rubber-au-coc-item.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";
import {
  ExtractedCocData,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { RubberAuCocItemRepository } from "./repositories/rubber-au-coc-item.repository";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberCompoundBatchRepository } from "./repositories/rubber-compound-batch.repository";
import { RubberCompoundQualityConfigRepository } from "./repositories/rubber-compound-quality-config.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberDeliveryNoteItemRepository } from "./repositories/rubber-delivery-note-item.repository";
import { RubberRollRejectionRepository } from "./repositories/rubber-roll-rejection.repository";
import { RubberRollStockRepository } from "./repositories/rubber-roll-stock.repository";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";

const AU_COC_STATUS_LABELS: Record<AuCocStatus, string> = {
  [AuCocStatus.DRAFT]: "Draft",
  [AuCocStatus.GENERATED]: "Generated",
  [AuCocStatus.APPROVED]: "Approved",
  [AuCocStatus.SENT]: "Sent",
};

const AU_COC_ARCHIVE_BCC = "info@auind.co.za";

interface BatchTestData {
  batchNumber: string;
  shoreA: number | null;
  density: number | null;
  rebound: number | null;
  tearStrength: number | null;
  tensile: number | null;
  elongation: number | null;
}

interface CocPdfData {
  coc: RubberAuCoc;
  compoundCode: string;
  compoundDescription: string;
  productionDate: string;
  rollSizesQty: string;
  batches: BatchTestData[];
  rollNumbers: string[];
  qualityConfig: RubberCompoundQualityConfig | null;
  graphPdfPath?: string | null;
  sourceIncomplete?: boolean;
  incompleteReason?: string | null;
  resolvedSupplierCocId?: number | null;
  resolvedCompounderCocId?: number | null;
}

@Injectable()
export class RubberAuCocService {
  private readonly logger = new Logger(RubberAuCocService.name);

  constructor(
    private auCocRepository: RubberAuCocRepository,
    private auCocItemRepository: RubberAuCocItemRepository,
    private rollStockRepository: RubberRollStockRepository,
    private compoundBatchRepository: RubberCompoundBatchRepository,
    private companyRepository: RubberCompanyRepository,
    private qualityConfigRepository: RubberCompoundQualityConfigRepository,
    private supplierCocRepository: RubberSupplierCocRepository,
    private deliveryNoteRepository: RubberDeliveryNoteRepository,
    private deliveryNoteItemRepository: RubberDeliveryNoteItemRepository,
    private rollRejectionRepository: RubberRollRejectionRepository,
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async allAuCocs(filters?: {
    status?: AuCocStatus;
    customerCompanyId?: number;
  }): Promise<RubberAuCocDto[]> {
    const rows = await this.auCocRepository.findWithItemCounts(filters);
    return rows.map((row) => {
      const extractedRollCount = row.coc.extractedRollData?.length || 0;
      return this.mapAuCocToDto(row.coc, Math.max(row.linkedItemCount, extractedRollCount));
    });
  }

  async auCocById(id: number): Promise<RubberAuCocDto | null> {
    try {
      this.logger.debug(`Fetching AU CoC with id: ${id}`);
      const coc = await this.auCocRepository.findById(id, ["customerCompany"]);
      if (!coc) return null;

      this.logger.debug(`Found AU CoC: ${coc.cocNumber}, fetching items...`);
      const items = await this.auCocItemRepository.findByAuCocIdWithRolls(id);

      this.logger.debug(`Found ${items.length} items, mapping to DTO...`);
      const extractedRollCount = coc.extractedRollData?.length || 0;
      const dto = this.mapAuCocToDto(coc, Math.max(items.length, extractedRollCount));
      dto.items = items.map((item) => this.mapAuCocItemToDto(item));
      return dto;
    } catch (error) {
      this.logger.error(`Error fetching AU CoC ${id}:`, error);
      throw error;
    }
  }

  async createAuCoc(dto: CreateAuCocDto, createdBy?: string): Promise<RubberAuCocDto> {
    const customer = await this.companyRepository.findById(dto.customerCompanyId);
    if (!customer) {
      throw new BadRequestException("Customer company not found");
    }

    const rolls = await this.rollStockRepository.findManyByIdsWithCoding(dto.rollIds);

    if (rolls.length !== dto.rollIds.length) {
      throw new BadRequestException("Some roll IDs not found");
    }

    const unavailableRolls = rolls.filter(
      (r) => r.status !== RollStockStatus.IN_STOCK && r.status !== RollStockStatus.RESERVED,
    );
    if (unavailableRolls.length > 0) {
      throw new BadRequestException(
        `These rolls can't go on a CoC: ${unavailableRolls
          .map((r) => `${r.rollNumber} (${r.status})`)
          .join(", ")}. Returned/credited (REJECTED) or scrapped rolls cannot be certified.`,
      );
    }

    const cocNumber = await this.generateCocNumber();

    const auCoc = this.auCocRepository.build({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocNumber,
      customerCompanyId: dto.customerCompanyId,
      poNumber: dto.poNumber ?? null,
      deliveryNoteRef: dto.deliveryNoteRef ?? null,
      status: AuCocStatus.DRAFT,
      notes: dto.notes ?? null,
      createdBy: createdBy ?? null,
      approvedByName: dto.approvedByName ?? null,
    });

    const savedCoc = await this.auCocRepository.save(auCoc);

    const items = rolls.map((roll) =>
      this.auCocItemRepository.build({
        firebaseUid: `pg_${generateUniqueId()}`,
        auCocId: savedCoc.id,
        rollStockId: roll.id,
      }),
    );

    await this.auCocItemRepository.saveMany(items);

    await this.rollStockRepository.setAuCocIdForRollIds(dto.rollIds, savedCoc.id);

    const result = await this.auCocRepository.findById(savedCoc.id, ["customerCompany"]);

    const savedItems = await this.auCocItemRepository.findByAuCocIdWithRolls(savedCoc.id);

    const cocDto = this.mapAuCocToDto(result!);
    cocDto.items = savedItems.map((item) => this.mapAuCocItemToDto(item));
    return cocDto;
  }

  async createAuCocFromDeliveryNote(
    deliveryNoteId: number,
    createdBy?: string,
  ): Promise<RubberAuCocDto> {
    const deliveryNote = await this.deliveryNoteRepository.findById(deliveryNoteId, [
      "supplierCompany",
    ]);

    if (!deliveryNote) {
      throw new BadRequestException("Delivery note not found");
    }

    if (deliveryNote.stockCategory) {
      throw new BadRequestException(
        `Delivery note ${deliveryNote.deliveryNoteNumber} is categorised as "${deliveryNote.stockCategory}" — CoCs are only generated for rubber rolls`,
      );
    }

    if (!deliveryNote.supplierCompanyId) {
      throw new BadRequestException("Delivery note has no customer assigned");
    }

    const customer = await this.companyRepository.findById(deliveryNote.supplierCompanyId);

    if (!customer) {
      throw new BadRequestException("Customer company not found");
    }

    const existingForDelivery = await this.existingAuCocForDelivery(
      deliveryNoteId,
      deliveryNote.supplierCompanyId,
      deliveryNote.deliveryNoteNumber,
    );
    if (existingForDelivery) {
      this.logger.log(
        `Reusing AU CoC ${existingForDelivery.cocNumber} for delivery note ${deliveryNote.deliveryNoteNumber} (customer ${deliveryNote.supplierCompanyId}) — not creating a duplicate`,
      );
      return this.mapAuCocToDto(existingForDelivery);
    }

    const extractedData = deliveryNote.extractedData;
    const rolls = extractedData?.rolls || [];

    const extractedRollData: ExtractedRollData[] = rolls.map((roll) => ({
      rollNumber: roll.rollNumber ?? "",
      thicknessMm: roll.thicknessMm ?? null,
      widthMm: roll.widthMm ?? null,
      lengthM: roll.lengthM ?? null,
      weightKg: roll.weightKg ?? null,
      areaSqM: roll.areaSqM ?? null,
    }));

    const cocNumber = await this.generateCocNumber();

    const auCoc = this.auCocRepository.build({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocNumber,
      customerCompanyId: deliveryNote.supplierCompanyId,
      poNumber: deliveryNote.customerReference ?? null,
      deliveryNoteRef: this.normalizedDeliveryNoteRef(deliveryNote.deliveryNoteNumber),
      sourceDeliveryNoteId: deliveryNoteId,
      extractedRollData: extractedRollData.length > 0 ? extractedRollData : null,
      status: AuCocStatus.DRAFT,
      createdBy: createdBy ?? null,
    });

    const savedCoc = await this.saveAuCocDeduped(
      auCoc,
      deliveryNoteId,
      deliveryNote.supplierCompanyId,
      deliveryNote.deliveryNoteNumber,
    );

    if (savedCoc.cocNumber !== cocNumber) {
      this.logger.log(
        `AU CoC for delivery note ${deliveryNote.deliveryNoteNumber} already existed (${savedCoc.cocNumber}); reusing it after a concurrent create`,
      );
      return this.mapAuCocToDto(savedCoc);
    }

    const result = await this.auCocRepository.findById(savedCoc.id, ["customerCompany"]);

    this.logger.log(
      `Created AU CoC ${cocNumber} from delivery note ${deliveryNote.deliveryNoteNumber} with ${extractedRollData.length} rolls`,
    );

    return this.mapAuCocToDto(result!);
  }

  private normalizedDeliveryNoteRef(ref: string | null | undefined): string | null {
    const trimmed = ref?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }

  private async existingAuCocForDelivery(
    deliveryNoteId: number,
    customerCompanyId: number,
    deliveryNoteRef: string | null,
  ): Promise<RubberAuCoc | null> {
    const bySource = await this.auCocRepository.findOneWhere({
      sourceDeliveryNoteId: deliveryNoteId,
    });
    if (bySource) {
      return this.auCocRepository.findById(bySource.id, ["customerCompany"]);
    }
    const ref = this.normalizedDeliveryNoteRef(deliveryNoteRef);
    if (!ref) {
      return null;
    }
    const byBusinessKey = await this.auCocRepository.findOneWhere({
      customerCompanyId,
      deliveryNoteRef: ref,
    });
    if (!byBusinessKey) {
      return null;
    }
    if (
      byBusinessKey.sourceDeliveryNoteId != null &&
      byBusinessKey.sourceDeliveryNoteId !== deliveryNoteId
    ) {
      this.logger.warn(
        `Reusing AU CoC ${byBusinessKey.cocNumber} for DN ref "${ref}" (customer ${customerCompanyId}): it was sourced from delivery note ${byBusinessKey.sourceDeliveryNoteId}, not ${deliveryNoteId}. If these are genuinely different deliveries that reuse a DN number, review manually.`,
      );
    }
    return this.auCocRepository.findById(byBusinessKey.id, ["customerCompany"]);
  }

  private isBusinessKeyDuplicate(error: unknown): boolean {
    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoError.code !== 11000) {
      return false;
    }
    const keyPattern = mongoError.keyPattern;
    if (!keyPattern) {
      return true;
    }
    return "deliveryNoteRef" in keyPattern || "customerCompanyId" in keyPattern;
  }

  private async saveAuCocDeduped(
    auCoc: RubberAuCoc,
    deliveryNoteId: number,
    customerCompanyId: number,
    deliveryNoteRef: string | null,
  ): Promise<RubberAuCoc> {
    try {
      return await this.auCocRepository.save(auCoc);
    } catch (error) {
      if (!this.isBusinessKeyDuplicate(error)) {
        throw error;
      }
      const existing = await this.existingAuCocForDelivery(
        deliveryNoteId,
        customerCompanyId,
        deliveryNoteRef,
      );
      if (existing) {
        return existing;
      }
      throw error;
    }
  }

  async generationReadiness(id: number): Promise<{
    ready: boolean;
    sourceIncomplete: boolean;
    compoundCode: string;
    batchCount: number;
    hasGraph: boolean;
    graphPdfPath: string | null;
    resolvedSupplierCocId: number | null;
    resolvedCompounderCocId: number | null;
    reason: string | null;
  }> {
    const miss = (reason: string) => ({
      ready: false,
      sourceIncomplete: true,
      compoundCode: "",
      batchCount: 0,
      hasGraph: false,
      graphPdfPath: null,
      resolvedSupplierCocId: null,
      resolvedCompounderCocId: null,
      reason,
    });
    const coc = await this.auCocRepository.findById(id);
    if (!coc) return miss("AU CoC not found");

    const items = await this.auCocItemRepository.findByAuCocIdWithRolls(id);
    let hasExtractedRollData = (coc.extractedRollData?.length ?? 0) > 0;
    if (items.length === 0 && !hasExtractedRollData && coc.sourceDeliveryNoteId) {
      await this.populateRollDataFromDeliveryNote(coc);
      hasExtractedRollData = (coc.extractedRollData?.length ?? 0) > 0;
    }
    if (items.length === 0 && !hasExtractedRollData) return miss("No roll data on the CoC");

    const pdfData =
      items.length > 0
        ? await this.preparePdfData(coc, items)
        : await this.preparePdfDataFromExtractedRolls(coc);

    const batchCount = pdfData.batches.length;
    const hasGraph = !!pdfData.graphPdfPath;
    const sourceIncomplete = !!pdfData.sourceIncomplete;
    const ready = !sourceIncomplete && batchCount > 0;
    const reason = sourceIncomplete
      ? (pdfData.incompleteReason ?? "matching-compound supplier CoC not found")
      : batchCount === 0
        ? "no batch test data in the source CoC"
        : null;
    return {
      ready,
      sourceIncomplete,
      compoundCode: pdfData.compoundCode,
      batchCount,
      hasGraph,
      graphPdfPath: pdfData.graphPdfPath ?? null,
      resolvedSupplierCocId: pdfData.resolvedSupplierCocId ?? null,
      resolvedCompounderCocId: pdfData.resolvedCompounderCocId ?? null,
      reason,
    };
  }

  async generatePdf(id: number): Promise<{ buffer: Buffer; filename: string }> {
    try {
      this.logger.debug(`Generating PDF for AU CoC ${id}...`);
      const coc = await this.auCocRepository.findById(id, ["customerCompany"]);
      if (!coc) {
        throw new BadRequestException("AU CoC not found");
      }

      this.logger.debug(`Found CoC ${coc.cocNumber}, fetching items...`);
      const items = await this.auCocItemRepository.findByAuCocIdWithRolls(id);

      let hasExtractedRollData = coc.extractedRollData && coc.extractedRollData.length > 0;

      if (items.length === 0 && !hasExtractedRollData && coc.sourceDeliveryNoteId) {
        await this.populateRollDataFromDeliveryNote(coc);
        hasExtractedRollData = coc.extractedRollData && coc.extractedRollData.length > 0;
      }

      if (items.length === 0 && !hasExtractedRollData) {
        throw new BadRequestException("No rolls found for this CoC");
      }

      this.logger.debug(
        `Found ${items.length} stock items, ${hasExtractedRollData ? coc.extractedRollData!.length : 0} extracted rolls, preparing PDF data...`,
      );
      const pdfData =
        items.length > 0
          ? await this.preparePdfData(coc, items)
          : await this.preparePdfDataFromExtractedRolls(coc);

      if (pdfData.sourceIncomplete) {
        const reason = pdfData.incompleteReason || "required supplier CoC / batch data missing";
        this.logger.warn(`AU CoC ${coc.cocNumber}: refusing to generate — ${reason}`);
        throw new BadRequestException(`Cannot generate ${coc.cocNumber}: ${reason}`);
      }

      if (pdfData.batches.length === 0) {
        this.logger.warn(
          `AU CoC ${coc.cocNumber}: no batch test data found — generating PDF with empty lab analysis table`,
        );
      }

      this.logger.debug("PDF data prepared, creating PDF...");
      const basePdf = await this.createPdf(pdfData);
      const filename = `${coc.cocNumber}.pdf`;

      const buffer = await (async () => {
        if (!pdfData.graphPdfPath) return basePdf;
        this.logger.debug(`Merging graph PDF from: ${pdfData.graphPdfPath}`);
        try {
          const graphBuffer = await this.storageService.download(pdfData.graphPdfPath);
          const cleanedGraphBuffer = await this.cleanGraphPdf(graphBuffer);
          const merger = new PDFMerger();
          await merger.add(basePdf);
          await merger.add(cleanedGraphBuffer);
          const merged = await merger.saveAsBuffer();
          this.logger.debug(`Merged cleaned graph PDF, final size: ${merged.length} bytes`);
          return merged;
        } catch (graphError) {
          this.logger.warn(`Failed to merge graph PDF: ${graphError}`);
          return basePdf;
        }
      })();

      this.logger.debug(
        `PDF created (${buffer.length} bytes), uploading to storage before saving DB row...`,
      );
      const uploadFile = {
        fieldname: "file",
        originalname: filename,
        mimetype: "application/pdf",
        buffer,
        size: buffer.length,
      } as Express.Multer.File;
      const upload = await this.storageService.upload(uploadFile, "au-cocs");
      this.logger.debug(`Uploaded AU CoC PDF to ${upload.path}, updating DB row...`);

      coc.status = AuCocStatus.GENERATED;
      coc.generatedPdfPath = upload.path;
      if (
        coc.readinessStatus === AuCocReadinessStatus.GENERATION_FAILED ||
        coc.readinessStatus === AuCocReadinessStatus.READY_FOR_GENERATION
      ) {
        coc.readinessStatus = AuCocReadinessStatus.AUTO_GENERATED;
        coc.readinessDetails = {
          calendererCocId: coc.readinessDetails?.calendererCocId ?? null,
          compounderCocId: coc.readinessDetails?.compounderCocId ?? null,
          graphPdfPath: coc.readinessDetails?.graphPdfPath ?? null,
          calendererApproved: coc.readinessDetails?.calendererApproved ?? false,
          compounderApproved: coc.readinessDetails?.compounderApproved ?? false,
          missingDocuments: [],
          lastCheckedAt: nowISO(),
        };
      }
      await this.auCocRepository.save(coc);

      this.logger.log(`PDF generated and uploaded for AU CoC ${coc.cocNumber} → ${upload.path}`);
      return { buffer, filename };
    } catch (error) {
      this.logger.error(`Error generating PDF for AU CoC ${id}:`, error);
      throw error;
    }
  }

  async regenerateCocsByIds(cocIds: number[]): Promise<{
    regenerated: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    if (cocIds.length === 0) {
      return { regenerated: 0, failed: 0, total: 0, errors: [] };
    }
    const cocs = await this.auCocRepository.findByIdsOrderedById(cocIds);
    const initial = { regenerated: 0, failed: 0, total: cocs.length, errors: [] as string[] };
    return cocs.reduce(async (accPromise, coc) => {
      const acc = await accPromise;
      try {
        await this.generatePdf(coc.id);
        return { ...acc, regenerated: acc.regenerated + 1 };
      } catch (error) {
        const message = `CoC ${coc.cocNumber} (ID ${coc.id}): ${error instanceof Error ? error.message : String(error)}`;
        this.logger.warn(`Failed to regenerate AU CoC: ${message}`);
        return { ...acc, failed: acc.failed + 1, errors: [...acc.errors, message] };
      }
    }, Promise.resolve(initial));
  }

  async resendCocsByIds(cocIds: number[]): Promise<{
    sent: number;
    skipped: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    if (cocIds.length === 0) {
      return { sent: 0, skipped: 0, failed: 0, total: 0, errors: [] };
    }
    const cocs = await this.auCocRepository.findByIdsWithCustomerOrderedById(cocIds);
    const initial = {
      sent: 0,
      skipped: 0,
      failed: 0,
      total: cocs.length,
      errors: [] as string[],
    };
    return cocs.reduce(async (accPromise, coc) => {
      const acc = await accPromise;
      if (coc.status !== AuCocStatus.SENT && coc.status !== AuCocStatus.GENERATED) {
        return {
          ...acc,
          skipped: acc.skipped + 1,
          errors: [
            ...acc.errors,
            `CoC ${coc.cocNumber} (ID ${coc.id}): not in SENT/GENERATED state (currently ${coc.status})`,
          ],
        };
      }
      try {
        await this.sendApprovedAuCocToCustomer(coc.id);
        return { ...acc, sent: acc.sent + 1 };
      } catch (error) {
        const message = `CoC ${coc.cocNumber} (ID ${coc.id}): ${error instanceof Error ? error.message : String(error)}`;
        this.logger.warn(`Failed to resend AU CoC: ${message}`);
        return { ...acc, failed: acc.failed + 1, errors: [...acc.errors, message] };
      }
    }, Promise.resolve(initial));
  }

  async regenerateAllGeneratedCocs(options?: { includeSent?: boolean }): Promise<{
    regenerated: number;
    failed: number;
    total: number;
    skippedSent: number;
    errors: string[];
  }> {
    const includeSent = options?.includeSent === true;
    const statuses = includeSent
      ? [AuCocStatus.GENERATED, AuCocStatus.SENT]
      : [AuCocStatus.GENERATED];
    const skippedSent = includeSent
      ? 0
      : await this.auCocRepository.count({ status: AuCocStatus.SENT });
    const cocs = await this.auCocRepository.findByStatusesOrderedById(statuses);

    const initial = {
      regenerated: 0,
      failed: 0,
      total: cocs.length,
      skippedSent,
      errors: [] as string[],
    };

    return cocs.reduce(async (accPromise, coc) => {
      const acc = await accPromise;
      try {
        await this.generatePdf(coc.id);
        return { ...acc, regenerated: acc.regenerated + 1 };
      } catch (error) {
        const message = `CoC ${coc.cocNumber} (ID ${coc.id}): ${error instanceof Error ? error.message : String(error)}`;
        this.logger.warn(`Failed to regenerate AU CoC: ${message}`);
        return {
          ...acc,
          failed: acc.failed + 1,
          errors: [...acc.errors, message],
        };
      }
    }, Promise.resolve(initial));
  }

  async pdfBuffer(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const coc = await this.auCocRepository.findById(id, ["customerCompany"]);
    if (!coc) {
      throw new BadRequestException("AU CoC not found");
    }

    const cachedPath = coc.generatedPdfPath;
    if (cachedPath) {
      try {
        const cachedBuffer = await this.storageService.download(cachedPath);
        return { buffer: cachedBuffer, filename: `${coc.cocNumber}.pdf` };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `AU CoC ${coc.cocNumber} (#${id}) generatedPdfPath ${cachedPath} missing from storage — regenerating: ${message}`,
        );
      }
    }

    const items = await this.auCocItemRepository.findByAuCocIdWithRolls(id);

    const hasExtractedRollData = coc.extractedRollData && coc.extractedRollData.length > 0;

    if (items.length === 0 && !hasExtractedRollData) {
      throw new BadRequestException("No rolls found for this CoC");
    }

    const pdfData =
      items.length > 0
        ? await this.preparePdfData(coc, items)
        : await this.preparePdfDataFromExtractedRolls(coc);
    const basePdf = await this.createPdf(pdfData);
    const filename = `${coc.cocNumber}.pdf`;

    const buffer = await (async () => {
      if (!pdfData.graphPdfPath) return basePdf;
      try {
        const graphBuffer = await this.storageService.download(pdfData.graphPdfPath);
        const cleanedGraphBuffer = await this.cleanGraphPdf(graphBuffer);
        const merger = new PDFMerger();
        await merger.add(basePdf);
        await merger.add(cleanedGraphBuffer);
        return merger.saveAsBuffer();
      } catch (graphError) {
        this.logger.warn(`Failed to merge graph PDF: ${graphError}`);
        return basePdf;
      }
    })();

    return { buffer, filename };
  }

  private withArchiveBcc(bcc?: string | null): string {
    const parts = (bcc || "")
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.some((p) => p.toLowerCase() === AU_COC_ARCHIVE_BCC.toLowerCase())) {
      return [...parts, AU_COC_ARCHIVE_BCC].join(", ");
    }
    return parts.join(", ");
  }

  async sendToCustomer(id: number, dto: SendAuCocDto): Promise<RubberAuCocDto> {
    const coc = await this.auCocRepository.findById(id, ["customerCompany"]);
    if (!coc) {
      throw new BadRequestException("AU CoC not found");
    }
    if (coc.status === AuCocStatus.DRAFT) {
      throw new BadRequestException("PDF must be generated before sending");
    }

    const { buffer: pdfBuffer } = await this.pdfBuffer(id);
    const customerName = coc.customerCompany?.name || "Customer";

    await this.emailService.sendEmail({
      to: dto.email,
      cc: dto.cc,
      bcc: this.withArchiveBcc(dto.bcc),
      subject: `Certificate of Conformance - ${coc.cocNumber}`,
      fromName: "AU Industries",
      html: [
        `<p>Dear ${customerName},</p>`,
        `<p>Please find attached the Certificate of Conformance <strong>${coc.cocNumber}</strong>.</p>`,
        coc.poNumber ? `<p>PO Reference: ${coc.poNumber}</p>` : "",
        coc.deliveryNoteRef ? `<p>Delivery Note: ${coc.deliveryNoteRef}</p>` : "",
        "<p>Kind regards,<br/>AU Industries</p>",
      ].join("\n"),
      attachments: [
        {
          filename: `${coc.cocNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    coc.sentToEmail = dto.email;
    coc.sentAt = now().toJSDate();
    coc.status = AuCocStatus.SENT;
    await this.auCocRepository.save(coc);

    this.logger.log(`AU CoC ${coc.cocNumber} sent to ${dto.email}`);

    return this.mapAuCocToDto(coc);
  }

  async bulkSendToCustomer(
    dto: SendAuCocDto,
  ): Promise<{ sent: number; total: number; cocNumbers: string[] }> {
    const generatedCocs = await this.auCocRepository.findByStatusWithCustomerOrderedByCocNumber(
      AuCocStatus.GENERATED,
    );

    if (generatedCocs.length === 0) {
      throw new BadRequestException("No generated CoCs to send");
    }

    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
    const cocNumbers: string[] = [];

    for (const coc of generatedCocs) {
      const { buffer: pdfBuffer } = await this.pdfBuffer(coc.id);
      attachments.push({
        filename: `${coc.cocNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
      cocNumbers.push(coc.cocNumber);
    }

    const customerName = generatedCocs[0].customerCompany?.name || "Customer";
    const cocList = cocNumbers.map((n) => `<li>${n}</li>`).join("\n");

    await this.emailService.sendEmail({
      to: dto.email,
      cc: dto.cc,
      bcc: this.withArchiveBcc(dto.bcc),
      subject: `Certificates of Conformance - ${cocNumbers.length} CoC(s)`,
      fromName: "AU Industries",
      html: [
        `<p>Dear ${customerName},</p>`,
        `<p>Please find attached ${cocNumbers.length} Certificate(s) of Conformance:</p>`,
        `<ul>${cocList}</ul>`,
        "<p>Kind regards,<br/>AU Industries</p>",
      ].join("\n"),
      attachments,
    });

    const sentAt = now().toJSDate();
    for (const coc of generatedCocs) {
      coc.sentToEmail = dto.email;
      coc.sentAt = sentAt;
      coc.status = AuCocStatus.SENT;
    }
    await this.auCocRepository.saveMany(generatedCocs);

    this.logger.log(
      `Bulk sent ${generatedCocs.length} AU CoCs to ${dto.email}: ${cocNumbers.join(", ")}`,
    );

    return { sent: generatedCocs.length, total: generatedCocs.length, cocNumbers };
  }

  async deleteAuCoc(id: number): Promise<boolean> {
    const coc = await this.auCocRepository.findById(id);
    if (!coc) return false;

    if (coc.status === AuCocStatus.SENT) {
      throw new BadRequestException("Sent CoCs cannot be deleted");
    }

    await this.rollStockRepository.clearAuCocId(id);

    await this.auCocItemRepository.deleteByAuCocId(id);
    return this.auCocRepository.deleteById(id);
  }

  private async generateCocNumber(): Promise<string> {
    const seq = await this.auCocRepository.nextCocSequence();
    return `AU-COC-${String(seq).padStart(4, "0")}`;
  }

  private formatRollSizesQty(
    rolls: { thicknessMm?: number | null; widthMm?: number | null; lengthM?: number | null }[],
  ): string {
    if (rolls.length === 0) return "-";

    const groups = rolls.reduce<{ label: string; count: number }[]>((acc, roll) => {
      const label = `${roll.thicknessMm ?? "-"}mm x ${roll.widthMm ?? "-"}mm x ${roll.lengthM ?? "-"}m`;
      const existing = acc.find((g) => g.label === label);
      return existing
        ? acc.map((g) => (g.label === label ? { ...g, count: g.count + 1 } : g))
        : [...acc, { label, count: 1 }];
    }, []);

    return groups.map((g) => `${g.label} (${g.count} roll${g.count !== 1 ? "s" : ""})`).join("; ");
  }

  private async preparePdfData(coc: RubberAuCoc, items: RubberAuCocItem[]): Promise<CocPdfData> {
    const firstRoll = items[0]?.rollStock;
    const compoundCoding = firstRoll?.compoundCoding;

    const allBatchIds = items.flatMap((item) => item.rollStock?.linkedBatchIds || []);
    const uniqueBatchIds = [...new Set(allBatchIds)];

    const batches =
      uniqueBatchIds.length > 0
        ? await this.compoundBatchRepository.findByIdsWithSupplierCocOrdered(uniqueBatchIds)
        : [];

    const compoundCode = batches[0]?.supplierCoc?.compoundCode || compoundCoding?.code || "Unknown";

    const qualityConfig: RubberCompoundQualityConfig | null = compoundCode
      ? await this.qualityConfigRepository.findOneByCompoundCode(compoundCode)
      : null;

    const rollStocks = items
      .map((item) => item.rollStock)
      .filter((rs): rs is RubberRollStock => !!rs);
    const rollSizesQty = this.formatRollSizesQty(rollStocks);

    const presentRollNumbers = rollStocks
      .map((rs) => rs.rollNumber)
      .filter((rn): rn is string => !!rn);
    const rollNumbers = presentRollNumbers.length > 0 ? presentRollNumbers : ["-"];

    const batchTestData: BatchTestData[] = batches.map((batch) => ({
      batchNumber: batch.batchNumber,
      shoreA: batch.shoreAHardness != null ? Number(batch.shoreAHardness) : null,
      density: batch.specificGravity != null ? Number(batch.specificGravity) : null,
      rebound: batch.reboundPercent != null ? Number(batch.reboundPercent) : null,
      tearStrength: batch.tearStrengthKnM != null ? Number(batch.tearStrengthKnM) : null,
      tensile: batch.tensileStrengthMpa != null ? Number(batch.tensileStrengthMpa) : null,
      elongation: batch.elongationPercent != null ? Number(batch.elongationPercent) : null,
    }));

    const compoundDescription =
      this.descriptionFromCompoundCode(compoundCode) ||
      qualityConfig?.compoundDescription ||
      compoundCoding?.name ||
      "Rubber Compound";

    const productionDate = firstRoll?.productionDate
      ? formatDateZA(firstRoll.productionDate)
      : formatDateZA(now().toJSDate());

    return {
      coc,
      compoundCode,
      compoundDescription,
      productionDate,
      rollSizesQty,
      batches: batchTestData,
      rollNumbers,
      qualityConfig,
    };
  }

  private async preparePdfDataFromExtractedRolls(coc: RubberAuCoc): Promise<CocPdfData> {
    const extractedRolls = coc.extractedRollData || [];

    const rollSizesQty = this.formatRollSizesQty(extractedRolls);
    const presentRollNumbers = extractedRolls
      .map((r) => r.rollNumber)
      .filter((rn): rn is string => !!rn);
    const rollNumbers = presentRollNumbers.length > 0 ? presentRollNumbers : ["-"];

    const defaults = {
      compoundCode: "Per Supplier CoC",
      compoundDescription: "Rubber Compound",
      productionDate: formatDateZA(now().toJSDate()),
      batchTestData: [] as BatchTestData[],
      qualityConfig: null as RubberCompoundQualityConfig | null,
      graphPdfPath: null as string | null,
      resolvedSupplierCocId: null as number | null,
      resolvedCompounderCocId: null as number | null,
    };

    const dnItemsForCompound = coc.sourceDeliveryNoteId
      ? await this.deliveryNoteItemRepository.findManyWhere({
          deliveryNoteId: coc.sourceDeliveryNoteId,
        })
      : [];
    const expectedCompound =
      dnItemsForCompound.map((i) => (i.compoundType || "").trim()).find((c) => c.length > 0) ||
      null;
    const compoundGuardActive = !!expectedCompound && !!this.compoundHardness(expectedCompound);

    const {
      compoundCode,
      compoundDescription,
      productionDate,
      batchTestData,
      qualityConfig,
      graphPdfPath,
      resolvedSupplierCocId,
      resolvedCompounderCocId,
    } = await (async () => {
      if (!coc.sourceDeliveryNoteId && extractedRolls.length === 0) {
        return defaults;
      }

      const sourceDeliveryNote: RubberDeliveryNote | null = coc.sourceDeliveryNoteId
        ? await this.deliveryNoteRepository.findById(coc.sourceDeliveryNoteId, ["linkedCoc"])
        : null;

      const supplierCocCandidates: RubberSupplierCoc[] = await (async () => {
        const candidates: RubberSupplierCoc[] = [];

        const fromDn = sourceDeliveryNote?.linkedCoc || null;
        if (fromDn) {
          candidates.push(fromDn);
        }

        if (sourceDeliveryNote) {
          const siblingDn = await this.deliveryNoteRepository.findSiblingLinkedDeliveryNote(
            sourceDeliveryNote.id,
            sourceDeliveryNote.supplierCompanyId,
            sourceDeliveryNote.customerReference,
          );

          if (siblingDn?.linkedCoc) {
            this.logger.log(
              `Found supplier CoC ${siblingDn.linkedCoc.id} via sibling DN ${siblingDn.id} for AU CoC ${coc.cocNumber}`,
            );
            candidates.push(siblingDn.linkedCoc);
          }
        }

        if (sourceDeliveryNote && candidates.length === 0) {
          const upstreamCocs = await this.supplierCocRepository.findUpstreamCocsByCdnRollTrace(
            sourceDeliveryNote.id,
          );
          if (upstreamCocs.length > 0) {
            this.logger.log(
              `Found ${upstreamCocs.length} upstream supplier CoC(s) via roll-number trace from CDN ${sourceDeliveryNote.id} for AU CoC ${coc.cocNumber}`,
            );
            candidates.push(...upstreamCocs);
          }
        }

        if (sourceDeliveryNote && candidates.length === 0) {
          const cdnItems = await this.deliveryNoteItemRepository.findManyWhere({
            deliveryNoteId: sourceDeliveryNote.id,
          });
          const cdnRollNums = Array.from(
            new Set(cdnItems.map((i) => (i.rollNumber || "").trim()).filter((rn) => rn.length > 0)),
          );
          if (cdnRollNums.length > 0) {
            const allScocsForMatch =
              await this.supplierCocRepository.findActiveWithCocNumberOrderedByIdDesc();
            const expandRollNumbers = (cocNumber: string): Set<string> => {
              const out = new Set<string>();
              const parts = cocNumber.split(/[,\s]+/);
              for (const part of parts) {
                const rangeMatch = part.match(/^(\d{3,6})-(\d{3,6})$/);
                if (rangeMatch) {
                  const start = Number(rangeMatch[1]);
                  const end = Number(rangeMatch[2]);
                  if (end > start && end - start <= 200) {
                    for (let n = start; n <= end; n++) out.add(String(n));
                    continue;
                  }
                }
                const numericMatch = part.match(/(\d{4,6})/g);
                if (numericMatch) {
                  numericMatch.forEach((n) => out.add(n));
                }
              }
              return out;
            };
            const matched = allScocsForMatch.filter((sc) => {
              const rolls = expandRollNumbers(sc.cocNumber || "");
              return cdnRollNums.some((rn) => rolls.has(rn));
            });
            if (matched.length > 0) {
              this.logger.log(
                `Found ${matched.length} supplier CoC(s) via roll-number-in-coc-number match for AU CoC ${coc.cocNumber} (CDN rolls: ${cdnRollNums.slice(0, 5).join(",")}${cdnRollNums.length > 5 ? "..." : ""})`,
              );
              candidates.push(...matched);
            }
          }
        }

        const allSupplierCocs =
          await this.supplierCocRepository.findWithOrderNumberOrderedByIdDesc();

        if (extractedRolls.length > 0) {
          const rollNums = extractedRolls.map((r) => r.rollNumber).filter(Boolean) as string[];
          const orderNumbers = [
            ...new Set(
              rollNums
                .filter((rn) => rn.includes("-"))
                .map((rn) => rn.split("-")[0]?.trim())
                .filter((on): on is string => !!on && on.length >= 2),
            ),
          ];

          if (orderNumbers.length > 0) {
            this.logger.log(
              `Extracted supplier order numbers ${JSON.stringify(orderNumbers)} from roll numbers ${JSON.stringify(rollNums)} for AU CoC ${coc.cocNumber}`,
            );

            const matched = allSupplierCocs.filter((sc) => {
              const cocOrderNumber = (sc.orderNumber || sc.extractedData?.orderNumber || "")
                .trim()
                .toUpperCase();
              return (
                cocOrderNumber.length > 0 &&
                orderNumbers.some(
                  (on) =>
                    cocOrderNumber === on.toUpperCase() ||
                    cocOrderNumber.includes(on.toUpperCase()) ||
                    on.toUpperCase().includes(cocOrderNumber),
                )
              );
            });
            matched.forEach((m) => candidates.push(m));
          }
        }

        if (coc.poNumber) {
          const poSegments = coc.poNumber
            .split("/")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);

          const poMatched = allSupplierCocs.filter((sc) => {
            const cocOrderNumber = (sc.orderNumber || sc.extractedData?.orderNumber || "")
              .trim()
              .toUpperCase();
            return (
              cocOrderNumber.length > 0 &&
              poSegments.some(
                (seg) =>
                  seg === cocOrderNumber ||
                  cocOrderNumber.includes(seg) ||
                  seg.includes(cocOrderNumber),
              )
            );
          });
          poMatched.forEach((m) => candidates.push(m));
        }

        return candidates;
      })();

      const seenIds = new Set<number>();
      const deduplicatedCandidates = supplierCocCandidates.filter((sc) => {
        if (seenIds.has(sc.id)) return false;
        seenIds.add(sc.id);
        return true;
      });

      const rejections = await this.rollRejectionRepository.findReplacementRefsByCocIds(
        deduplicatedCandidates.map((sc) => sc.id),
      );
      const rejectedCocIds = new Set(rejections.map((r) => r.originalSupplierCocId));
      const replacementCocIds = rejections
        .filter((r) => r.replacementSupplierCocId !== null)
        .map((r) => r.replacementSupplierCocId as number);

      const replacementCocs =
        replacementCocIds.length > 0
          ? await this.supplierCocRepository.findByIds(replacementCocIds)
          : [];

      const uniqueCandidates = deduplicatedCandidates.reduce<RubberSupplierCoc[]>((acc, sc) => {
        if (rejectedCocIds.has(sc.id)) {
          const rejection = rejections.find((r) => r.originalSupplierCocId === sc.id);
          const replacement = rejection?.replacementSupplierCocId
            ? replacementCocs.find((rc) => rc.id === rejection.replacementSupplierCocId) || null
            : null;
          if (replacement) {
            this.logger.log(
              `Substituting rejected supplier CoC ${sc.id} with replacement CoC ${replacement.id} for AU CoC ${coc.cocNumber}`,
            );
            return [...acc, replacement];
          }
          this.logger.warn(
            `Excluding rejected supplier CoC ${sc.id} (no replacement linked) for AU CoC ${coc.cocNumber}`,
          );
          return acc;
        }
        return [...acc, sc];
      }, []);

      const compatibleCandidates =
        compoundGuardActive && uniqueCandidates.length > 0
          ? uniqueCandidates.filter((sc) =>
              this.compoundsCompatible(sc.compoundCode, expectedCompound),
            )
          : uniqueCandidates;

      if (compoundGuardActive && uniqueCandidates.length > 0 && compatibleCandidates.length === 0) {
        this.logger.warn(
          `AU CoC ${coc.cocNumber}: dropped all ${uniqueCandidates.length} candidate(s) — none match DN compound ${expectedCompound} (had: ${uniqueCandidates
            .map((c) => `${c.id}:${c.compoundCode}`)
            .join(", ")})`,
        );
      }

      const supplierCoc: RubberSupplierCoc | null = await (async () => {
        if (compatibleCandidates.length === 0) return null;

        const candidateWithBatchData = await compatibleCandidates.reduce(
          async (bestPromise, candidate) => {
            const best = await bestPromise;
            if (best) return best;

            const hasBatches =
              (await this.compoundBatchRepository.countBySupplierCocId(candidate.id)) > 0;
            if (hasBatches) return candidate;

            const extractedBatches = candidate.extractedData?.batches || [];
            if (extractedBatches.length > 0) return candidate;

            const compounder = await this.findCompounderForCandidate(candidate);
            if (compounder) {
              const compounderHasBatches =
                (await this.compoundBatchRepository.countBySupplierCocId(compounder.id)) > 0;
              if (compounderHasBatches) return candidate;

              const compounderExtracted = compounder.extractedData?.batches || [];
              if (compounderExtracted.length > 0) return candidate;
            }

            return null;
          },
          Promise.resolve(null as RubberSupplierCoc | null),
        );

        if (candidateWithBatchData) {
          this.logger.log(
            `Selected supplier CoC ${candidateWithBatchData.id} (type: ${candidateWithBatchData.cocType}, order: ${candidateWithBatchData.orderNumber}) with batch data for AU CoC ${coc.cocNumber}`,
          );
          return candidateWithBatchData;
        }

        this.logger.warn(
          `No candidates with batch data found for AU CoC ${coc.cocNumber} (${compatibleCandidates.length} compound-compatible candidates: ${compatibleCandidates.map((c) => `ID=${c.id} type=${c.cocType} order=${c.orderNumber}`).join(", ")}), using first candidate ${compatibleCandidates[0].id}`,
        );
        return compatibleCandidates[0];
      })();

      if (!supplierCoc) {
        const rollNums = extractedRolls
          .map((r) => r.rollNumber)
          .filter(Boolean)
          .join(", ");
        this.logger.warn(
          `No supplier CoC found for AU CoC ${coc.cocNumber} (DN: ${sourceDeliveryNote?.deliveryNoteNumber || "none"}, DN linked CoC: ${sourceDeliveryNote?.linkedCocId || "none"}, PO: ${coc.poNumber || "none"}, rolls: ${rollNums || "none"}, candidates found: ${uniqueCandidates.length}) — lab data table will be empty`,
        );
        return defaults;
      }

      const resolvedCompoundCode = supplierCoc.compoundCode || defaults.compoundCode;
      const resolvedProductionDate = supplierCoc.productionDate
        ? formatDateZA(supplierCoc.productionDate)
        : defaults.productionDate;

      const linkedCompounderIds = supplierCoc.extractedData?.linkedCompounderCocIds || [];
      const compounderCoc: RubberSupplierCoc | null = await (async () => {
        if (linkedCompounderIds.length > 0) {
          const linked = await this.supplierCocRepository.findById(linkedCompounderIds[0]);
          if (linked) {
            this.logger.log(
              `Found linked compounder CoC ${linked.id} for calenderer ${supplierCoc.id}`,
            );
            return linked;
          }
        }

        if (supplierCoc.orderNumber) {
          const byOrder = await this.supplierCocRepository.findOneByCocTypeAndOrderNumberLatest(
            SupplierCocType.COMPOUNDER,
            supplierCoc.orderNumber,
          );
          if (byOrder) {
            this.logger.log(
              `Matched compounder CoC ${byOrder.id} (${byOrder.compoundCode}) by shared order number ${supplierCoc.orderNumber} for calenderer ${supplierCoc.id}`,
            );
            return byOrder;
          }
        }

        if (resolvedCompoundCode && resolvedCompoundCode !== "Per Supplier CoC") {
          const byCode = await this.findCompounderByCompoundCode(resolvedCompoundCode);
          if (byCode) {
            this.logger.log(
              `Matched compounder CoC ${byCode.id} (${byCode.compoundCode}) by compound code for calenderer ${supplierCoc.id}`,
            );
            return byCode;
          }
        }

        return null;
      })();

      const resolvedGraphPdfPath = compounderCoc?.graphPdfPath || supplierCoc.graphPdfPath || null;

      const resolvedQualityConfig: RubberCompoundQualityConfig | null = await (async () => {
        if (!resolvedCompoundCode || resolvedCompoundCode === "Per Supplier CoC") return null;

        const config =
          await this.qualityConfigRepository.findOneByCompoundCode(resolvedCompoundCode);
        if (config) return config;

        const sourceCoc = compounderCoc || supplierCoc;
        const specs = sourceCoc.extractedData?.specifications;
        if (specs) {
          this.logger.log(
            `No quality config found for ${resolvedCompoundCode}, falling back to extractedData specifications`,
          );
          return {
            compoundCode: resolvedCompoundCode,
            compoundDescription: sourceCoc.extractedData?.compoundDescription ?? null,
            shoreANominal: specs.shoreANominal ?? null,
            shoreAMin: specs.shoreAMin ?? null,
            shoreAMax: specs.shoreAMax ?? null,
            densityNominal: specs.specificGravityNominal ?? null,
            densityMin: specs.specificGravityMin ?? null,
            densityMax: specs.specificGravityMax ?? null,
            reboundNominal: specs.reboundNominal ?? null,
            reboundMin: specs.reboundMin ?? null,
            reboundMax: specs.reboundMax ?? null,
            tearStrengthNominal: specs.tearStrengthNominal ?? null,
            tearStrengthMin: specs.tearStrengthMin ?? null,
            tearStrengthMax: specs.tearStrengthMax ?? null,
            tensileNominal: specs.tensileNominal ?? null,
            tensileMin: specs.tensileMin ?? null,
            tensileMax: specs.tensileMax ?? null,
            elongationNominal: specs.elongationNominal ?? null,
            elongationMin: specs.elongationMin ?? null,
            elongationMax: specs.elongationMax ?? null,
          } as RubberCompoundQualityConfig;
        }

        return null;
      })();

      const resolvedCompoundDescription =
        resolvedCompoundCode && resolvedCompoundCode !== "Per Supplier CoC"
          ? this.descriptionFromCompoundCode(resolvedCompoundCode) ||
            resolvedQualityConfig?.compoundDescription ||
            defaults.compoundDescription
          : defaults.compoundDescription;

      const batchSourceCocId = compounderCoc?.id || supplierCoc.id;
      const batches =
        await this.compoundBatchRepository.findBySupplierCocIdOrdered(batchSourceCocId);

      const resolvedBatchTestData: BatchTestData[] = (() => {
        if (batches.length > 0) {
          return batches.map((batch) => ({
            batchNumber: batch.batchNumber,
            shoreA: batch.shoreAHardness != null ? Number(batch.shoreAHardness) : null,
            density: batch.specificGravity != null ? Number(batch.specificGravity) : null,
            rebound: batch.reboundPercent != null ? Number(batch.reboundPercent) : null,
            tearStrength: batch.tearStrengthKnM != null ? Number(batch.tearStrengthKnM) : null,
            tensile: batch.tensileStrengthMpa != null ? Number(batch.tensileStrengthMpa) : null,
            elongation: batch.elongationPercent != null ? Number(batch.elongationPercent) : null,
          }));
        }

        const sourceCoc = compounderCoc || supplierCoc;
        const extractedBatches = sourceCoc.extractedData?.batches || [];
        if (extractedBatches.length > 0) {
          this.logger.log(
            `No approved batches found for CoC ${batchSourceCocId}, falling back to extractedData (${extractedBatches.length} batches)`,
          );
          return extractedBatches.map((batch) => ({
            batchNumber: batch.batchNumber,
            shoreA: batch.shoreA ?? null,
            density: batch.specificGravity ?? null,
            rebound: batch.reboundPercent ?? null,
            tearStrength: batch.tearStrengthKnM ?? null,
            tensile: batch.tensileStrengthMpa ?? null,
            elongation: batch.elongationPercent ?? null,
          }));
        }

        return [];
      })();

      return {
        compoundCode: resolvedCompoundCode,
        compoundDescription: resolvedCompoundDescription,
        productionDate: resolvedProductionDate,
        batchTestData: resolvedBatchTestData,
        qualityConfig: resolvedQualityConfig,
        graphPdfPath: resolvedGraphPdfPath,
        resolvedSupplierCocId: supplierCoc.id as number | null,
        resolvedCompounderCocId: (compounderCoc?.id ?? null) as number | null,
      };
    })();

    const sourceIncomplete =
      compoundGuardActive &&
      !!coc.sourceDeliveryNoteId &&
      (compoundCode === defaults.compoundCode ||
        !this.compoundsCompatible(compoundCode, expectedCompound) ||
        batchTestData.length === 0);

    const incompleteReason = sourceIncomplete
      ? `No approved ${expectedCompound} supplier CoC with batch data found for rolls ${
          extractedRolls
            .map((r) => r.rollNumber)
            .filter(Boolean)
            .join(", ") || "(none)"
        }`
      : null;

    return {
      coc,
      compoundCode,
      compoundDescription,
      productionDate,
      rollSizesQty,
      batches: batchTestData,
      rollNumbers,
      qualityConfig,
      graphPdfPath,
      sourceIncomplete,
      incompleteReason,
      resolvedSupplierCocId: resolvedSupplierCocId ?? null,
      resolvedCompounderCocId: resolvedCompounderCocId ?? null,
    };
  }

  private async populateRollDataFromDeliveryNote(coc: RubberAuCoc): Promise<void> {
    if (!coc.sourceDeliveryNoteId) return;

    const deliveryNote = await this.deliveryNoteRepository.findById(coc.sourceDeliveryNoteId);

    if (!deliveryNote) return;

    // Roll line items live in rubber_delivery_note_items since the line-item
    // refactor; deliveryNote.extractedData.rolls is the legacy home and is empty
    // for newer CDNs. Reading only the legacy field left every recent auto-CoC
    // with no roll data, so readiness bailed at "No roll data on the CoC" before
    // it ever resolved the supplier CoC. Read items first, fall back to legacy.
    const items = await this.deliveryNoteItemRepository.findManyWhere({
      deliveryNoteId: coc.sourceDeliveryNoteId,
    });
    const itemRolls = items.filter((item) => (item.rollNumber || "").trim().length > 0);

    const extractedRollData: ExtractedRollData[] =
      itemRolls.length > 0
        ? itemRolls.map((item) => ({
            rollNumber: item.rollNumber ?? "",
            thicknessMm: item.thicknessMm ?? null,
            widthMm: item.widthMm ?? null,
            lengthM: item.lengthM ?? null,
            weightKg: item.weightKg ?? null,
            areaSqM:
              item.widthMm != null && item.lengthM != null
                ? (item.widthMm / 1000) * item.lengthM
                : null,
          }))
        : (deliveryNote.extractedData?.rolls || []).map((roll) => ({
            rollNumber: roll.rollNumber ?? "",
            thicknessMm: roll.thicknessMm ?? null,
            widthMm: roll.widthMm ?? null,
            lengthM: roll.lengthM ?? null,
            weightKg: roll.weightKg ?? null,
            areaSqM: roll.areaSqM ?? null,
          }));

    if (extractedRollData.length === 0) return;

    coc.extractedRollData = extractedRollData;
    await this.auCocRepository.updateById(coc.id, { extractedRollData });

    this.logger.log(
      `Populated ${extractedRollData.length} rolls from DN ${deliveryNote.deliveryNoteNumber} (source: ${itemRolls.length > 0 ? "line items" : "legacy extractedData"}) for AU CoC ${coc.cocNumber}`,
    );
  }

  private async findCompounderForCandidate(
    candidate: RubberSupplierCoc,
  ): Promise<RubberSupplierCoc | null> {
    const linkedIds = candidate.extractedData?.linkedCompounderCocIds || [];
    if (linkedIds.length > 0) {
      const linked = await this.supplierCocRepository.findById(linkedIds[0]);
      if (linked) return linked;
    }

    if (candidate.orderNumber) {
      const byOrder = await this.supplierCocRepository.findOneByCocTypeAndOrderNumberLatest(
        SupplierCocType.COMPOUNDER,
        candidate.orderNumber,
      );
      if (byOrder) return byOrder;
    }

    const compoundCode = candidate.compoundCode;
    if (compoundCode && compoundCode !== "Per Supplier CoC") {
      return this.findCompounderByCompoundCode(compoundCode);
    }

    return null;
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

    const compounderCocs =
      await this.supplierCocRepository.findCompoundersByCompoundCodes(candidates);

    if (compounderCocs.length === 0) return null;

    const withGraph = compounderCocs.find((c) => c.graphPdfPath);
    return withGraph || compounderCocs[0];
  }

  private compoundHardness(code: string | null | undefined): string | null {
    if (!code) return null;
    const m = code
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .match(/(\d{2,3})/);
    return m ? m[1] : null;
  }

  private compoundIsNbr(code: string | null | undefined): boolean {
    return !!code && /NBR/i.test(code);
  }

  private compoundsCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    const ha = this.compoundHardness(a);
    const hb = this.compoundHardness(b);
    if (!ha || !hb || ha !== hb) return false;
    return this.compoundIsNbr(a) === this.compoundIsNbr(b);
  }

  private descriptionFromCompoundCode(code: string): string | null {
    const match = code.match(/^([A-Za-z])([A-Za-z]{2})([A-Za-z])(\d+)$/);
    if (!match) return null;

    const [, colourCode, curingCode, gradeCode, hardness] = match;

    const colours: Record<string, string> = {
      R: "Red",
      B: "Black",
      P: "Pink",
      Y: "Yellow",
      G: "Green",
      W: "White",
    };

    const curingMethods: Record<string, string> = {
      SC: "Steam Cured",
      PC: "Pre-cured",
      CC: "Chemically Cured",
    };

    const colour = colours[colourCode.toUpperCase()];
    const curing = curingMethods[curingCode.toUpperCase()];
    const grade = gradeCode.toUpperCase();

    if (!colour || !curing) return null;

    return `${colour} ${grade}${hardness} ${curingCode.toUpperCase()}`;
  }

  private async createPdf(data: CocPdfData): Promise<Buffer> {
    const { doc, toBuffer } = createPdfDocument({ margin: 40 });

    this.drawHeader(doc);
    this.drawDetailsSection(doc, data);
    this.drawLabDataTable(doc, data);
    this.drawComments(doc);
    this.drawFooter(doc, data);

    return toBuffer();
  }

  private drawHeader(doc: PdfDoc): void {
    const headerPath = path.join(__dirname, "..", "assets", "au-header.jpg");
    this.logger.debug(`Header image path: ${headerPath}`);
    this.logger.debug(`Header file exists: ${fs.existsSync(headerPath)}`);

    if (fs.existsSync(headerPath)) {
      doc.image(headerPath, 40, 30, { width: 515 });
    } else {
      this.logger.warn(`Header image not found at: ${headerPath}`);
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#D4A537")
        .text("AU", 270, 40)
        .fillColor("black");
      doc.fontSize(8).font("Helvetica").text("INDUSTRIES", 270, 55, { align: "center" });
    }

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text("CERTIFICATE OF CONFORMANCE", 40, 140, { align: "center", width: 515 });

    doc.moveTo(40, 165).lineTo(555, 165).lineWidth(0.5).stroke();
  }

  private drawDetailsSection(doc: PdfDoc, data: CocPdfData): void {
    const leftCol = 40;
    const rightCol = 250;
    const lineHeight = 16;

    doc.fontSize(9).font("Helvetica");

    const details = [
      { label: "COMPOUND CODE", value: data.compoundCode },
      { label: "CALENDER ROLL DESCRIPTION", value: data.compoundDescription },
      { label: "PRODUCTION DATE OF CALENDER ROLLS", value: data.productionDate },
      { label: "PURCHASE ORDER NUMBER", value: data.coc.poNumber || "-" },
      { label: "DELIVERY NOTE", value: data.coc.deliveryNoteRef || "-" },
      { label: "ROLL SIZES & QTY", value: data.rollSizesQty },
    ];

    const finalY = details.reduce((y, detail) => {
      doc.font("Helvetica").text(detail.label, leftCol, y);
      doc.font("Helvetica-Bold").text(detail.value, rightCol, y);
      return y + lineHeight;
    }, 180);

    doc.font("Helvetica-Bold").text("LABORATORY ANALYSIS DATA", leftCol, finalY + 5);
  }

  private drawLabDataTable(doc: PdfDoc, data: CocPdfData): void {
    const tableTop = 295;
    const colWidths = [85, 55, 55, 55, 55, 65, 65, 65];
    const colStarts = colWidths.reduce(
      (starts, _, i) => (i === 0 ? starts : [...starts, starts[i - 1] + colWidths[i - 1]]),
      [40],
    );

    const headers = [
      "Compound\nDetails",
      "Batches\nUsed",
      "Shore A\nlast\ntestpoint",
      "Density",
      "Rebound",
      "Tear\nStrength",
      "Tensile\nstrength",
      "Elongation\nbreak",
    ];

    let y = tableTop;

    doc.rect(40, y, 515, 35).fillAndStroke("#f5f5f5", "#cccccc");

    doc.fillColor("black").fontSize(7).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, colStarts[i] + 2, y + 3, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 35;

    const units = ["Unit", "", "[Shore A]", "[g/cm³]", "[%]", "[N/mm]", "[Mpa]", "[%]"];
    doc.rect(40, y, 515, 15).fillAndStroke("#ffffff", "#cccccc");
    doc.fillColor("black").fontSize(7).font("Helvetica");
    units.forEach((unit, i) => {
      doc.text(unit, colStarts[i] + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 15;

    const config = data.qualityConfig;
    const nominals = [
      "Nominal",
      "",
      config?.shoreANominal ? String(Number(config.shoreANominal)) : "-",
      config?.densityNominal ? Number(config.densityNominal).toFixed(3) : "-",
      config?.reboundNominal ? Number(config.reboundNominal).toFixed(2) : "-",
      config?.tearStrengthNominal ? Number(config.tearStrengthNominal).toFixed(1) : "-",
      config?.tensileNominal ? String(Number(config.tensileNominal)) : "-",
      config?.elongationNominal ? String(Number(config.elongationNominal)) : "-",
    ];

    doc.rect(40, y, 515, 15).fillAndStroke("#ffffff", "#cccccc");
    doc.fillColor("black").fontSize(7).font("Helvetica-Bold");
    nominals.forEach((val, i) => {
      doc.text(val, colStarts[i] + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 15;

    const formatRange = (min: number | null | undefined, max: number | null | undefined) => {
      if (min === null || min === undefined || max === null || max === undefined) return "-";
      return `${Number(min)}-${Number(max)}`;
    };

    const ranges = [
      "Ranges",
      "",
      formatRange(config?.shoreAMin, config?.shoreAMax),
      formatRange(config?.densityMin, config?.densityMax),
      formatRange(config?.reboundMin, config?.reboundMax),
      formatRange(config?.tearStrengthMin, config?.tearStrengthMax),
      formatRange(config?.tensileMin, config?.tensileMax),
      formatRange(config?.elongationMin, config?.elongationMax),
    ];

    doc.rect(40, y, 515, 15).fillAndStroke("#FFF9E6", "#cccccc");
    doc.fillColor("#B8860B").fontSize(7).font("Helvetica-Bold");
    ranges.forEach((val, i) => {
      doc.text(val, colStarts[i] + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      });
    });

    y += 15;

    doc.fillColor("black").font("Helvetica").fontSize(7);

    const formatVal = (val: number | null, decimals = 1): string => {
      if (val === null || val === undefined) return "";
      return val.toFixed(decimals);
    };

    const dataTop = y;
    const rollNumbers = data.rollNumbers.length > 0 ? data.rollNumbers : ["-"];
    const rollLabel =
      rollNumbers.length === 1
        ? `Roll No. ${rollNumbers[0]}`
        : `Roll Nos. ${rollNumbers.join(", ")}`;
    const rollCellHeight = (data.batches.length > 0 ? data.batches.length : 1) * 13;

    doc.rect(40, dataTop, colWidths[0], rollCellHeight).fillAndStroke("#ffffff", "#cccccc");
    doc.fillColor("black").font("Helvetica").fontSize(7);
    doc.text(rollLabel, colStarts[0] + 2, dataTop + 3, {
      width: colWidths[0] - 4,
      align: "left",
    });

    data.batches.forEach((batch, index) => {
      const isEven = index % 2 === 0;
      doc
        .rect(colStarts[1], y, 515 - colWidths[0], 13)
        .fillAndStroke(isEven ? "#ffffff" : "#f9f9f9", "#cccccc");
      doc.fillColor("black").font("Helvetica").fontSize(7);

      const rowData = [
        batch.batchNumber,
        batch.shoreA !== null ? String(Math.round(batch.shoreA)) : "",
        formatVal(batch.density, 3),
        formatVal(batch.rebound, 2),
        formatVal(batch.tearStrength, 2),
        formatVal(batch.tensile, 1),
        batch.elongation !== null ? String(Math.round(batch.elongation)) : "",
      ];

      rowData.forEach((val, i) => {
        doc.text(val, colStarts[i + 1] + 2, y + 3, {
          width: colWidths[i + 1] - 4,
          align: "center",
        });
      });

      y += 13;

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.rect(40, y, 515, 0).stroke("#cccccc");
  }

  private drawComments(doc: PdfDoc): void {
    const y = 680;

    doc.fontSize(8).font("Helvetica-Bold").fillColor("black").text("Comments:", 40, y);

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text(
        "This is to confirm that the compound listed above has been mixed using the specified materials, and used for calender production rolls.",
        40,
        y + 12,
        { width: 515, align: "center" },
      );
    doc.text("The rheology (cure rate) data meets the compound requirements.", 40, y + 24, {
      width: 515,
      align: "center",
    });
  }

  private drawFooter(doc: PdfDoc, data: CocPdfData): void {
    const y = 720;

    doc.fontSize(9).font("Helvetica").fillColor("black");

    doc.text("Approved By:", 40, y);
    doc.font("Helvetica-Bold").text(data.coc.approvedByName || "Ron Govender", 115, y);

    doc.font("Helvetica").text("Signed", 300, y);
    doc
      .moveTo(340, y + 10)
      .lineTo(430, y + 10)
      .lineWidth(0.5)
      .stroke();

    doc.text("Date:", 470, y);
    doc
      .font("Helvetica-Bold")
      .text(
        data.coc.approvedAt ? formatDateZA(data.coc.approvedAt) : formatDateZA(now().toJSDate()),
        500,
        y,
      );

    const footerPath = path.join(__dirname, "..", "assets", "au-footer.jpg");
    this.logger.debug(`Footer image path: ${footerPath}`);
    this.logger.debug(`Footer file exists: ${fs.existsSync(footerPath)}`);

    if (fs.existsSync(footerPath)) {
      doc.image(footerPath, 40, y + 25, { width: 515 });
    } else {
      this.logger.warn(`Footer image not found at: ${footerPath}`);
      doc
        .moveTo(40, y + 25)
        .lineTo(555, y + 25)
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(7)
        .font("Helvetica")
        .fillColor("#B8860B")
        .text(
          "AU Industries (Pty)Ltd Registration No. 2020/803314/07 - VAT number : 4650300389",
          40,
          y + 32,
          { align: "center", width: 515 },
        );
      doc.text(
        "8 Paul Smit Road, Anderbolt, Boksburg, 1458  Tel: 072 039 8429  www.auind.co.za",
        40,
        y + 42,
        { align: "center", width: 515 },
      );
      doc.text("Directors: A. Barrett and S.Govender", 40, y + 52, {
        align: "center",
        width: 515,
      });
    }
  }

  private mapAuCocToDto(coc: RubberAuCoc, itemCount?: number): RubberAuCocDto {
    return {
      id: coc.id,
      firebaseUid: coc.firebaseUid,
      cocNumber: coc.cocNumber,
      customerCompanyId: coc.customerCompanyId,
      customerCompanyName: coc.customerCompany?.name ?? null,
      poNumber: coc.poNumber,
      deliveryNoteRef: coc.deliveryNoteRef,
      sourceDeliveryNoteId: coc.sourceDeliveryNoteId ?? null,
      extractedRollData: coc.extractedRollData ?? null,
      status: coc.status,
      statusLabel: AU_COC_STATUS_LABELS[coc.status],
      generatedPdfPath: coc.generatedPdfPath,
      sentToEmail: coc.sentToEmail,
      sentAt: coc.sentAt?.toISOString() ?? null,
      createdBy: coc.createdBy,
      notes: coc.notes,
      approvedByName: coc.approvedByName,
      approvedAt: coc.approvedAt?.toISOString() ?? null,
      readinessStatus: coc.readinessStatus ?? null,
      readinessDetails: coc.readinessDetails ?? null,
      createdAt: coc.createdAt.toISOString(),
      updatedAt: coc.updatedAt.toISOString(),
      itemCount: itemCount ?? 0,
    };
  }

  private mapAuCocItemToDto(item: RubberAuCocItem): RubberAuCocItemDto {
    return {
      id: item.id,
      firebaseUid: item.firebaseUid,
      auCocId: item.auCocId,
      rollStockId: item.rollStockId,
      rollNumber: item.rollStock?.rollNumber ?? null,
      testDataSummary: item.testDataSummary ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async autoCreateFromCustomerDeliveryNote(
    deliveryNoteId: number,
    customerCompanyId: number,
    createdBy?: string,
  ): Promise<{
    auCoc: RubberAuCocDto | null;
    matchedSupplierCocs: { id: number; cocNumber: string | null; orderNumber: string | null }[];
    message: string;
  }> {
    const deliveryNote = await this.deliveryNoteRepository.findById(deliveryNoteId);

    if (!deliveryNote) {
      return { auCoc: null, matchedSupplierCocs: [], message: "Delivery note not found" };
    }

    if (deliveryNote.stockCategory) {
      return {
        auCoc: null,
        matchedSupplierCocs: [],
        message: `Delivery note ${deliveryNote.deliveryNoteNumber} is categorised as "${deliveryNote.stockCategory}" — CoCs are only generated for rubber rolls`,
      };
    }

    const deliveryNoteItems =
      await this.deliveryNoteItemRepository.findByDeliveryNoteId(deliveryNoteId);

    if (deliveryNoteItems.length === 0) {
      return { auCoc: null, matchedSupplierCocs: [], message: "No items in delivery note" };
    }

    const rollNumbers = deliveryNoteItems
      .map((item) => item.rollNumber)
      .filter((rn): rn is string => rn !== null && rn !== undefined);

    if (rollNumbers.length === 0) {
      return {
        auCoc: null,
        matchedSupplierCocs: [],
        message: "No roll numbers found in delivery note items",
      };
    }

    this.logger.log(`Searching for supplier COCs matching roll numbers: ${rollNumbers.join(", ")}`);

    const calendererCocs = await this.supplierCocRepository.findByCocTypeWithCompany(
      SupplierCocType.CALENDARER,
    );

    const matchedCocs = rollNumbers.reduce<RubberSupplierCoc[]>((acc, rollNumber) => {
      const normalizedRoll = rollNumber.trim().toUpperCase();

      const matchingCoc = calendererCocs.find((coc) => {
        const cocRollNumbers = coc.extractedData?.rollNumbers || [];
        const orderNumber = coc.orderNumber?.trim().toUpperCase() || "";
        const extractedOrder = coc.extractedData?.orderNumber?.trim().toUpperCase() || "";

        const rollMatch = cocRollNumbers.some((rn) => {
          const normalizedCocRoll = rn.trim().toUpperCase();
          return (
            normalizedCocRoll === normalizedRoll ||
            normalizedRoll.includes(normalizedCocRoll) ||
            normalizedCocRoll.includes(normalizedRoll)
          );
        });

        const orderMatch =
          (orderNumber && normalizedRoll.includes(orderNumber)) ||
          (extractedOrder && normalizedRoll.includes(extractedOrder)) ||
          orderNumber === normalizedRoll ||
          extractedOrder === normalizedRoll;

        return rollMatch || orderMatch;
      });

      if (matchingCoc && !acc.find((c) => c.id === matchingCoc.id)) {
        return [...acc, matchingCoc];
      }
      return acc;
    }, []);

    if (matchedCocs.length === 0) {
      return {
        auCoc: null,
        matchedSupplierCocs: [],
        message: `No matching supplier COCs found for roll numbers: ${rollNumbers.join(", ")}`,
      };
    }

    this.logger.log(`Found ${matchedCocs.length} matching supplier COC(s)`);

    const allTestData: ExtractedCocData["batches"] = matchedCocs.flatMap(
      (coc) => coc.extractedData?.batches || [],
    );
    const compoundCode = matchedCocs.find((coc) => coc.compoundCode)?.compoundCode ?? "";
    const compoundDescription =
      matchedCocs.find((coc) => coc.extractedData?.compoundDescription)?.extractedData
        ?.compoundDescription ?? "";
    const graphPdfPath = matchedCocs.find((coc) => coc.graphPdfPath)?.graphPdfPath ?? null;

    const customer = await this.companyRepository.findById(customerCompanyId);

    if (!customer) {
      return {
        auCoc: null,
        matchedSupplierCocs: matchedCocs.map((c) => ({
          id: c.id,
          cocNumber: c.cocNumber,
          orderNumber: c.orderNumber,
        })),
        message: "Customer company not found",
      };
    }

    const matchedSupplierCocs = matchedCocs.map((c) => ({
      id: c.id,
      cocNumber: c.cocNumber,
      orderNumber: c.orderNumber,
    }));

    const existingForDelivery = await this.existingAuCocForDelivery(
      deliveryNoteId,
      customerCompanyId,
      deliveryNote.deliveryNoteNumber,
    );
    if (existingForDelivery) {
      this.logger.log(
        `Reusing AU CoC ${existingForDelivery.cocNumber} for delivery note ${deliveryNote.deliveryNoteNumber} (customer ${customerCompanyId}) — not creating a duplicate`,
      );
      return {
        auCoc: this.mapAuCocToDto(existingForDelivery),
        matchedSupplierCocs,
        message: `AU CoC ${existingForDelivery.cocNumber} already exists for this delivery — reused`,
      };
    }

    const cocNumber = await this.generateCocNumber();

    const auCoc = this.auCocRepository.build({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocNumber,
      customerCompanyId,
      poNumber: null,
      deliveryNoteRef: this.normalizedDeliveryNoteRef(deliveryNote.deliveryNoteNumber),
      sourceDeliveryNoteId: deliveryNoteId,
      status: AuCocStatus.DRAFT,
      notes: `Auto-created from customer delivery note ${deliveryNote.deliveryNoteNumber}. Matched supplier COC(s): ${matchedCocs.map((c) => c.cocNumber || c.orderNumber).join(", ")}`,
      createdBy: createdBy ?? null,
      approvedByName: "Ron Govender",
    });

    const savedCoc = await this.saveAuCocDeduped(
      auCoc,
      deliveryNoteId,
      customerCompanyId,
      deliveryNote.deliveryNoteNumber,
    );

    if (savedCoc.cocNumber !== cocNumber) {
      return {
        auCoc: this.mapAuCocToDto(savedCoc),
        matchedSupplierCocs,
        message: `AU CoC ${savedCoc.cocNumber} already exists for this delivery — reused`,
      };
    }

    const result = await this.auCocRepository.findById(savedCoc.id, ["customerCompany"]);

    const auCocDto = this.mapAuCocToDto(result!);

    return {
      auCoc: auCocDto,
      matchedSupplierCocs,
      message: `Successfully created AU COC ${cocNumber} from ${matchedCocs.length} matched supplier COC(s)`,
    };
  }

  async generatePdfWithGraph(
    id: number,
    supplierCocId?: number,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { buffer: cocBuffer, filename } = await this.generatePdf(id);

    if (!supplierCocId) {
      return { buffer: cocBuffer, filename };
    }

    const supplierCoc = await this.supplierCocRepository.findById(supplierCocId);

    if (!supplierCoc?.graphPdfPath) {
      this.logger.warn(`No graph PDF found for supplier COC ${supplierCocId}`);
      return { buffer: cocBuffer, filename };
    }

    try {
      const graphBuffer = await this.storageService.download(supplierCoc.graphPdfPath);

      const mergedBuffer = await this.mergePdfWithGraph(cocBuffer, graphBuffer);

      return { buffer: mergedBuffer, filename };
    } catch (error) {
      this.logger.error(`Failed to add graph from supplier COC ${supplierCocId}:`, error);
      return { buffer: cocBuffer, filename };
    }
  }

  private async mergePdfWithGraph(cocBuffer: Buffer, graphBuffer: Buffer): Promise<Buffer> {
    const cleanedGraphBuffer = await this.cleanGraphPdf(graphBuffer);

    const PDFMerger = (await import("pdf-merger-js")).default;
    const merger = new PDFMerger();

    await merger.add(cocBuffer);
    await merger.add(cleanedGraphBuffer);

    return Buffer.from(await merger.saveAsBuffer());
  }

  private async cleanGraphPdf(graphBuffer: Buffer): Promise<Buffer> {
    try {
      const pdfInput = graphBuffer.buffer.slice(
        graphBuffer.byteOffset,
        graphBuffer.byteOffset + graphBuffer.byteLength,
      );
      const pngPages = await pdfToPngOffThread(pdfInput, {
        disableFontFace: true,
        useSystemFonts: true,
        viewportScale: 2.0,
      });

      if (pngPages.length === 0) {
        this.logger.warn("No pages found in graph PDF, returning original");
        return graphBuffer;
      }

      const graphPng = pngPages[0].content;

      const metadata = await sharp(graphPng).metadata();
      const width = metadata.width || 1190;
      const height = metadata.height || 1684;

      const headerCropHeight = Math.round(height * 0.14);
      const footerCropHeight = Math.round(height * 0.06);
      const sideCropWidth = Math.round(width * 0.02);

      const cleanedImage = await sharp(graphPng)
        .extract({
          left: sideCropWidth,
          top: headerCropHeight,
          width: width - sideCropWidth * 2,
          height: height - headerCropHeight - footerCropHeight,
        })
        .png()
        .toBuffer();

      return this.createPdfFromImage(cleanedImage);
    } catch (error) {
      this.logger.error("Failed to clean graph PDF, returning original:", error);
      return graphBuffer;
    }
  }

  private async createPdfFromImage(imageBuffer: Buffer): Promise<Buffer> {
    const { doc, toBuffer } = createPdfDocument({ layout: "landscape", margin: 0 });

    doc.image(imageBuffer, 20, 20, {
      fit: [800, 555],
      align: "center",
      valign: "center",
    });

    return toBuffer();
  }

  async approveAuCoc(id: number, approvedByName: string): Promise<RubberAuCocDto> {
    const coc = await this.auCocRepository.findById(id, ["customerCompany"]);
    if (!coc) throw new BadRequestException("AU CoC not found");
    if (coc.status !== AuCocStatus.GENERATED) {
      throw new BadRequestException(
        `AU CoC must be in GENERATED status to approve (current: ${coc.status})`,
      );
    }
    coc.status = AuCocStatus.APPROVED;
    coc.approvedByName = approvedByName;
    coc.approvedAt = now().toJSDate();
    await this.auCocRepository.save(coc);
    this.logger.log(`AU CoC ${coc.cocNumber} approved by ${approvedByName}`);
    return this.mapAuCocToDto(coc);
  }

  async sendApprovedAuCocToCustomer(id: number, overrideEmail?: string): Promise<RubberAuCocDto> {
    const coc = await this.auCocRepository.findById(id, ["customerCompany"]);
    if (!coc) throw new BadRequestException("AU CoC not found");
    if (coc.status !== AuCocStatus.APPROVED) {
      throw new BadRequestException(
        `AU CoC must be APPROVED before sending (current: ${coc.status})`,
      );
    }
    const customerEmail = coc.customerCompany ? coc.customerCompany.auCocRecipientEmail : null;
    const recipientEmail = overrideEmail || customerEmail;
    if (!recipientEmail) {
      throw new BadRequestException(
        `No recipient email configured for customer "${coc.customerCompany ? coc.customerCompany.name : "(unknown)"}". ` +
          "Set the AU CoC recipient email on the customer profile, or supply an override.",
      );
    }
    return this.sendToCustomer(id, { email: recipientEmail });
  }
}
