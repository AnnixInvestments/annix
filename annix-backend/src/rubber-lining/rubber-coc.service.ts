import { BadRequestException, forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO, generateUniqueId, now } from "../lib/datetime";
import {
  CreateCompoundBatchDto,
  CreateSupplierCocDto,
  ReviewExtractionDto,
  RubberCompoundBatchDto,
  RubberSupplierCocDto,
  UpdateSupplierCocDto,
} from "./dto/rubber-coc.dto";
import {
  DOCUMENT_VERSION_STATUS_LABELS,
  DocumentVersionStatus,
} from "./entities/document-version.types";
import { RubberCocBatchCorrection } from "./entities/rubber-coc-batch-correction.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { BatchPassFailStatus, RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import {
  CocProcessingStatus,
  ExtractedCocData,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";
import { DEFAULT_SUPPLIER_NAMES } from "./rubber-lining.constants";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";

const COC_TYPE_LABELS: Record<SupplierCocType, string> = {
  [SupplierCocType.COMPOUNDER]: "Compounder",
  [SupplierCocType.CALENDARER]: "Calendarer",
  [SupplierCocType.CALENDER_ROLL]: "Calender Roll",
};

const PROCESSING_STATUS_LABELS: Record<CocProcessingStatus, string> = {
  [CocProcessingStatus.PENDING]: "Pending",
  [CocProcessingStatus.EXTRACTED]: "Extracted",
  [CocProcessingStatus.NEEDS_REVIEW]: "Needs Review",
  [CocProcessingStatus.APPROVED]: "Approved",
};

const BATCH_PASS_FAIL_LABELS: Record<BatchPassFailStatus, string> = {
  [BatchPassFailStatus.PASS]: "Pass",
  [BatchPassFailStatus.FAIL]: "Fail",
};

@Injectable()
export class RubberCocService {
  private readonly logger = new Logger(RubberCocService.name);

