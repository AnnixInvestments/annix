import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import PDFMerger from "pdf-merger-js";
import { pdfToPng } from "pdf-to-png-converter";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { In, Repository } from "typeorm";
import { EmailService } from "../email/email.service";
import { formatDateZA, generateUniqueId, now, nowISO } from "../lib/datetime";
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
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundQualityConfig } from "./entities/rubber-compound-quality-config.entity";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberDeliveryNoteItem } from "./entities/rubber-delivery-note-item.entity";
import { RubberRollRejection } from "./entities/rubber-roll-rejection.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";
import {
  ExtractedCocData,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";

const AU_COC_STATUS_LABELS: Record<AuCocStatus, string> = {
  [AuCocStatus.DRAFT]: "Draft",
  [AuCocStatus.GENERATED]: "Generated",
  [AuCocStatus.SENT]: "Sent",
};

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
  rollNumber: string;
  qualityConfig: RubberCompoundQualityConfig | null;
  graphPdfPath?: string | null;
}

@Injectable()
export class RubberAuCocService {
  private readonly logger = new Logger(RubberAuCocService.name);

  constructor(
    @InjectRepository(RubberAuCoc)
    private auCocRepository: Repository<RubberAuCoc>,
    @InjectRepository(RubberAuCocItem)
    private auCocItemRepository: Repository<RubberAuCocItem>,
    @InjectRepository(RubberRollStock)
    private rollStockRepository: Repository<RubberRollStock>,
    @InjectRepository(RubberCompoundBatch)
    private compoundBatchRepository: Repository<RubberCompoundBatch>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberCompoundQualityConfig)
    private qualityConfigRepository: Repository<RubberCompoundQualityConfig>,
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberDeliveryNote)
    private deliveryNoteRepository: Repository<RubberDeliveryNote>,
    @InjectRepository(RubberDeliveryNoteItem)
    private deliveryNoteItemRepository: Repository<RubberDeliveryNoteItem>,
    @InjectRepository(RubberRollRejection)
    private rollRejectionRepository: Repository<RubberRollRejection>,
    @Inject(STORAGE_SERVICE)
    private storageService: IStorageService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async allAuCocs(filters?: {
    status?: AuCocStatus;
    customerCompanyId?: number;
  }): Promise<RubberAuCocDto[]> {
    const query = this.auCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.customerCompany", "customer")
      .addSelect(
        (sub) =>
          sub
            .select("COUNT(item.id)")
            .from("rubber_au_coc_items", "item")
            .where("item.au_coc_id = coc.id"),
        "item_count",
      )
      .orderBy("coc.created_at", "DESC");

    if (filters?.status) {
      query.andWhere("coc.status = :status", { status: filters.status });
    }
    if (filters?.customerCompanyId) {
      query.andWhere("coc.customer_company_id = :companyId", {
        companyId: filters.customerCompanyId,
      });
    }

    const rawResults = await query.getRawAndEntities();
    return rawResults.entities.map((coc, idx) => {
      const itemCount = parseInt(rawResults.raw[idx]?.item_count || "0", 10);
      return this.mapAuCocToDto(coc, itemCount);
    });
  }

  async auCocById(id: number): Promise<RubberAuCocDto | null> {
    try {
      this.logger.debug(`Fetching AU CoC with id: ${id}`);
      const coc = await this.auCocRepository.findOne({
        where: { id },
        relations: ["customerCompany"],
      });
      if (!coc) return null;

      this.logger.debug(`Found AU CoC: ${coc.cocNumber}, fetching items...`);
      const items = await this.auCocItemRepository.find({
        where: { auCocId: id },
        relations: ["rollStock", "rollStock.compoundCoding"],
      });

      this.logger.debug(`Found ${items.length} items, mapping to DTO...`);
      const dto = this.mapAuCocToDto(coc, items.length);
      dto.items = items.map((item) => this.mapAuCocItemToDto(item));
      return dto;
    } catch (error) {
      this.logger.error(`Error fetching AU CoC ${id}:`, error);
      throw error;
    }
  }

  async createAuCoc(dto: CreateAuCocDto, createdBy?: string): Promise<RubberAuCocDto> {
    const customer = await this.companyRepository.findOne({
      where: { id: dto.customerCompanyId },
    });
    if (!customer) {
      throw new BadRequestException("Customer company not found");
    }

    const rolls = await this.rollStockRepository.find({
      where: { id: In(dto.rollIds) },
      relations: ["compoundCoding"],
    });

    if (rolls.length !== dto.rollIds.length) {
      throw new BadRequestException("Some roll IDs not found");
    }

    const unavailableRolls = rolls.filter(
      (r) => r.status !== RollStockStatus.IN_STOCK && r.status !== RollStockStatus.RESERVED,
    );
    if (unavailableRolls.length > 0) {
      throw new BadRequestException(
        `Rolls not available: ${unavailableRolls.map((r) => r.rollNumber).join(", ")}`,
      );
    }

    const cocNumber = await this.generateCocNumber();

    const auCoc = this.auCocRepository.create({
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
      this.auCocItemRepository.create({
        firebaseUid: `pg_${generateUniqueId()}`,
        auCocId: savedCoc.id,
        rollStockId: roll.id,
      }),
    );

    await this.auCocItemRepository.save(items);

    await this.rollStockRepository.update({ id: In(dto.rollIds) }, { auCocId: savedCoc.id });

    const result = await this.auCocRepository.findOne({
      where: { id: savedCoc.id },
      relations: ["customerCompany"],
    });

    const savedItems = await this.auCocItemRepository.find({
      where: { auCocId: savedCoc.id },
      relations: ["rollStock", "rollStock.compoundCoding"],
    });

    const cocDto = this.mapAuCocToDto(result!);
    cocDto.items = savedItems.map((item) => this.mapAuCocItemToDto(item));
    return cocDto;
  }

  async createAuCocFromDeliveryNote(
    deliveryNoteId: number,
    createdBy?: string,
  ): Promise<RubberAuCocDto> {
    const deliveryNote = await this.deliveryNoteRepository.findOne({
      where: { id: deliveryNoteId },
      relations: ["supplierCompany"],
    });

    if (!deliveryNote) {
      throw new BadRequestException("Delivery note not found");
    }

    if (!deliveryNote.supplierCompanyId) {
      throw new BadRequestException("Delivery note has no customer assigned");
    }

    const customer = await this.companyRepository.findOne({
      where: { id: deliveryNote.supplierCompanyId },
    });

    if (!customer) {
      throw new BadRequestException("Customer company not found");
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

    const auCoc = this.auCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocNumber,
      customerCompanyId: deliveryNote.supplierCompanyId,
      poNumber: deliveryNote.customerReference ?? null,
      deliveryNoteRef: deliveryNote.deliveryNoteNumber,
      sourceDeliveryNoteId: deliveryNoteId,
      extractedRollData: extractedRollData.length > 0 ? extractedRollData : null,
      status: AuCocStatus.DRAFT,
      createdBy: createdBy ?? null,
    });

    const savedCoc = await this.auCocRepository.save(auCoc);

    const result = await this.auCocRepository.findOne({
      where: { id: savedCoc.id },
      relations: ["customerCompany"],
    });

    this.logger.log(
      `Created AU CoC ${cocNumber} from delivery note ${deliveryNote.deliveryNoteNumber} with ${extractedRollData.length} rolls`,
    );

    return this.mapAuCocToDto(result!);
  }

  async generatePdf(id: number): Promise<{ buffer: Buffer; filename: string }> {
    try {
      this.logger.debug(`Generating PDF for AU CoC ${id}...`);
      const coc = await this.auCocRepository.findOne({
        where: { id },
        relations: ["customerCompany"],
      });
      if (!coc) {
        throw new BadRequestException("AU CoC not found");
      }

      this.logger.debug(`Found CoC ${coc.cocNumber}, fetching items...`);
      const items = await this.auCocItemRepository.find({
        where: { auCocId: id },
        relations: ["rollStock", "rollStock.compoundCoding"],
      });

      const hasExtractedRollData = coc.extractedRollData && coc.extractedRollData.length > 0;

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
      if (pdfData.batches.length === 0) {
        coc.readinessStatus = AuCocReadinessStatus.GENERATION_FAILED;
        coc.readinessDetails = {
          calendererCocId: coc.readinessDetails?.calendererCocId ?? null,
          compounderCocId: coc.readinessDetails?.compounderCocId ?? null,
          graphPdfPath: coc.readinessDetails?.graphPdfPath ?? null,
          calendererApproved: coc.readinessDetails?.calendererApproved ?? false,
          compounderApproved: coc.readinessDetails?.compounderApproved ?? false,
          missingDocuments: ["No batch test data found for lab analysis table"],
          lastCheckedAt: nowISO(),
        };
        await this.auCocRepository.save(coc);
        throw new BadRequestException(
          "Cannot generate PDF: no batch test data found for laboratory analysis table",
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

      this.logger.debug(`PDF created (${buffer.length} bytes), updating status...`);
      coc.status = AuCocStatus.GENERATED;
      coc.generatedPdfPath = `au-cocs/${filename}`;
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

      this.logger.log(`PDF generated and uploaded for AU CoC ${coc.cocNumber}`);
      return { buffer, filename };
    } catch (error) {
      this.logger.error(`Error generating PDF for AU CoC ${id}:`, error);
      throw error;
    }
  }

  async regenerateAllGeneratedCocs(): Promise<{
    regenerated: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    const cocs = await this.auCocRepository.find({
      where: [{ status: AuCocStatus.GENERATED }, { status: AuCocStatus.SENT }],
      order: { id: "ASC" },
    });

    const initial = { regenerated: 0, failed: 0, total: cocs.length, errors: [] as string[] };

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
    const coc = await this.auCocRepository.findOne({
      where: { id },
      relations: ["customerCompany"],
    });
    if (!coc) {
      throw new BadRequestException("AU CoC not found");
    }

    const items = await this.auCocItemRepository.find({
      where: { auCocId: id },
      relations: ["rollStock", "rollStock.compoundCoding"],
    });

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

  async sendToCustomer(id: number, dto: SendAuCocDto): Promise<RubberAuCocDto> {
    const coc = await this.auCocRepository.findOne({
      where: { id },
      relations: ["customerCompany"],
    });
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
    const generatedCocs = await this.auCocRepository.find({
      where: { status: AuCocStatus.GENERATED },
      relations: ["customerCompany"],
      order: { cocNumber: "ASC" },
    });

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
    await this.auCocRepository.save(generatedCocs);

    this.logger.log(
      `Bulk sent ${generatedCocs.length} AU CoCs to ${dto.email}: ${cocNumbers.join(", ")}`,
    );

    return { sent: generatedCocs.length, total: generatedCocs.length, cocNumbers };
  }

  async deleteAuCoc(id: number): Promise<boolean> {
    const coc = await this.auCocRepository.findOne({
      where: { id },
    });
    if (!coc) return false;

    if (coc.status === AuCocStatus.SENT) {
      throw new BadRequestException("Sent CoCs cannot be deleted");
    }

    await this.rollStockRepository.update({ auCocId: id }, { auCocId: null });

    await this.auCocItemRepository.delete({ auCocId: id });
    const result = await this.auCocRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  private async generateCocNumber(): Promise<string> {
    const result = await this.auCocRepository.query(
      `SELECT nextval('rubber_au_coc_number_seq') as seq`,
    );
    const seq = result[0]?.seq || 1;
    return `AU-COC-${String(seq).padStart(4, "0")}`;
  }

  private async preparePdfData(coc: RubberAuCoc, items: RubberAuCocItem[]): Promise<CocPdfData> {
    const firstRoll = items[0]?.rollStock;
    const compoundCoding = firstRoll?.compoundCoding;

    const allBatchIds = items.flatMap((item) => item.rollStock?.linkedBatchIds || []);
    const uniqueBatchIds = [...new Set(allBatchIds)];

    const batches =
      uniqueBatchIds.length > 0
        ? await this.compoundBatchRepository.find({
            where: { id: In(uniqueBatchIds) },
            relations: ["supplierCoc"],
            order: { batchNumber: "ASC" },
          })
        : [];

    const compoundCode = batches[0]?.supplierCoc?.compoundCode || compoundCoding?.code || "Unknown";

    const qualityConfig: RubberCompoundQualityConfig | null = compoundCode
      ? await this.qualityConfigRepository.findOne({
          where: { compoundCode },
        })
      : null;

    const rollDimensions = firstRoll
      ? `${firstRoll.thicknessMm ?? "-"}mm x ${firstRoll.widthMm ?? "-"}mm x ${firstRoll.lengthM ?? "-"}m`
      : "-";
    const rollSizesQty = `${rollDimensions} ${items.length} roll${items.length !== 1 ? "s" : ""}`;

    const rollNumber = firstRoll?.rollNumber || "-";

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
      rollNumber,
      qualityConfig,
    };
  }

  private async preparePdfDataFromExtractedRolls(coc: RubberAuCoc): Promise<CocPdfData> {
    const extractedRolls = coc.extractedRollData || [];
    const firstRoll = extractedRolls[0];

    const rollDimensions = firstRoll
      ? `${firstRoll.thicknessMm || "-"}mm x ${firstRoll.widthMm || "-"}mm x ${firstRoll.lengthM || "-"}m`
      : "-";
    const rollSizesQty = `${rollDimensions} ${extractedRolls.length} roll${extractedRolls.length !== 1 ? "s" : ""}`;
    const rollNumber = firstRoll?.rollNumber || "-";

    const defaults = {
      compoundCode: "Per Supplier CoC",
      compoundDescription: "Rubber Compound",
      productionDate: formatDateZA(now().toJSDate()),
      batchTestData: [] as BatchTestData[],
      qualityConfig: null as RubberCompoundQualityConfig | null,
      graphPdfPath: null as string | null,
    };

    const {
      compoundCode,
      compoundDescription,
      productionDate,
      batchTestData,
      qualityConfig,
      graphPdfPath,
    } = await (async () => {
      if (!coc.sourceDeliveryNoteId && extractedRolls.length === 0) {
        return defaults;
      }

      const sourceDeliveryNote: RubberDeliveryNote | null = coc.sourceDeliveryNoteId
        ? await this.deliveryNoteRepository.findOne({
            where: { id: coc.sourceDeliveryNoteId },
            relations: ["linkedCoc"],
          })
        : null;

      const supplierCocCandidates: RubberSupplierCoc[] = await (async () => {
        const candidates: RubberSupplierCoc[] = [];

        const fromDn = sourceDeliveryNote?.linkedCoc || null;
        if (fromDn) {
          candidates.push(fromDn);
        }

        if (sourceDeliveryNote) {
          const siblingDn = await this.deliveryNoteRepository
            .createQueryBuilder("dn")
            .leftJoinAndSelect("dn.linkedCoc", "coc")
            .where("dn.linked_coc_id IS NOT NULL")
            .andWhere("dn.id != :id", { id: sourceDeliveryNote.id })
            .andWhere("dn.supplier_company_id = :supplierId", {
              supplierId: sourceDeliveryNote.supplierCompanyId,
            })
            .andWhere("dn.customer_reference = :custRef", {
              custRef: sourceDeliveryNote.customerReference,
            })
            .orderBy("dn.created_at", "DESC")
            .getOne();

          if (siblingDn?.linkedCoc) {
            this.logger.log(
              `Found supplier CoC ${siblingDn.linkedCoc.id} via sibling DN ${siblingDn.id} for AU CoC ${coc.cocNumber}`,
            );
            candidates.push(siblingDn.linkedCoc);
          }
        }

        const allSupplierCocs = await this.supplierCocRepository
          .createQueryBuilder("coc")
          .where("coc.order_number IS NOT NULL")
          .orderBy("coc.id", "DESC")
          .getMany();

        if (extractedRolls.length > 0) {
          const rollNums = extractedRolls.map((r) => r.rollNumber).filter(Boolean) as string[];
          const orderNumbers = [
            ...new Set(rollNums.map((rn) => rn.split("-")[0]?.trim()).filter(Boolean)),
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

      const rejections = await this.rollRejectionRepository.find({
        where: deduplicatedCandidates.map((sc) => ({ originalSupplierCocId: sc.id })),
        select: ["originalSupplierCocId", "replacementSupplierCocId"],
      });
      const rejectedCocIds = new Set(rejections.map((r) => r.originalSupplierCocId));
      const replacementCocIds = rejections
        .filter((r) => r.replacementSupplierCocId !== null)
        .map((r) => r.replacementSupplierCocId as number);

      const replacementCocs =
        replacementCocIds.length > 0
          ? await this.supplierCocRepository.find({ where: { id: In(replacementCocIds) } })
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

      const supplierCoc: RubberSupplierCoc | null = await (async () => {
        if (uniqueCandidates.length === 0) return null;

        const candidateWithBatchData = await uniqueCandidates.reduce(
          async (bestPromise, candidate) => {
            const best = await bestPromise;
            if (best) return best;

            const hasBatches =
              (await this.compoundBatchRepository.count({
                where: { supplierCocId: candidate.id },
              })) > 0;
            if (hasBatches) return candidate;

            const extractedBatches = candidate.extractedData?.batches || [];
            if (extractedBatches.length > 0) return candidate;

            const compounder = await this.findCompounderForCandidate(candidate);
            if (compounder) {
              const compounderHasBatches =
                (await this.compoundBatchRepository.count({
                  where: { supplierCocId: compounder.id },
                })) > 0;
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
          `No candidates with batch data found for AU CoC ${coc.cocNumber} (${uniqueCandidates.length} candidates: ${uniqueCandidates.map((c) => `ID=${c.id} type=${c.cocType} order=${c.orderNumber}`).join(", ")}), using first candidate ${uniqueCandidates[0].id}`,
        );
        return uniqueCandidates[0];
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
          const linked = await this.supplierCocRepository.findOne({
            where: { id: linkedCompounderIds[0] },
          });
          if (linked) {
            this.logger.log(
              `Found linked compounder CoC ${linked.id} for calenderer ${supplierCoc.id}`,
            );
            return linked;
          }
        }

        if (supplierCoc.orderNumber) {
          const byOrder = await this.supplierCocRepository.findOne({
            where: {
              cocType: SupplierCocType.COMPOUNDER,
              orderNumber: supplierCoc.orderNumber,
            },
            order: { id: "DESC" },
          });
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

        const config = await this.qualityConfigRepository.findOne({
          where: { compoundCode: resolvedCompoundCode },
        });
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
      const batches = await this.compoundBatchRepository.find({
        where: { supplierCocId: batchSourceCocId },
        order: { batchNumber: "ASC" },
      });

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
      };
    })();

    return {
      coc,
      compoundCode,
      compoundDescription,
      productionDate,
      rollSizesQty,
      batches: batchTestData,
      rollNumber,
      qualityConfig,
      graphPdfPath,
    };
  }

  private async findCompounderForCandidate(
    candidate: RubberSupplierCoc,
  ): Promise<RubberSupplierCoc | null> {
    const linkedIds = candidate.extractedData?.linkedCompounderCocIds || [];
    if (linkedIds.length > 0) {
      const linked = await this.supplierCocRepository.findOne({
        where: { id: linkedIds[0] },
      });
      if (linked) return linked;
    }

    if (candidate.orderNumber) {
      const byOrder = await this.supplierCocRepository.findOne({
        where: {
          cocType: SupplierCocType.COMPOUNDER,
          orderNumber: candidate.orderNumber,
        },
        order: { id: "DESC" },
      });
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
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.drawHeader(doc);
      this.drawDetailsSection(doc, data);
      this.drawLabDataTable(doc, data);
      this.drawComments(doc);
      this.drawFooter(doc, data);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument): void {
    const headerPath = path.join(__dirname, "..", "..", "assets", "au-header.jpg");
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

  private drawDetailsSection(doc: PDFKit.PDFDocument, data: CocPdfData): void {
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

  private drawLabDataTable(doc: PDFKit.PDFDocument, data: CocPdfData): void {
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

    data.batches.forEach((batch, index) => {
      const isEven = index % 2 === 0;
      doc.rect(40, y, 515, 13).fillAndStroke(isEven ? "#ffffff" : "#f9f9f9", "#cccccc");
      doc.fillColor("black");

      const rowData = [
        index === 0 ? `Roll No. ${data.rollNumber}` : "",
        batch.batchNumber,
        batch.shoreA !== null ? String(Math.round(batch.shoreA)) : "",
        formatVal(batch.density, 3),
        formatVal(batch.rebound, 2),
        formatVal(batch.tearStrength, 2),
        formatVal(batch.tensile, 1),
        batch.elongation !== null ? String(Math.round(batch.elongation)) : "",
      ];

      rowData.forEach((val, i) => {
        doc.text(val, colStarts[i] + 2, y + 3, {
          width: colWidths[i] - 4,
          align: i === 0 ? "left" : "center",
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

  private drawComments(doc: PDFKit.PDFDocument): void {
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

  private drawFooter(doc: PDFKit.PDFDocument, data: CocPdfData): void {
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

    const footerPath = path.join(__dirname, "..", "..", "assets", "au-footer.jpg");
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
        "50 Paul Smit Street, Dunswart, Boksburg, 1458  Tel: 072 039 8429  www.auind.co.za",
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
    const deliveryNote = await this.deliveryNoteRepository.findOne({
      where: { id: deliveryNoteId },
    });

    if (!deliveryNote) {
      return { auCoc: null, matchedSupplierCocs: [], message: "Delivery note not found" };
    }

    const deliveryNoteItems = await this.deliveryNoteItemRepository.find({
      where: { deliveryNoteId },
    });

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

    const calendererCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .getMany();

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

    const customer = await this.companyRepository.findOne({
      where: { id: customerCompanyId },
    });

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

    const cocNumber = await this.generateCocNumber();

    const auCoc = this.auCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocNumber,
      customerCompanyId,
      poNumber: null,
      deliveryNoteRef: deliveryNote.deliveryNoteNumber,
      status: AuCocStatus.DRAFT,
      notes: `Auto-created from customer delivery note ${deliveryNote.deliveryNoteNumber}. Matched supplier COC(s): ${matchedCocs.map((c) => c.cocNumber || c.orderNumber).join(", ")}`,
      createdBy: createdBy ?? null,
      approvedByName: "Ron Govender",
    });

    const savedCoc = await this.auCocRepository.save(auCoc);

    const result = await this.auCocRepository.findOne({
      where: { id: savedCoc.id },
      relations: ["customerCompany"],
    });

    const auCocDto = this.mapAuCocToDto(result!);

    return {
      auCoc: auCocDto,
      matchedSupplierCocs: matchedCocs.map((c) => ({
        id: c.id,
        cocNumber: c.cocNumber,
        orderNumber: c.orderNumber,
      })),
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

    const supplierCoc = await this.supplierCocRepository.findOne({
      where: { id: supplierCocId },
    });

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
      const pngPages = await pdfToPng(pdfInput, {
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

  private createPdfFromImage(imageBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.image(imageBuffer, 20, 20, {
        fit: [800, 555],
        align: "center",
        valign: "center",
      });

      doc.end();
    });
  }
}
