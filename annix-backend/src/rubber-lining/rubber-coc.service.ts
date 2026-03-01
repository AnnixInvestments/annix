import { BadRequestException, forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { generateUniqueId, now } from "../lib/datetime";
import {
  CreateCompoundBatchDto,
  CreateSupplierCocDto,
  ReviewExtractionDto,
  RubberCompoundBatchDto,
  RubberSupplierCocDto,
  UpdateSupplierCocDto,
} from "./dto/rubber-coc.dto";
import { RubberCompany } from "./entities/rubber-company.entity";
import { BatchPassFailStatus, RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import {
  CocProcessingStatus,
  ExtractedCocData,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";

const COC_TYPE_LABELS: Record<SupplierCocType, string> = {
  [SupplierCocType.COMPOUNDER]: "Compounder",
  [SupplierCocType.CALENDARER]: "Calendarer",
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
    @Inject(forwardRef(() => RubberQualityTrackingService))
    private qualityTrackingService: RubberQualityTrackingService,
  ) {}

  private normalizeCocNumber(cocNumber: string): string {
    return cocNumber.trim().replace(/\s+/g, "").replace(/[–—]/g, "-");
  }

  async allSupplierCocs(filters?: {
    cocType?: SupplierCocType;
    processingStatus?: CocProcessingStatus;
    supplierCompanyId?: number;
  }): Promise<RubberSupplierCocDto[]> {
    const query = this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "company")
      .orderBy("coc.created_at", "DESC");

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
    let supplierCompanyId = dto.supplierCompanyId;

    if (!supplierCompanyId) {
      const company = await this.resolveOrCreateSupplierForType(dto.cocType);
      supplierCompanyId = company.id;
    } else {
      const company = await this.companyRepository.findOne({
        where: { id: supplierCompanyId },
      });
      if (!company) {
        throw new BadRequestException("Supplier company not found");
      }
    }

    const coc = this.supplierCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocType: dto.cocType,
      supplierCompanyId,
      documentPath: dto.documentPath,
      graphPdfPath: dto.graphPdfPath ?? null,
      cocNumber: dto.cocNumber ?? null,
      productionDate: dto.productionDate ? new Date(dto.productionDate) : null,
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
    return this.mapSupplierCocToDto(result!);
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
      coc.productionDate = dto.productionDate ? new Date(dto.productionDate) : null;
    }
    if (dto.compoundCode !== undefined) coc.compoundCode = dto.compoundCode;
    if (dto.orderNumber !== undefined) coc.orderNumber = dto.orderNumber;
    if (dto.ticketNumber !== undefined) coc.ticketNumber = dto.ticketNumber;
    if (dto.processingStatus !== undefined) coc.processingStatus = dto.processingStatus;

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
    if (extractedData.productionDate) coc.productionDate = new Date(extractedData.productionDate);
    if (extractedData.compoundCode) coc.compoundCode = extractedData.compoundCode;
    if (extractedData.orderNumber) coc.orderNumber = extractedData.orderNumber;
    if (extractedData.ticketNumber) coc.ticketNumber = extractedData.ticketNumber;

    await this.supplierCocRepository.save(coc);
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
        coc.productionDate = new Date(dto.extractedData.productionDate);
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

    coc.processingStatus = CocProcessingStatus.APPROVED;
    coc.approvedAt = now().toJSDate();
    coc.approvedBy = approvedBy ?? null;
    await this.supplierCocRepository.save(coc);

    if (coc.extractedData?.batches) {
      await this.createBatchesFromExtractedData(coc);
    }

    if (coc.cocType === SupplierCocType.COMPOUNDER && coc.compoundCode) {
      this.triggerQualityCheck(coc.compoundCode);
    }

    return this.mapSupplierCocToDto(coc);
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
  ): Promise<{ coc: RubberSupplierCocDto; wasUpdated: boolean }> {
    const normalizedCocNumber = this.normalizeCocNumber(cocNumber);

    const existingCoc = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .leftJoinAndSelect("coc.supplierCompany", "supplierCompany")
      .where("LOWER(TRIM(coc.cocNumber)) = LOWER(:cocNumber)", {
        cocNumber: normalizedCocNumber,
      })
      .andWhere("coc.cocType = :cocType", { cocType })
      .getOne();

    if (existingCoc) {
      this.logger.log(
        `Duplicate CoC detected: ${normalizedCocNumber} (${cocType}) - updating existing CoC ${existingCoc.id}`,
      );
      existingCoc.documentPath = documentPath;
      existingCoc.extractedData = extractedData;
      existingCoc.processingStatus = CocProcessingStatus.EXTRACTED;
      existingCoc.supplierCompanyId = supplierCompanyId;

      if (extractedData.productionDate) {
        existingCoc.productionDate = new Date(extractedData.productionDate);
      }
      if (extractedData.compoundCode) {
        existingCoc.compoundCode = extractedData.compoundCode;
      }
      if (extractedData.orderNumber) {
        existingCoc.orderNumber = extractedData.orderNumber;
      }
      if (extractedData.ticketNumber) {
        existingCoc.ticketNumber = extractedData.ticketNumber;
      }

      await this.supplierCocRepository.save(existingCoc);

      const refreshed = await this.supplierCocRepository.findOne({
        where: { id: existingCoc.id },
        relations: ["supplierCompany"],
      });

      return { coc: this.mapSupplierCocToDto(refreshed!), wasUpdated: true };
    }

    const newCoc = this.supplierCocRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      cocType,
      supplierCompanyId,
      documentPath,
      cocNumber: normalizedCocNumber,
      extractedData,
      processingStatus: CocProcessingStatus.EXTRACTED,
      productionDate: extractedData.productionDate ? new Date(extractedData.productionDate) : null,
      compoundCode: extractedData.compoundCode ?? null,
      orderNumber: extractedData.orderNumber ?? null,
      ticketNumber: extractedData.ticketNumber ?? null,
      createdBy: createdBy ?? null,
    });

    const saved = await this.supplierCocRepository.save(newCoc);
    const result = await this.supplierCocRepository.findOne({
      where: { id: saved.id },
      relations: ["supplierCompany"],
    });

    return { coc: this.mapSupplierCocToDto(result!), wasUpdated: false };
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

      const batches = await this.compoundBatchRepository
        .createQueryBuilder("batch")
        .leftJoinAndSelect("batch.supplierCoc", "supplierCoc")
        .leftJoinAndSelect("batch.compoundStock", "compoundStock")
        .leftJoinAndSelect("compoundStock.compoundCoding", "compoundCoding")
        .where("batch.batchNumber IN (:...batchNumbers)", { batchNumbers })
        .orderBy("batch.batchNumber", "ASC")
        .getMany();

      return batches.map((batch) => this.mapCompoundBatchToDto(batch));
    }

    const batches = await this.compoundBatchRepository.find({
      where: { supplierCocId },
      relations: ["supplierCoc", "compoundStock", "compoundStock.compoundCoding"],
      order: { batchNumber: "ASC" },
    });
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
    return this.mapCompoundBatchToDto(result!);
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
    const supplierNames: Record<SupplierCocType, string> = {
      [SupplierCocType.COMPOUNDER]: "S&N Rubber",
      [SupplierCocType.CALENDARER]: "Impilo",
    };

    const supplierName = supplierNames[cocType];

    let company = await this.companyRepository
      .createQueryBuilder("company")
      .where("LOWER(company.name) LIKE LOWER(:name)", { name: `%${supplierName}%` })
      .getOne();

    if (!company) {
      company = this.companyRepository.create({
        firebaseUid: `pg_${generateUniqueId()}`,
        name: supplierName,
      });
      await this.companyRepository.save(company);
    }

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

    const linkedCocIds: number[] = [];
    const linkedBatches: string[] = [];

    compounderCocs.forEach((compCoc) => {
      const compBatches = compCoc.extractedData?.batchNumbers || [];
      const compBatchesFromData = compCoc.extractedData?.batches?.map((b) => b.batchNumber) || [];
      const allCompBatches = [...new Set([...compBatches, ...compBatchesFromData])];

      const matchingBatches = batchNumbers.filter((bn) =>
        allCompBatches.some((cb) => cb.toLowerCase().trim() === bn.toLowerCase().trim()),
      );

      if (matchingBatches.length > 0) {
        linkedCocIds.push(compCoc.id);
        linkedBatches.push(...matchingBatches);
      }
    });

    if (linkedCocIds.length > 0) {
      const updatedExtractedData = {
        ...calendererCoc.extractedData,
        linkedCompounderCocIds: linkedCocIds,
      };
      calendererCoc.extractedData = updatedExtractedData;
      await this.supplierCocRepository.save(calendererCoc);
    }

    return {
      linkedCocIds: [...new Set(linkedCocIds)],
      linkedBatches: [...new Set(linkedBatches)],
    };
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
      createdBy: coc.createdBy,
      createdAt: coc.createdAt.toISOString(),
      updatedAt: coc.updatedAt.toISOString(),
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
}