  constructor(
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberCompoundBatch)
    private compoundBatchRepository: Repository<RubberCompoundBatch>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberCompoundStock)
    private compoundStockRepository: Repository<RubberCompoundStock>,
    @InjectRepository(RubberCocBatchCorrection)
    private batchCorrectionRepository: Repository<RubberCocBatchCorrection>,
    @Inject(forwardRef(() => RubberQualityTrackingService))
    private qualityTrackingService: RubberQualityTrackingService,
    private auCocReadinessService: RubberAuCocReadinessService,
    private deliveryNoteService: RubberDeliveryNoteService,
    private versioningService: RubberDocumentVersioningService,
  ) {}

  private normalizeCocNumber(cocNumber: string): string {
    return cocNumber.trim().replace(/\s+/g, "").replace(/[–—]/g, "-");
  }

  async allSupplierCocs(filters?: {
    cocType?: SupplierCocType;
    processingStatus?: CocProcessingStatus;
    supplierCompanyId?: number;
    includeAllVersions?: boolean;
  }): Promise<RubberSupplierCocDto[]> {
    const query = this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .orderBy("coc.created_at", "DESC");

    if (!filters?.includeAllVersions) {
      query.andWhere("coc.version_status = :versionStatus", {
        versionStatus: DocumentVersionStatus.ACTIVE,
      });
    }

    if (filters?.cocType) {
      query.andWhere("coc.coc_type = :cocType", { cocType: filters.cocType });
    }
    if (filters?.processingStatus) {
      query.andWhere("coc.processing_status = :status", { status: filters.processingStatus });
    }
    if (filters?.supplierCompanyId) {
      query.andWhere("coc.supplier_company_id = :companyId", {
        companyId: filters.supplierCompanyId,
      });
    }

    const cocs = await query.getMany();
    return cocs.map((coc) => this.mapSupplierCocToDto(coc));
  }

  async supplierCocById(id: number): Promise<RubberSupplierCocDto | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    return coc ? this.mapSupplierCocToDto(coc) : null;
  }

  async createSupplierCoc(
    dto: CreateSupplierCocDto,
    createdBy?: string,
  ): Promise<RubberSupplierCocDto> {
    const supplierCompanyId = await (async () => {
      if (!dto.supplierCompanyId) {
        const company = await this.resolveOrCreateSupplierForType(dto.cocType);
        return company.id;
      } else {
        const company = await this.companyRepository.findOne({
          where: { id: dto.supplierCompanyId },
        });
        if (!company) {
          throw new BadRequestException("Supplier company not found");
        }
        return dto.supplierCompanyId;
      }
    })();

    const coc = this.supplierCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocType: dto.cocType,
      supplierCompanyId,
      documentPath: dto.documentPath,
      graphPdfPath: dto.graphPdfPath ?? null,
      cocNumber: dto.cocNumber ?? null,
      productionDate: dto.productionDate ? fromISO(dto.productionDate).toJSDate() : null,
      compoundCode: dto.compoundCode ?? null,
      orderNumber: dto.orderNumber ?? null,
      ticketNumber: dto.ticketNumber ?? null,
      processingStatus: CocProcessingStatus.PENDING,
      createdBy: createdBy ?? null,
    });

    const saved = await this.supplierCocRepository.save(coc);
    const result = await this.supplierCocRepository.findOne({
      where: { id: saved.id },
      relations: ["supplierCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve created supplier CoC");
    }
    return this.mapSupplierCocToDto(result);
  }

  async updateSupplierCoc(
    id: number,
    dto: UpdateSupplierCocDto,
  ): Promise<RubberSupplierCocDto | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    if (!coc) return null;

    if (dto.graphPdfPath !== undefined) coc.graphPdfPath = dto.graphPdfPath;
    if (dto.cocNumber !== undefined) coc.cocNumber = dto.cocNumber;
    if (dto.productionDate !== undefined) {
      coc.productionDate = dto.productionDate ? fromISO(dto.productionDate).toJSDate() : null;
    }
    if (dto.compoundCode !== undefined) coc.compoundCode = dto.compoundCode;
    if (dto.orderNumber !== undefined) coc.orderNumber = dto.orderNumber;
    if (dto.ticketNumber !== undefined) coc.ticketNumber = dto.ticketNumber;
    if (dto.processingStatus !== undefined) coc.processingStatus = dto.processingStatus;
    if (dto.cocType !== undefined) coc.cocType = dto.cocType;

    await this.supplierCocRepository.save(coc);
    return this.mapSupplierCocToDto(coc);
  }

  async setExtractedData(
    id: number,
    extractedData: ExtractedCocData,
  ): Promise<RubberSupplierCocDto | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    if (!coc) return null;

    coc.extractedData = extractedData;
    coc.processingStatus = CocProcessingStatus.EXTRACTED;

    if (extractedData.cocNumber) coc.cocNumber = extractedData.cocNumber;
    if (extractedData.productionDate)
      coc.productionDate = fromISO(extractedData.productionDate).toJSDate();
    if (extractedData.compoundCode) coc.compoundCode = extractedData.compoundCode;
    if (extractedData.orderNumber) coc.orderNumber = extractedData.orderNumber;
    if (extractedData.ticketNumber) coc.ticketNumber = extractedData.ticketNumber;

    await this.supplierCocRepository.save(coc);

    if (coc.cocType === SupplierCocType.CALENDARER) {
      this.autoLinkCalendererToCompounder(coc);
    }

    if (coc.cocType === SupplierCocType.CALENDER_ROLL) {
      this.autoLinkCalenderRollToCalenderer(coc);
    }

    this.triggerAutoLinkDnsForCoc(coc);

    return this.mapSupplierCocToDto(coc);
  }

  async reviewExtraction(
    id: number,
    dto: ReviewExtractionDto,
  ): Promise<RubberSupplierCocDto | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    if (!coc) return null;

    if (dto.extractedData) {
      coc.extractedData = dto.extractedData;
      if (dto.extractedData.cocNumber) coc.cocNumber = dto.extractedData.cocNumber;
      if (dto.extractedData.productionDate) {
        coc.productionDate = fromISO(dto.extractedData.productionDate).toJSDate();
      }
      if (dto.extractedData.compoundCode) coc.compoundCode = dto.extractedData.compoundCode;
      if (dto.extractedData.orderNumber) coc.orderNumber = dto.extractedData.orderNumber;
      if (dto.extractedData.ticketNumber) coc.ticketNumber = dto.extractedData.ticketNumber;
    }
    if (dto.processingStatus) {
      coc.processingStatus = dto.processingStatus;
    }

    await this.supplierCocRepository.save(coc);
    return this.mapSupplierCocToDto(coc);
  }

  async approveCoc(id: number, approvedBy?: string): Promise<RubberSupplierCocDto | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    if (!coc) return null;

    if (coc.versionStatus === DocumentVersionStatus.PENDING_AUTHORIZATION) {
      throw new BadRequestException(
        "This document version is awaiting authorization and cannot be approved",
      );
    }

    coc.processingStatus = CocProcessingStatus.APPROVED;
    coc.approvedAt = now().toJSDate();
    coc.approvedBy = approvedBy ?? null;
    await this.supplierCocRepository.save(coc);

    if (coc.extractedData?.batches) {
      await this.createBatchesFromExtractedData(coc);
    }

    if (coc.cocType === SupplierCocType.COMPOUNDER && coc.compoundCode) {
      await this.saveSpecificationsFromExtractedData(coc);
      this.triggerQualityCheck(coc.compoundCode);
    }

    this.autoLinkAndCheckReadiness(coc);

    return this.mapSupplierCocToDto(coc);
  }

  async reextractAndUpdateCoc(
    id: number,
    extractedData: ExtractedCocData,
  ): Promise<RubberSupplierCocDto | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id },
      relations: ["supplierCompany"],
    });
    if (!coc) return null;

    await this.compoundBatchRepository.delete({ supplierCocId: id });
    this.logger.log(`Deleted existing batches for CoC ${id} before re-extraction`);

    const merged = this.mergeExtractedData(coc.extractedData, extractedData);
    merged.batches = extractedData.batches;
    coc.extractedData = merged;
    coc.processingStatus = CocProcessingStatus.EXTRACTED;

    if (merged.cocNumber) coc.cocNumber = merged.cocNumber;
    if (merged.productionDate) coc.productionDate = fromISO(merged.productionDate).toJSDate();
    if (merged.compoundCode) coc.compoundCode = merged.compoundCode;
    if (merged.orderNumber) coc.orderNumber = merged.orderNumber;
    if (merged.ticketNumber) coc.ticketNumber = merged.ticketNumber;

    await this.supplierCocRepository.save(coc);

    if (merged.batches && merged.batches.length > 0) {
      await this.createBatchesFromExtractedData(coc);
      this.logger.log(
        `Created ${merged.batches.length} batches from merged re-extracted data for CoC ${id}`,
      );
    }

    if (coc.cocType === SupplierCocType.COMPOUNDER && coc.compoundCode) {
      await this.saveSpecificationsFromExtractedData(coc);
    }

    return this.mapSupplierCocToDto(coc);
  }

  private mergeExtractedData(
    existing: ExtractedCocData | null,
    fresh: ExtractedCocData,
  ): ExtractedCocData {
    if (!existing) return fresh;

    const topLevelKeys: Array<keyof ExtractedCocData> = [
      "cocNumber",
      "productionDate",
      "customerName",
      "compoundCode",
      "compoundDescription",
      "orderNumber",
      "ticketNumber",
      "hasGraph",
      "deliveryNoteNumber",
      "waybillNumber",
      "sharedDensity",
      "sharedTensile",
      "sharedElongation",
      "shoreANominal",
      "shoreALimits",
    ];

    const merged: ExtractedCocData = { ...fresh };
    topLevelKeys.forEach((key) => {
      const existingVal = existing[key];
      const freshVal = fresh[key];
      if (existingVal != null && (freshVal == null || freshVal === "")) {
        (merged as Record<string, unknown>)[key] = existingVal;
      }
    });

    if (existing.approverNames?.length && !fresh.approverNames?.length) {
      merged.approverNames = existing.approverNames;
    }
    if (existing.batchNumbers?.length && !fresh.batchNumbers?.length) {
      merged.batchNumbers = existing.batchNumbers;
    }
    if (existing.rollNumbers?.length && !fresh.rollNumbers?.length) {
      merged.rollNumbers = existing.rollNumbers;
    }

    if (existing.specifications || fresh.specifications) {
      const existSpec = existing.specifications || {};
      const freshSpec = fresh.specifications || {};
      const mergedSpec = { ...freshSpec };
      Object.entries(existSpec).forEach(([key, val]) => {
        if (
          val != null &&
          ((mergedSpec as Record<string, unknown>)[key] == null ||
            (mergedSpec as Record<string, unknown>)[key] === "")
        ) {
          (mergedSpec as Record<string, unknown>)[key] = val;
        }
      });
      merged.specifications = mergedSpec;
    }

    if (existing.batches?.length && fresh.batches?.length) {
      const batchFields = [
        "shoreA",
        "specificGravity",
        "reboundPercent",
        "tearStrengthKnM",
        "tensileStrengthMpa",
        "elongationPercent",
        "rheometerSMin",
        "rheometerSMax",
        "rheometerTs2",
        "rheometerTc90",
        "passFailStatus",
      ] as const;

      const existingByBatch = new Map(existing.batches.map((b) => [b.batchNumber, b]));

      merged.batches = fresh.batches.map((freshBatch) => {
        const existingBatch = existingByBatch.get(freshBatch.batchNumber);
        if (!existingBatch) return freshBatch;

        const mergedBatch = { ...freshBatch };
        batchFields.forEach((field) => {
          const existingVal = existingBatch[field];
          const freshVal = freshBatch[field];
          if (existingVal != null && freshVal == null) {
            (mergedBatch as Record<string, unknown>)[field] = existingVal;
          }
        });
        return mergedBatch;
      });

      existing.batches.forEach((existingBatch) => {
        const alreadyInFresh = fresh.batches!.some(
          (fb) => fb.batchNumber === existingBatch.batchNumber,
        );
        if (!alreadyInFresh) {
          merged.batches!.push(existingBatch);
        }
      });
    } else if (existing.batches?.length && !fresh.batches?.length) {
      merged.batches = existing.batches;
    }

    if (existing.rolls?.length && fresh.rolls?.length) {
      const existingByRoll = new Map(existing.rolls.map((r) => [r.rollNumber, r]));
      merged.rolls = fresh.rolls.map((freshRoll) => {
        const existingRoll = existingByRoll.get(freshRoll.rollNumber);
        if (!existingRoll) return freshRoll;
        return {
          ...freshRoll,
          shoreA: freshRoll.shoreA ?? existingRoll.shoreA,
        };
      });
    } else if (existing.rolls?.length && !fresh.rolls?.length) {
      merged.rolls = existing.rolls;
    }

    return merged;
  }

  private async saveSpecificationsFromExtractedData(coc: RubberSupplierCoc): Promise<void> {
    const specs = coc.extractedData?.specifications;
    if (!specs || !coc.compoundCode) return;

    const hasAnySpec = Object.values(specs).some((v) => v !== null && v !== undefined);
    if (!hasAnySpec) return;

    try {
      await this.qualityTrackingService.updateConfig(
        coc.compoundCode,
        {
          compoundDescription: coc.extractedData?.compoundDescription ?? undefined,
          shoreANominal: specs.shoreANominal ?? undefined,
          shoreAMin: specs.shoreAMin ?? undefined,
          shoreAMax: specs.shoreAMax ?? undefined,
          densityNominal: specs.specificGravityNominal ?? undefined,
          densityMin: specs.specificGravityMin ?? undefined,
          densityMax: specs.specificGravityMax ?? undefined,
          reboundNominal: specs.reboundNominal ?? undefined,
          reboundMin: specs.reboundMin ?? undefined,
          reboundMax: specs.reboundMax ?? undefined,
          tearStrengthNominal: specs.tearStrengthNominal ?? undefined,
          tearStrengthMin: specs.tearStrengthMin ?? undefined,
          tearStrengthMax: specs.tearStrengthMax ?? undefined,
          tensileNominal: specs.tensileNominal ?? undefined,
          tensileMin: specs.tensileMin ?? undefined,
          tensileMax: specs.tensileMax ?? undefined,
          elongationNominal: specs.elongationNominal ?? undefined,
          elongationMin: specs.elongationMin ?? undefined,
          elongationMax: specs.elongationMax ?? undefined,
        },
        "NIX",
      );
      this.logger.log(`Saved specifications for compound ${coc.compoundCode} from CoC #${coc.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to save specifications for compound ${coc.compoundCode}: ${error.message}`,
      );
    }
  }

  private triggerQualityCheck(compoundCode: string): void {
    this.qualityTrackingService
      .checkCompoundQuality(compoundCode)
      .then((result) => {
        if (result.alertsCreated > 0) {
          this.logger.log(
            `Quality check for ${compoundCode}: ${result.alertsCreated} alert(s) created`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(`Quality check failed for ${compoundCode}:`, error);
      });
  }

  private autoLinkAndCheckReadiness(coc: RubberSupplierCoc): void {
    this.deliveryNoteService
      .autoLinkUnlinkedDnsToSupplierCoc(coc.id)
      .then((linkedDnIds) => {
        if (linkedDnIds.length > 0) {
          this.logger.log(
            `Auto-linked ${linkedDnIds.length} supplier DN(s) to approved CoC ${coc.id}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(`Auto-link DNs to CoC ${coc.id} failed: ${error.message}`);
      });

    this.triggerReadinessCheckForApprovedCoc(coc);
  }

  private triggerReadinessCheckForApprovedCoc(coc: RubberSupplierCoc): void {
    const orderNumber = coc.orderNumber || coc.extractedData?.orderNumber || null;

    if (!orderNumber) return;

    this.auCocReadinessService
      .findPendingAuCocsByOrderNumber(orderNumber)
      .then((pendingAuCocs) =>
        Promise.all(
          pendingAuCocs.map((auCoc) => this.auCocReadinessService.autoGenerateIfReady(auCoc.id)),
        ),
      )
      .catch((error) => {
        this.logger.error(`Readiness check after CoC ${coc.id} approval failed: ${error.message}`);
      });
  }

  private triggerAutoLinkDnsForCoc(coc: RubberSupplierCoc): void {
    this.deliveryNoteService
      .autoLinkUnlinkedDnsToSupplierCoc(coc.id)
      .then((linkedDnIds) => {
        if (linkedDnIds.length > 0) {
          this.logger.log(
            `Auto-linked ${linkedDnIds.length} supplier DN(s) to CoC ${coc.id} after extraction`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(`Auto-link DNs to CoC ${coc.id} failed: ${error.message}`);
      });
  }

  private triggerReadinessCheckForLinkedCalenderer(calendererCoc: RubberSupplierCoc): void {
    const orderNumber =
      calendererCoc.orderNumber || calendererCoc.extractedData?.orderNumber || null;

    if (!orderNumber) return;

    this.auCocReadinessService
      .findPendingAuCocsByOrderNumber(orderNumber)
      .then((pendingAuCocs) =>
        Promise.all(
          pendingAuCocs.map((auCoc) => this.auCocReadinessService.autoGenerateIfReady(auCoc.id)),
        ),
      )
      .catch((error) => {
        this.logger.error(
          `Readiness check after calenderer ${calendererCoc.id} linking failed: ${error.message}`,
        );
      });
  }

  async deleteSupplierCoc(id: number): Promise<boolean> {
    const result = await this.supplierCocRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async upsertByCocNumber(
    cocNumber: string,
    cocType: SupplierCocType,
    supplierCompanyId: number,
    documentPath: string,
    extractedData: ExtractedCocData,
    createdBy?: string,
  ): Promise<{ coc: RubberSupplierCocDto; wasUpdated: boolean; requiresAuthorization: boolean }> {
    const normalizedCocNumber = this.normalizeCocNumber(cocNumber);

    const existingActive = await this.versioningService.existingActiveSupplierCoc(
      normalizedCocNumber,
      cocType,
    );

    const isDuplicate = existingActive !== null;

    const newCoc = this.supplierCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocType,
      supplierCompanyId,
      documentPath,
      cocNumber: normalizedCocNumber,
      extractedData,
      processingStatus: CocProcessingStatus.EXTRACTED,
      productionDate: extractedData.productionDate
        ? fromISO(extractedData.productionDate).toJSDate()
        : null,
      compoundCode: extractedData.compoundCode ?? null,
      orderNumber: extractedData.orderNumber ?? null,
      ticketNumber: extractedData.ticketNumber ?? null,
      createdBy: createdBy ?? null,
      version: isDuplicate ? existingActive.version + 1 : 1,
      previousVersionId: isDuplicate ? existingActive.id : null,
      versionStatus: isDuplicate
        ? DocumentVersionStatus.PENDING_AUTHORIZATION
        : DocumentVersionStatus.ACTIVE,
    });

    if (isDuplicate) {
      this.logger.log(
        `Duplicate CoC detected: ${normalizedCocNumber} (${cocType}) - creating v${newCoc.version} pending authorization (previous: #${existingActive.id})`,
      );
    }

    const saved = await this.supplierCocRepository.save(newCoc);
    const result = await this.supplierCocRepository.findOne({
      where: { id: saved.id },
      relations: ["supplierCompany"],
    });

    if (!result) {
      throw new BadRequestException("Failed to retrieve created supplier CoC");
    }

    if (!isDuplicate) {
      this.triggerAutoLinkDnsForCoc(result);
    }

    return {
      coc: this.mapSupplierCocToDto(result),
      wasUpdated: isDuplicate,
      requiresAuthorization: isDuplicate,
    };
  }

  async clearAllSupplierCocs(): Promise<{ deletedBatches: number; deletedCocs: number }> {
    const batchResult = await this.compoundBatchRepository
      .createQueryBuilder()
      .delete()
      .where("supplier_coc_id IS NOT NULL")
      .execute();

    const cocResult = await this.supplierCocRepository.createQueryBuilder().delete().execute();

    await this.supplierCocRepository.query(
      "ALTER SEQUENCE rubber_supplier_cocs_id_seq RESTART WITH 1",
    );

    return {
      deletedBatches: batchResult.affected || 0,
      deletedCocs: cocResult.affected || 0,
    };
  }

  async batchesByCocId(supplierCocId: number): Promise<RubberCompoundBatchDto[]> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id: supplierCocId },
    });

    if (!coc) {
      return [];
    }

    if (coc.cocType === SupplierCocType.CALENDARER) {
      const batchNumbers = coc.extractedData?.batchNumbers || [];
      if (batchNumbers.length === 0) {
        return [];
      }

      const qb = this.compoundBatchRepository
        .createQueryBuilder("batch")
        .leftJoinAndSelect("batch.supplierCoc", "supplierCoc")
        .leftJoinAndSelect("batch.compoundStock", "compoundStock")
        .leftJoinAndSelect("compoundStock.compoundCoding", "compoundCoding")
        .where("batch.batchNumber IN (:...batchNumbers)", { batchNumbers });

      if (coc.compoundCode) {
        qb.andWhere("compoundCoding.code = :compoundCode", {
          compoundCode: coc.compoundCode,
        });
      }

      qb.orderBy(
        "CASE WHEN batch.batch_number ~ '^[0-9]+$' THEN CAST(batch.batch_number AS INTEGER) ELSE 0 END",
        "ASC",
      ).addOrderBy("batch.batchNumber", "ASC");

      const batches = await qb.getMany();
      return batches.map((batch) => this.mapCompoundBatchToDto(batch));
    }

    const batches = await this.compoundBatchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.supplierCoc", "supplierCoc")
      .leftJoinAndSelect("batch.compoundStock", "compoundStock")
      .leftJoinAndSelect("compoundStock.compoundCoding", "compoundCoding")
      .where("batch.supplier_coc_id = :supplierCocId", { supplierCocId })
      .orderBy(
        "CASE WHEN batch.batch_number ~ '^[0-9]+$' THEN CAST(batch.batch_number AS INTEGER) ELSE 0 END",
        "ASC",
      )
      .addOrderBy("batch.batchNumber", "ASC")
      .getMany();
    return batches.map((batch) => this.mapCompoundBatchToDto(batch));
  }

  async createCompoundBatch(dto: CreateCompoundBatchDto): Promise<RubberCompoundBatchDto> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id: dto.supplierCocId },
    });
    if (!coc) {
      throw new BadRequestException("Supplier CoC not found");
    }

    if (dto.compoundStockId) {
      const stock = await this.compoundStockRepository.findOne({
        where: { id: dto.compoundStockId },
      });
      if (!stock) {
        throw new BadRequestException("Compound stock not found");
      }
    }

    const batch = this.compoundBatchRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      supplierCocId: dto.supplierCocId,
      batchNumber: dto.batchNumber,
      compoundStockId: dto.compoundStockId ?? null,
      shoreAHardness: dto.shoreAHardness ?? null,
      specificGravity: dto.specificGravity ?? null,
      reboundPercent: dto.reboundPercent ?? null,
      tearStrengthKnM: dto.tearStrengthKnM ?? null,
      tensileStrengthMpa: dto.tensileStrengthMpa ?? null,
      elongationPercent: dto.elongationPercent ?? null,
      rheometerSMin: dto.rheometerSMin ?? null,
      rheometerSMax: dto.rheometerSMax ?? null,
      rheometerTs2: dto.rheometerTs2 ?? null,
      rheometerTc90: dto.rheometerTc90 ?? null,
      passFailStatus: dto.passFailStatus ?? null,
    });

    const saved = await this.compoundBatchRepository.save(batch);
    const result = await this.compoundBatchRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve created compound batch");
    }
    return this.mapCompoundBatchToDto(result);
  }

  async updateCompoundBatch(
    id: number,
    dto: import("./dto/rubber-coc.dto").UpdateCompoundBatchDto,
  ): Promise<RubberCompoundBatchDto> {
    const batch = await this.compoundBatchRepository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    if (!batch) {
      throw new BadRequestException("Compound batch not found");
    }

    const numericFields: Array<{
      field: string;
      dtoKey: keyof import("./dto/rubber-coc.dto").UpdateCompoundBatchDto;
    }> = [
      { field: "shoreAHardness", dtoKey: "shoreAHardness" },
      { field: "specificGravity", dtoKey: "specificGravity" },
      { field: "reboundPercent", dtoKey: "reboundPercent" },
      { field: "tearStrengthKnM", dtoKey: "tearStrengthKnM" },
      { field: "tensileStrengthMpa", dtoKey: "tensileStrengthMpa" },
      { field: "elongationPercent", dtoKey: "elongationPercent" },
      { field: "rheometerSMin", dtoKey: "rheometerSMin" },
      { field: "rheometerSMax", dtoKey: "rheometerSMax" },
      { field: "rheometerTs2", dtoKey: "rheometerTs2" },
      { field: "rheometerTc90", dtoKey: "rheometerTc90" },
    ];

    const corrections: Array<{
      fieldName: string;
      originalValue: string | null;
      correctedValue: string;
    }> = [];

    if (dto.batchNumber !== undefined && dto.batchNumber !== batch.batchNumber) {
      corrections.push({
        fieldName: "batchNumber",
        originalValue: batch.batchNumber,
        correctedValue: dto.batchNumber,
      });
    }

    numericFields.forEach(({ field, dtoKey }) => {
      const newVal = dto[dtoKey];
      if (newVal !== undefined) {
        const oldVal = (batch as unknown as Record<string, unknown>)[field] as number | null;
        if (String(oldVal ?? "") !== String(newVal ?? "")) {
          corrections.push({
            fieldName: field,
            originalValue: oldVal !== null && oldVal !== undefined ? String(oldVal) : null,
            correctedValue: newVal !== null && newVal !== undefined ? String(newVal) : "",
          });
        }
      }
    });

    if (dto.batchNumber !== undefined) batch.batchNumber = dto.batchNumber;
    if (dto.shoreAHardness !== undefined) batch.shoreAHardness = dto.shoreAHardness;
    if (dto.specificGravity !== undefined) batch.specificGravity = dto.specificGravity;
    if (dto.reboundPercent !== undefined) batch.reboundPercent = dto.reboundPercent;
    if (dto.tearStrengthKnM !== undefined) batch.tearStrengthKnM = dto.tearStrengthKnM;
    if (dto.tensileStrengthMpa !== undefined) batch.tensileStrengthMpa = dto.tensileStrengthMpa;
    if (dto.elongationPercent !== undefined) batch.elongationPercent = dto.elongationPercent;
    if (dto.rheometerSMin !== undefined) batch.rheometerSMin = dto.rheometerSMin;
    if (dto.rheometerSMax !== undefined) batch.rheometerSMax = dto.rheometerSMax;
    if (dto.rheometerTs2 !== undefined) batch.rheometerTs2 = dto.rheometerTs2;
    if (dto.rheometerTc90 !== undefined) batch.rheometerTc90 = dto.rheometerTc90;
    if (dto.passFailStatus !== undefined) batch.passFailStatus = dto.passFailStatus;

    await this.compoundBatchRepository.save(batch);

    if (corrections.length > 0) {
      this.saveBatchCorrections(batch, corrections);
    }

    return this.mapCompoundBatchToDto(batch);
  }

  private saveBatchCorrections(
    batch: RubberCompoundBatch,
    corrections: Array<{ fieldName: string; originalValue: string | null; correctedValue: string }>,
  ): void {
    this.supplierCocRepository
      .findOne({
        where: { id: batch.supplierCocId },
        relations: ["supplierCompany"],
      })
      .then((coc) => {
        const supplierName = coc?.supplierCompany?.name ?? null;
        const compoundCode = coc?.compoundCode ?? null;

        const entities = corrections.map((c) =>
          this.batchCorrectionRepository.create({
            supplierCocId: batch.supplierCocId,
            compoundBatchId: batch.id,
            supplierName,
            compoundCode,
            batchNumber: batch.batchNumber,
            fieldName: c.fieldName,
            originalValue: c.originalValue,
            correctedValue: c.correctedValue,
          }),
        );

        return this.batchCorrectionRepository.save(entities);
      })
      .then((saved) => {
        this.logger.log(
          `Saved ${saved.length} batch correction(s) for batch ${batch.batchNumber} on CoC ${batch.supplierCocId}`,
        );
      })
      .catch((err) => {
        this.logger.error(`Failed to save batch corrections: ${err.message}`);
      });
  }

  async correctionHintsForSupplier(
    supplierName: string | null,
    compoundCode: string | null,
  ): Promise<string | null> {
    const query = this.batchCorrectionRepository
      .createQueryBuilder("c")
      .orderBy("c.created_at", "DESC")
      .take(30);

    if (supplierName) {
      query.andWhere("c.supplier_name = :supplierName", { supplierName });
    }
    if (compoundCode) {
      query.andWhere("c.compound_code = :compoundCode", { compoundCode });
    }

    const corrections = await query.getMany();
    if (corrections.length === 0) return null;

    const hints = corrections.map(
      (c) =>
        `- Batch ${c.batchNumber}, field "${c.fieldName}": AI extracted "${c.originalValue ?? "empty"}" but correct value is "${c.correctedValue}"`,
    );

    return [
      "PREVIOUS USER CORRECTIONS FOR THIS SUPPLIER (learn from these patterns):",
      ...hints,
      "",
      "Apply these correction patterns when extracting batch data. Pay special attention to column alignment and values that were previously misread.",
    ].join("\n");
  }

  async correctionHintsForCoc(cocId: number): Promise<string | null> {
    const coc = await this.supplierCocRepository.findOne({
      where: { id: cocId },
      relations: ["supplierCompany"],
    });
    if (!coc) return null;

    return this.correctionHintsForSupplier(
      coc.supplierCompany?.name ?? null,
      coc.compoundCode ?? null,
    );
  }

  async deleteCompoundBatch(id: number): Promise<void> {
    const batch = await this.compoundBatchRepository.findOne({ where: { id } });
    if (!batch) {
      throw new BadRequestException("Compound batch not found");
    }
    await this.compoundBatchRepository.remove(batch);
  }

  async batchById(id: number): Promise<RubberCompoundBatchDto | null> {
    const batch = await this.compoundBatchRepository.findOne({
      where: { id },
      relations: ["compoundStock", "compoundStock.compoundCoding"],
    });
    return batch ? this.mapCompoundBatchToDto(batch) : null;
  }

  async batchesByBatchNumber(batchNumber: string): Promise<RubberCompoundBatchDto[]> {
    const batches = await this.compoundBatchRepository.find({
      where: { batchNumber },
      relations: ["supplierCoc", "compoundStock", "compoundStock.compoundCoding"],
      order: { createdAt: "DESC" },
    });
    return batches.map((batch) => this.mapCompoundBatchToDto(batch));
  }

  private async resolveOrCreateSupplierForType(cocType: SupplierCocType): Promise<RubberCompany> {
    const supplierName = DEFAULT_SUPPLIER_NAMES[cocType];

    const existing = await this.companyRepository
      .createQueryBuilder("company")
      .where("LOWER(company.name) LIKE LOWER(:name)", { name: `%${supplierName}%` })
      .getOne();

    if (existing) {
      return existing;
    }

    const company = this.companyRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      name: supplierName,
    });
    await this.companyRepository.save(company);
    return company;
  }

  private async createBatchesFromExtractedData(coc: RubberSupplierCoc): Promise<void> {
    const extractedBatches = coc.extractedData?.batches || [];

    const batchesToCreate = extractedBatches.map((batchData) =>
      this.compoundBatchRepository.create({
        firebaseUid: `pg_${generateUniqueId()}`,
        supplierCocId: coc.id,
        batchNumber: batchData.batchNumber,
        shoreAHardness: batchData.shoreA ?? null,
        specificGravity: batchData.specificGravity ?? null,
        reboundPercent: batchData.reboundPercent ?? null,
        tearStrengthKnM: batchData.tearStrengthKnM ?? null,
        tensileStrengthMpa: batchData.tensileStrengthMpa ?? null,
        elongationPercent: batchData.elongationPercent ?? null,
        rheometerSMin: batchData.rheometerSMin ?? null,
        rheometerSMax: batchData.rheometerSMax ?? null,
        rheometerTs2: batchData.rheometerTs2 ?? null,
        rheometerTc90: batchData.rheometerTc90 ?? null,
        passFailStatus:
          batchData.passFailStatus === "PASS"
            ? BatchPassFailStatus.PASS
            : batchData.passFailStatus === "FAIL"
              ? BatchPassFailStatus.FAIL
              : null,
      }),
    );

    await this.compoundBatchRepository.save(batchesToCreate);
  }

  async mergeIfDuplicateCocNumber(
    cocId: number,
    cocNumber: string,
    cocType: SupplierCocType,
  ): Promise<{
    merged: boolean;
    keptCocId: number;
    deletedCocId: number | null;
    requiresAuthorization: boolean;
  }> {
    const normalizedCocNumber = this.normalizeCocNumber(cocNumber);

    const existingActive = await this.versioningService.existingActiveSupplierCoc(
      normalizedCocNumber,
      cocType,
    );

    if (!existingActive || existingActive.id === cocId) {
      return { merged: false, keptCocId: cocId, deletedCocId: null, requiresAuthorization: false };
    }

    this.logger.log(
      `Duplicate detected during post-extraction: CoC ${cocId} has same cocNumber ${normalizedCocNumber} as CoC ${existingActive.id} - creating version`,
    );

    const newCoc = await this.supplierCocRepository.findOne({ where: { id: cocId } });
    if (newCoc) {
      newCoc.version = existingActive.version + 1;
      newCoc.previousVersionId = existingActive.id;
      newCoc.versionStatus = DocumentVersionStatus.PENDING_AUTHORIZATION;
      await this.supplierCocRepository.save(newCoc);
    }

    return { merged: true, keptCocId: cocId, deletedCocId: null, requiresAuthorization: true };
  }

  async linkCalendererToCompounderCocs(
    calendererCocId: number,
  ): Promise<{ linkedCocIds: number[]; linkedBatches: string[] }> {
    const calendererCoc = await this.supplierCocRepository.findOne({
      where: { id: calendererCocId },
    });

    if (!calendererCoc || calendererCoc.cocType !== SupplierCocType.CALENDARER) {
      return { linkedCocIds: [], linkedBatches: [] };
    }

    const batchNumbers = calendererCoc.extractedData?.batchNumbers || [];
    if (batchNumbers.length === 0) {
      return { linkedCocIds: [], linkedBatches: [] };
    }

    const compounderCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .getMany();

    const matches = compounderCocs.reduce(
      (acc, compCoc) => {
        const compBatches = compCoc.extractedData?.batchNumbers || [];
        const compBatchesFromData = compCoc.extractedData?.batches?.map((b) => b.batchNumber) || [];
        const allCompBatches = [...new Set([...compBatches, ...compBatchesFromData])];

        const matchingBatches = batchNumbers.filter((bn) =>
          allCompBatches.some((cb) => cb.toLowerCase().trim() === bn.toLowerCase().trim()),
        );

        if (matchingBatches.length > 0) {
          return {
            cocIds: [...acc.cocIds, compCoc.id],
            batches: [...acc.batches, ...matchingBatches],
          };
        }
        return acc;
      },
      { cocIds: [] as number[], batches: [] as string[] },
    );

    const linkedCocIds = matches.cocIds;
    const linkedBatches = matches.batches;

    if (linkedCocIds.length > 0) {
      const updatedExtractedData = {
        ...(calendererCoc.extractedData ?? {}),
        linkedCompounderCocIds: linkedCocIds,
      };
      calendererCoc.extractedData = updatedExtractedData;
      await this.supplierCocRepository.save(calendererCoc);

      this.triggerReadinessCheckForLinkedCalenderer(calendererCoc);
    }

    return {
      linkedCocIds: [...new Set(linkedCocIds)],
      linkedBatches: [...new Set(linkedBatches)],
    };
  }

  private autoLinkCalendererToCompounder(calendererCoc: RubberSupplierCoc): void {
    const existingLinks = calendererCoc.extractedData?.linkedCompounderCocIds || [];
    if (existingLinks.length > 0) return;

    this.linkCalendererToCompounderCocs(calendererCoc.id)
      .then(async (result) => {
        if (result.linkedCocIds.length > 0) {
          this.logger.log(
            `Auto-linked calenderer ${calendererCoc.id} to compounder(s) [${result.linkedCocIds.join(", ")}] via batch numbers`,
          );
          return;
        }

        const compoundCode =
          calendererCoc.compoundCode || calendererCoc.extractedData?.compoundCode;
        if (!compoundCode) return;

        const compounderCoc = await this.findCompounderByCompoundCode(compoundCode);
        if (!compounderCoc) return;

        const updatedExtractedData = {
          ...(calendererCoc.extractedData ?? {}),
          linkedCompounderCocIds: [compounderCoc.id],
        };
        await this.supplierCocRepository.update(calendererCoc.id, {
          extractedData: updatedExtractedData,
        });

        this.logger.log(
          `Auto-linked calenderer ${calendererCoc.id} to compounder ${compounderCoc.id} via compound code ${compoundCode}`,
        );

        const refreshed = await this.supplierCocRepository.findOne({
          where: { id: calendererCoc.id },
        });
        if (refreshed) {
          this.triggerReadinessCheckForLinkedCalenderer(refreshed);
        }
      })
      .catch((error) => {
        this.logger.error(
          `Auto-link calenderer ${calendererCoc.id} to compounder failed: ${error.message}`,
        );
      });
  }

  private autoLinkCalenderRollToCalenderer(calenderRollCoc: RubberSupplierCoc): void {
    const orderNumber =
      calenderRollCoc.orderNumber || calenderRollCoc.extractedData?.orderNumber || null;

    if (!orderNumber) return;

    this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .andWhere("coc.order_number = :orderNumber", { orderNumber })
      .orderBy("coc.id", "DESC")
      .getOne()
      .then(async (calendererCoc) => {
        if (calendererCoc) {
          await this.supplierCocRepository.update(calenderRollCoc.id, {
            linkedCalenderRollCocId: calendererCoc.id,
          });
          this.logger.log(
            `Auto-linked calender roll CoC ${calenderRollCoc.id} to calenderer CoC ${calendererCoc.id} via order number ${orderNumber}`,
          );
        }
      })
      .catch((error) => {
        this.logger.error(
          `Auto-link calender roll CoC ${calenderRollCoc.id} to calenderer failed: ${error.message}`,
        );
      });
  }

  private async findCompounderByCompoundCode(
    calendererCompoundCode: string,
  ): Promise<RubberSupplierCoc | null> {
    const match = calendererCompoundCode.match(/^([A-Za-z]+)(\d+)$/);
    if (!match) return null;

    const [, baseCode, hardness] = match;
    const compounderPattern = `AUA${hardness}${baseCode}`;

    const compounderCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("coc.compound_code = :code", { code: compounderPattern })
      .orderBy("coc.id", "DESC")
      .getMany();

    if (compounderCocs.length === 0) return null;

    if (compounderCocs.length > 1) {
      this.logger.warn(
        `Multiple compounder CoCs match ${compounderPattern}: [${compounderCocs.map((c) => c.id).join(", ")}] — using most recent`,
      );
    }

    const withGraph = compounderCocs.find((c) => c.graphPdfPath);
    return withGraph || compounderCocs[0];
  }

  async traceabilityForRoll(rollNumber: string): Promise<{
    rollNumber: string;
    calendererCoc: RubberSupplierCocDto | null;
    compounderCocs: RubberSupplierCocDto[];
    batches: RubberCompoundBatchDto[];
  }> {
    const calendererCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .getMany();

    const matchingCalendererCoc = calendererCocs.find((coc) => {
      const rollNumbers = coc.extractedData?.rollNumbers || [];
      return rollNumbers.some((rn) => rn.toLowerCase().trim() === rollNumber.toLowerCase().trim());
    });

    if (!matchingCalendererCoc) {
      return {
        rollNumber,
        calendererCoc: null,
        compounderCocs: [],
        batches: [],
      };
    }

    const linkedCocIds = matchingCalendererCoc.extractedData?.linkedCompounderCocIds || [];
    const batchNumbers = matchingCalendererCoc.extractedData?.batchNumbers || [];

    const compounderCocs =
      linkedCocIds.length > 0
        ? await this.supplierCocRepository
            .createQueryBuilder("coc")
            .leftJoinAndSelect("coc.supplierCompany", "company")
            .whereInIds(linkedCocIds)
            .getMany()
        : [];

    const batches =
      batchNumbers.length > 0
        ? await this.compoundBatchRepository
            .createQueryBuilder("batch")
            .leftJoinAndSelect("batch.compoundStock", "stock")
            .leftJoinAndSelect("stock.compoundCoding", "coding")
            .where("batch.batch_number IN (:...batchNumbers)", { batchNumbers })
            .getMany()
        : [];

    return {
      rollNumber,
      calendererCoc: this.mapSupplierCocToDto(matchingCalendererCoc),
      compounderCocs: compounderCocs.map((c) => this.mapSupplierCocToDto(c)),
      batches: batches.map((b) => this.mapCompoundBatchToDto(b)),
    };
  }

  private mapSupplierCocToDto(coc: RubberSupplierCoc): RubberSupplierCocDto {
    return {
      id: coc.id,
      firebaseUid: coc.firebaseUid,
      cocType: coc.cocType,
      cocTypeLabel: COC_TYPE_LABELS[coc.cocType],
      supplierCompanyId: coc.supplierCompanyId,
      supplierCompanyName: coc.supplierCompany?.name ?? null,
      documentPath: coc.documentPath,
      graphPdfPath: coc.graphPdfPath,
      cocNumber: coc.cocNumber,
      productionDate: coc.productionDate
        ? coc.productionDate instanceof Date
          ? coc.productionDate.toISOString().split("T")[0]
          : String(coc.productionDate).split("T")[0]
        : null,
      compoundCode: coc.compoundCode,
      orderNumber: coc.orderNumber,
      ticketNumber: coc.ticketNumber,
      processingStatus: coc.processingStatus,
      processingStatusLabel: PROCESSING_STATUS_LABELS[coc.processingStatus],
      extractedData: coc.extractedData,
      reviewNotes: coc.reviewNotes,
      approvedBy: coc.approvedBy,
      approvedAt: coc.approvedAt ? coc.approvedAt.toISOString() : null,
      linkedDeliveryNoteId: coc.linkedDeliveryNoteId,
      linkedCalenderRollCocId: coc.linkedCalenderRollCocId ?? null,
      createdBy: coc.createdBy,
      createdAt: coc.createdAt.toISOString(),
      updatedAt: coc.updatedAt.toISOString(),
      version: coc.version,
      versionStatus: coc.versionStatus,
      versionStatusLabel: DOCUMENT_VERSION_STATUS_LABELS[coc.versionStatus],
      previousVersionId: coc.previousVersionId,
    };
  }

  private mapCompoundBatchToDto(batch: RubberCompoundBatch): RubberCompoundBatchDto {
    return {
      id: batch.id,
      firebaseUid: batch.firebaseUid,
      supplierCocId: batch.supplierCocId,
      supplierCocNumber: batch.supplierCoc?.cocNumber ?? null,
      batchNumber: batch.batchNumber,
      compoundStockId: batch.compoundStockId,
      compoundStockName: batch.compoundStock?.compoundCoding?.name ?? null,
      shoreAHardness: batch.shoreAHardness ? Number(batch.shoreAHardness) : null,
      specificGravity: batch.specificGravity ? Number(batch.specificGravity) : null,
      reboundPercent: batch.reboundPercent ? Number(batch.reboundPercent) : null,
      tearStrengthKnM: batch.tearStrengthKnM ? Number(batch.tearStrengthKnM) : null,
      tensileStrengthMpa: batch.tensileStrengthMpa ? Number(batch.tensileStrengthMpa) : null,
      elongationPercent: batch.elongationPercent ? Number(batch.elongationPercent) : null,
      rheometerSMin: batch.rheometerSMin ? Number(batch.rheometerSMin) : null,
      rheometerSMax: batch.rheometerSMax ? Number(batch.rheometerSMax) : null,
      rheometerTs2: batch.rheometerTs2 ? Number(batch.rheometerTs2) : null,
      rheometerTc90: batch.rheometerTc90 ? Number(batch.rheometerTc90) : null,
      passFailStatus: batch.passFailStatus,
      passFailStatusLabel: batch.passFailStatus
        ? BATCH_PASS_FAIL_LABELS[batch.passFailStatus]
        : null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };
  }

  async findMatchingSupplierCocsByOrderNumber(
    orderNumber: string,
  ): Promise<RubberSupplierCocDto[]> {
    const normalizedOrder = orderNumber.trim().toUpperCase();

    const cocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .getMany();

    const matchingCocs = cocs.filter((coc) => {
      const cocOrderNumber = coc.orderNumber?.trim().toUpperCase() || "";
      const extractedOrder = coc.extractedData?.orderNumber?.trim().toUpperCase() || "";

      if (cocOrderNumber === normalizedOrder || extractedOrder === normalizedOrder) {
        return true;
      }

      const rollNumbers = coc.extractedData?.rollNumbers || [];
      const rollMatch = rollNumbers.some((rn) => {
        const normalizedRoll = rn.trim().toUpperCase();
        return normalizedRoll.includes(normalizedOrder) || normalizedOrder.includes(normalizedRoll);
      });

      return rollMatch;
    });

    return matchingCocs.map((coc) => this.mapSupplierCocToDto(coc));
  }

  async findMatchingSupplierCocByRollNumber(rollNumber: string): Promise<{
    calendererCoc: RubberSupplierCocDto | null;
    compounderCocs: RubberSupplierCocDto[];
    batches: RubberCompoundBatchDto[];
    testData: ExtractedCocData["batches"];
  }> {
    const normalizedRoll = rollNumber.trim().toUpperCase();

    const calendererCocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .getMany();

    const matchingCalendererCoc = calendererCocs.find((coc) => {
      const rollNumbers = coc.extractedData?.rollNumbers || [];
      const orderNumber = coc.orderNumber?.trim().toUpperCase() || "";
      const extractedOrder = coc.extractedData?.orderNumber?.trim().toUpperCase() || "";

      const rollMatch = rollNumbers.some((rn) => {
        const normalizedCocRoll = rn.trim().toUpperCase();
        return normalizedCocRoll === normalizedRoll || normalizedRoll.includes(normalizedCocRoll);
      });

      const orderMatch =
        orderNumber === normalizedRoll ||
        extractedOrder === normalizedRoll ||
        normalizedRoll.includes(orderNumber) ||
        normalizedRoll.includes(extractedOrder);

      return rollMatch || orderMatch;
    });

    if (!matchingCalendererCoc) {
      return {
        calendererCoc: null,
        compounderCocs: [],
        batches: [],
        testData: [],
      };
    }

    const linkedCompounderIds = matchingCalendererCoc.extractedData?.linkedCompounderCocIds || [];
    const compounderCocs =
      linkedCompounderIds.length > 0
        ? await this.supplierCocRepository.find({
            where: linkedCompounderIds.map((id) => ({ id })),
            relations: ["supplierCompany"],
          })
        : [];

    const batchNumbers = matchingCalendererCoc.extractedData?.batchNumbers || [];
    const batches =
      batchNumbers.length > 0
        ? await this.compoundBatchRepository
            .createQueryBuilder("batch")
            .leftJoinAndSelect("batch.supplierCoc", "coc")
            .leftJoinAndSelect("batch.compoundStock", "stock")
            .leftJoinAndSelect("stock.compoundCoding", "coding")
            .where("batch.batch_number IN (:...batchNumbers)", { batchNumbers })
            .getMany()
        : [];

    const testData = matchingCalendererCoc.extractedData?.batches || [];

    return {
      calendererCoc: this.mapSupplierCocToDto(matchingCalendererCoc),
      compounderCocs: compounderCocs.map((coc) => this.mapSupplierCocToDto(coc)),
      batches: batches.map((batch) => this.mapCompoundBatchToDto(batch)),
      testData,
    };
  }

  extractedTestDataForCoc(cocId: number): Promise<ExtractedCocData["batches"]> {
    return this.supplierCocRepository
      .findOne({ where: { id: cocId } })
      .then((coc) => coc?.extractedData?.batches || []);
  }
}
