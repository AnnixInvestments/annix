import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { fromISO, generateUniqueId, now } from "../lib/datetime";
import {
  CreateOpeningStockDto,
  CreateRollStockDto,
  ImportOpeningStockResultDto,
  ImportOpeningStockRowDto,
  ReserveRollDto,
  RollTraceabilityDto,
  RubberAuCocDto,
  RubberCompoundBatchDto,
  RubberRollStockDto,
  RubberSupplierCocDto,
  SellRollDto,
  UpdateRollStockDto,
} from "./dto/rubber-coc.dto";
import { DOCUMENT_VERSION_STATUS_LABELS } from "./entities/document-version.types";
import { RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { BatchPassFailStatus, RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { ProductCodingType, RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";
import { RubberStockLocation } from "./entities/rubber-stock-location.entity";
import {
  CocProcessingStatus,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";
import { RubberTaxInvoice, TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";

const ROLL_STATUS_LABELS: Record<RollStockStatus, string> = {
  [RollStockStatus.IN_STOCK]: "In Stock",
  [RollStockStatus.RESERVED]: "Reserved",
  [RollStockStatus.SOLD]: "Sold",
  [RollStockStatus.SCRAPPED]: "Scrapped",
  [RollStockStatus.REJECTED]: "Rejected",
};

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
export class RubberRollStockService {
  constructor(
    @InjectRepository(RubberRollStock)
    private rollStockRepository: Repository<RubberRollStock>,
    @InjectRepository(RubberCompoundBatch)
    private compoundBatchRepository: Repository<RubberCompoundBatch>,
    @InjectRepository(RubberSupplierCoc)
    private supplierCocRepository: Repository<RubberSupplierCoc>,
    @InjectRepository(RubberAuCoc)
    private auCocRepository: Repository<RubberAuCoc>,
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberProductCoding)
    private productCodingRepository: Repository<RubberProductCoding>,
    @InjectRepository(RubberStockLocation)
    private stockLocationRepository: Repository<RubberStockLocation>,
    @InjectRepository(RubberTaxInvoice)
    private taxInvoiceRepository: Repository<RubberTaxInvoice>,
  ) {}

  async allRollStock(filters?: {
    status?: RollStockStatus;
    compoundCodingId?: number;
    soldToCompanyId?: number;
  }): Promise<RubberRollStockDto[]> {
    const query = this.rollStockRepository
      .createQueryBuilder("roll")
      .leftJoinAndSelect("roll.compoundCoding", "coding")
      .leftJoinAndSelect("roll.soldToCompany", "soldToCompany")
      .orderBy("roll.created_at", "DESC");

    if (filters?.status) {
      query.andWhere("roll.status = :status", { status: filters.status });
    }
    if (filters?.compoundCodingId) {
      query.andWhere("roll.compound_coding_id = :codingId", {
        codingId: filters.compoundCodingId,
      });
    }
    if (filters?.soldToCompanyId) {
      query.andWhere("roll.sold_to_company_id = :companyId", {
        companyId: filters.soldToCompanyId,
      });
    }

    const rolls = await query.getMany();
    return rolls.map((roll) => this.mapRollStockToDto(roll));
  }

  async rollById(id: number): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    return roll ? this.mapRollStockToDto(roll) : null;
  }

  async rollByNumber(rollNumber: string): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { rollNumber },
      relations: ["compoundCoding", "soldToCompany"],
    });
    return roll ? this.mapRollStockToDto(roll) : null;
  }

  async createRollStock(dto: CreateRollStockDto): Promise<RubberRollStockDto> {
    const existingRoll = await this.rollStockRepository.findOne({
      where: { rollNumber: dto.rollNumber },
    });
    if (existingRoll) {
      throw new BadRequestException(`Roll number ${dto.rollNumber} already exists`);
    }

    if (dto.compoundCodingId) {
      const coding = await this.productCodingRepository.findOne({
        where: { id: dto.compoundCodingId },
      });
      if (!coding) {
        throw new BadRequestException("Compound coding not found");
      }
    }

    const roll = this.rollStockRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      rollNumber: dto.rollNumber,
      compoundCodingId: dto.compoundCodingId ?? null,
      weightKg: dto.weightKg,
      widthMm: dto.widthMm ?? null,
      thicknessMm: dto.thicknessMm ?? null,
      lengthM: dto.lengthM ?? null,
      status: RollStockStatus.IN_STOCK,
      linkedBatchIds: dto.linkedBatchIds ?? [],
      deliveryNoteItemId: dto.deliveryNoteItemId ?? null,
      location: dto.location ?? null,
      notes: dto.notes ?? null,
      costZar: dto.costZar ?? null,
      priceZar: dto.priceZar ?? null,
    });

    const saved = await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve created roll stock");
    }
    return this.mapRollStockToDto(result);
  }

  async updateRollStock(id: number, dto: UpdateRollStockDto): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    if (dto.compoundCodingId !== undefined) {
      if (dto.compoundCodingId !== null) {
        const coding = await this.productCodingRepository.findOne({
          where: { id: dto.compoundCodingId },
        });
        if (!coding) {
          throw new BadRequestException("Compound coding not found");
        }
      }
      roll.compoundCodingId = dto.compoundCodingId;
    }
    if (dto.weightKg !== undefined) roll.weightKg = dto.weightKg;
    if (dto.widthMm !== undefined) roll.widthMm = dto.widthMm;
    if (dto.thicknessMm !== undefined) roll.thicknessMm = dto.thicknessMm;
    if (dto.lengthM !== undefined) roll.lengthM = dto.lengthM;
    if (dto.status !== undefined) roll.status = dto.status;
    if (dto.location !== undefined) roll.location = dto.location;
    if (dto.notes !== undefined) roll.notes = dto.notes;

    await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve updated roll stock");
    }
    return this.mapRollStockToDto(result);
  }

  async reserveRoll(id: number, dto: ReserveRollDto): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    if (roll.status !== RollStockStatus.IN_STOCK) {
      throw new BadRequestException(`Roll is not in stock (current status: ${roll.status})`);
    }

    const company = await this.companyRepository.findOne({ where: { id: dto.customerId } });
    if (!company) {
      throw new BadRequestException("Customer company not found");
    }

    roll.status = RollStockStatus.RESERVED;
    roll.soldToCompanyId = dto.customerId;
    roll.reservedBy = dto.reservedBy ?? null;
    roll.reservedAt = now().toJSDate();

    await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve reserved roll stock");
    }
    return this.mapRollStockToDto(result);
  }

  async unreserveRoll(id: number): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    if (roll.status !== RollStockStatus.RESERVED) {
      throw new BadRequestException("Roll is not reserved");
    }

    roll.status = RollStockStatus.IN_STOCK;
    roll.soldToCompanyId = null;
    roll.reservedBy = null;
    roll.reservedAt = null;

    await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve unreserved roll stock");
    }
    return this.mapRollStockToDto(result);
  }

  async sellRoll(id: number, dto: SellRollDto): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    if (roll.status !== RollStockStatus.IN_STOCK && roll.status !== RollStockStatus.RESERVED) {
      throw new BadRequestException(`Roll cannot be sold (current status: ${roll.status})`);
    }

    const company = await this.companyRepository.findOne({ where: { id: dto.customerId } });
    if (!company) {
      throw new BadRequestException("Customer company not found");
    }

    roll.status = RollStockStatus.SOLD;
    roll.soldToCompanyId = dto.customerId;
    roll.soldAt = now().toJSDate();

    await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve sold roll stock");
    }
    return this.mapRollStockToDto(result);
  }

  async scrapRoll(id: number, notes?: string): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    if (roll.status === RollStockStatus.SOLD) {
      throw new BadRequestException("Sold rolls cannot be scrapped");
    }

    roll.status = RollStockStatus.SCRAPPED;
    if (notes) {
      roll.notes = roll.notes ? `${roll.notes}\n${notes}` : notes;
    }

    await this.rollStockRepository.save(roll);
    return this.mapRollStockToDto(roll);
  }

  async deleteRollStock(id: number): Promise<boolean> {
    const roll = await this.rollStockRepository.findOne({ where: { id } });
    if (roll && roll.status === RollStockStatus.SOLD) {
      throw new BadRequestException("Sold rolls cannot be deleted");
    }
    const result = await this.rollStockRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async rollTraceability(id: number): Promise<RollTraceabilityDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    const batchRecords =
      roll.linkedBatchIds && roll.linkedBatchIds.length > 0
        ? await this.compoundBatchRepository.find({
            where: { id: In(roll.linkedBatchIds) },
            relations: [
              "supplierCoc",
              "supplierCoc.supplierCompany",
              "compoundStock",
              "compoundStock.compoundCoding",
            ],
          })
        : [];

    const cocIds = [...new Set(batchRecords.map((b) => b.supplierCocId))];
    const supplierCocs =
      cocIds.length > 0
        ? await this.supplierCocRepository.find({
            where: { id: In(cocIds) },
            relations: ["supplierCompany"],
          })
        : [];

    let auCoc: RubberAuCocDto | null = null;
    if (roll.auCocId) {
      const auCocRecord = await this.auCocRepository.findOne({
        where: { id: roll.auCocId },
        relations: ["customerCompany"],
      });
      if (auCocRecord) {
        auCoc = {
          id: auCocRecord.id,
          firebaseUid: auCocRecord.firebaseUid,
          cocNumber: auCocRecord.cocNumber,
          customerCompanyId: auCocRecord.customerCompanyId,
          customerCompanyName: auCocRecord.customerCompany?.name ?? null,
          poNumber: auCocRecord.poNumber,
          deliveryNoteRef: auCocRecord.deliveryNoteRef,
          sourceDeliveryNoteId: auCocRecord.sourceDeliveryNoteId ?? null,
          extractedRollData: auCocRecord.extractedRollData ?? null,
          status: auCocRecord.status,
          statusLabel: auCocRecord.status,
          generatedPdfPath: auCocRecord.generatedPdfPath,
          sentToEmail: auCocRecord.sentToEmail,
          sentAt: auCocRecord.sentAt?.toISOString() ?? null,
          createdBy: auCocRecord.createdBy,
          notes: auCocRecord.notes,
          approvedByName: auCocRecord.approvedByName,
          approvedAt: auCocRecord.approvedAt?.toISOString() ?? null,
          readinessStatus: auCocRecord.readinessStatus ?? null,
          readinessDetails: auCocRecord.readinessDetails ?? null,
          createdAt: auCocRecord.createdAt.toISOString(),
          updatedAt: auCocRecord.updatedAt.toISOString(),
          itemCount: 0,
        };
      }
    }

    return {
      roll: this.mapRollStockToDto(roll),
      batches: batchRecords.map((b) => this.mapBatchToDto(b)),
      supplierCocs: supplierCocs.map((c) => this.mapSupplierCocToDto(c)),
      auCoc,
    };
  }

  async inStockCount(): Promise<number> {
    return this.rollStockRepository.count({
      where: { status: RollStockStatus.IN_STOCK },
    });
  }

  async reservedCount(): Promise<number> {
    return this.rollStockRepository.count({
      where: { status: RollStockStatus.RESERVED },
    });
  }

  async linkBatchesToRoll(rollId: number, batchIds: number[]): Promise<RubberRollStockDto | null> {
    const roll = await this.rollStockRepository.findOne({
      where: { id: rollId },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!roll) return null;

    roll.linkedBatchIds = batchIds;
    await this.rollStockRepository.save(roll);
    return this.mapRollStockToDto(roll);
  }

  async createOpeningStock(dto: CreateOpeningStockDto): Promise<RubberRollStockDto> {
    const existingRoll = await this.rollStockRepository.findOne({
      where: { rollNumber: dto.rollNumber },
    });
    if (existingRoll) {
      throw new BadRequestException(`Roll number ${dto.rollNumber} already exists`);
    }

    const coding = await this.productCodingRepository.findOne({
      where: { id: dto.compoundCodingId },
    });
    if (!coding) {
      throw new BadRequestException("Compound not found");
    }
    if (coding.codingType !== ProductCodingType.COMPOUND) {
      throw new BadRequestException("Selected coding must be of type COMPOUND");
    }

    let locationName: string | null = null;
    if (dto.locationId) {
      const location = await this.stockLocationRepository.findOne({
        where: { id: dto.locationId },
      });
      if (location) {
        locationName = location.name;
      }
    }

    const roll = this.rollStockRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      rollNumber: dto.rollNumber,
      compoundCodingId: dto.compoundCodingId,
      weightKg: dto.weightKg,
      status: RollStockStatus.IN_STOCK,
      linkedBatchIds: [],
      costZar: dto.costZar ?? null,
      priceZar: dto.priceZar ?? null,
      notes: dto.notes ?? null,
      locationId: dto.locationId ?? null,
      location: locationName,
      productionDate: dto.productionDate ? fromISO(dto.productionDate).toJSDate() : null,
    });

    const saved = await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    if (!result) {
      throw new BadRequestException("Failed to retrieve created opening stock");
    }
    return this.mapRollStockToDto(result);
  }

  async importOpeningStock(rows: ImportOpeningStockRowDto[]): Promise<ImportOpeningStockResultDto> {
    const result: ImportOpeningStockResultDto = {
      totalRows: rows.length,
      created: 0,
      errors: [],
    };

    const compoundCodings = await this.productCodingRepository.find({
      where: { codingType: ProductCodingType.COMPOUND },
    });
    const codingByCode = new Map(compoundCodings.map((c) => [c.code.toUpperCase(), c]));

    const finalResult = await rows.reduce(async (accPromise, row, index) => {
      const acc = await accPromise;
      const rowNumber = index + 1;

      const existingRoll = await this.rollStockRepository.findOne({
        where: { rollNumber: row.rollNumber },
      });
      if (existingRoll) {
        return {
          ...acc,
          errors: [
            ...acc.errors,
            {
              row: rowNumber,
              rollNumber: row.rollNumber,
              error: `Roll number ${row.rollNumber} already exists`,
            },
          ],
        };
      }

      const coding = codingByCode.get(row.compoundCode.toUpperCase());
      if (!coding) {
        return {
          ...acc,
          errors: [
            ...acc.errors,
            {
              row: rowNumber,
              rollNumber: row.rollNumber,
              error: `Compound code ${row.compoundCode} not found`,
            },
          ],
        };
      }

      try {
        const roll = this.rollStockRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          rollNumber: row.rollNumber,
          compoundCodingId: coding.id,
          weightKg: row.weightKg,
          status: RollStockStatus.IN_STOCK,
          linkedBatchIds: [],
          costZar: row.costZar ?? null,
          priceZar: row.priceZar ?? null,
          location: row.location ?? null,
          productionDate: row.productionDate ? fromISO(row.productionDate).toJSDate() : null,
        });
        await this.rollStockRepository.save(roll);
        return { ...acc, created: acc.created + 1 };
      } catch (err) {
        return {
          ...acc,
          errors: [
            ...acc.errors,
            {
              row: rowNumber,
              rollNumber: row.rollNumber,
              error: err instanceof Error ? err.message : "Unknown error",
            },
          ],
        };
      }
    }, Promise.resolve(result));

    return finalResult;
  }

  private mapRollStockToDto(roll: RubberRollStock): RubberRollStockDto {
    return {
      id: roll.id,
      firebaseUid: roll.firebaseUid,
      rollNumber: roll.rollNumber,
      compoundCodingId: roll.compoundCodingId,
      compoundCode: roll.compoundCoding?.code ?? null,
      compoundName: roll.compoundCoding?.name ?? null,
      weightKg: Number(roll.weightKg),
      widthMm: roll.widthMm ? Number(roll.widthMm) : null,
      thicknessMm: roll.thicknessMm ? Number(roll.thicknessMm) : null,
      lengthM: roll.lengthM ? Number(roll.lengthM) : null,
      status: roll.status,
      statusLabel: ROLL_STATUS_LABELS[roll.status],
      linkedBatchIds: roll.linkedBatchIds,
      deliveryNoteItemId: roll.deliveryNoteItemId,
      soldToCompanyId: roll.soldToCompanyId,
      soldToCompanyName: roll.soldToCompany?.name ?? null,
      auCocId: roll.auCocId,
      reservedBy: roll.reservedBy,
      reservedAt: roll.reservedAt?.toISOString() ?? null,
      soldAt: roll.soldAt?.toISOString() ?? null,
      location: roll.location,
      notes: roll.notes,
      costZar: roll.costZar ? Number(roll.costZar) : null,
      priceZar: roll.priceZar ? Number(roll.priceZar) : null,
      productionDate: roll.productionDate
        ? roll.productionDate instanceof Date
          ? roll.productionDate.toISOString()
          : String(roll.productionDate)
        : null,
      createdAt: roll.createdAt.toISOString(),
      updatedAt: roll.updatedAt.toISOString(),
    };
  }

  private mapBatchToDto(batch: RubberCompoundBatch): RubberCompoundBatchDto {
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
      rejectedRollNumbers: [],
    };
  }

  private parseDimensionsFromDescription(description: string): {
    productCode: string | null;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: number | null;
  } {
    const match = description.match(
      /^([A-Z]{2,5}\d{2})\s+(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/,
    );
    if (!match) {
      return { productCode: null, thicknessMm: null, widthMm: null, lengthM: null };
    }
    return {
      productCode: match[1],
      thicknessMm: Number.parseFloat(match[2]),
      widthMm: Number.parseFloat(match[3]),
      lengthM: Number.parseFloat(match[4]),
    };
  }

  private async findOrCreateProductCoding(code: string): Promise<RubberProductCoding> {
    const existing = await this.productCodingRepository.findOne({
      where: { code, codingType: ProductCodingType.COMPOUND },
    });
    if (existing) return existing;
    const coding = this.productCodingRepository.create({
      firebaseUid: `pg_${generateUniqueId()}`,
      codingType: ProductCodingType.COMPOUND,
      code,
      name: code,
    });
    return this.productCodingRepository.save(coding);
  }

  async createRollsFromSupplierTaxInvoice(
    invoiceId: number,
    lineItems: Array<{
      description: string;
      unitPrice: number | null;
      rolls?: Array<{ rollNumber: string; weightKg: number | null }> | null;
    }>,
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (let idx = 0; idx < lineItems.length; idx += 1) {
      const line = lineItems[idx];
      const lineRolls = line.rolls;
      if (!lineRolls || lineRolls.length === 0) continue;
      const dims = this.parseDimensionsFromDescription(line.description);
      const productCode = dims.productCode;
      const coding = productCode ? await this.findOrCreateProductCoding(productCode) : null;
      for (const roll of lineRolls) {
        const existing = await this.rollStockRepository.findOne({
          where: { rollNumber: roll.rollNumber },
        });
        if (existing) {
          skipped += 1;
          continue;
        }
        const tollCost = line.unitPrice ?? null;
        const entity = this.rollStockRepository.create({
          firebaseUid: `pg_${generateUniqueId()}`,
          rollNumber: roll.rollNumber,
          compoundCodingId: coding ? coding.id : null,
          weightKg: roll.weightKg ?? 0,
          widthMm: dims.widthMm,
          thicknessMm: dims.thicknessMm,
          lengthM: dims.lengthM,
          status: RollStockStatus.IN_STOCK,
          linkedBatchIds: [],
          costZar: tollCost,
          tollCostR: tollCost,
          compoundCostR: null,
          totalCostR: tollCost,
          supplierTaxInvoiceId: invoiceId,
          supplierTaxInvoiceLineIdx: idx,
        });
        await this.rollStockRepository.save(entity);
        created += 1;
      }
    }
    return { created, skipped };
  }

  async markRollsSoldByNumbers(
    rollNumbers: string[],
    soldToCompanyId: number | null,
    customerTaxInvoiceId: number,
  ): Promise<{ marked: number; missing: string[] }> {
    if (rollNumbers.length === 0) return { marked: 0, missing: [] };
    const rolls = await this.rollStockRepository.find({
      where: { rollNumber: In(rollNumbers) },
    });
    const found = new Set(rolls.map((r) => r.rollNumber));
    const missing = rollNumbers.filter((n) => !found.has(n));
    const updates = rolls.map((r) => ({
      ...r,
      status: RollStockStatus.SOLD,
      soldToCompanyId,
      customerTaxInvoiceId,
      soldAt: now().toJSDate(),
    }));
    await this.rollStockRepository.save(updates);
    return { marked: rolls.length, missing };
  }

  async availableRollsForProductCode(productCode: string): Promise<RubberRollStockDto[]> {
    const coding = await this.productCodingRepository.findOne({
      where: { code: productCode, codingType: ProductCodingType.COMPOUND },
    });
    if (!coding) return [];
    const rolls = await this.rollStockRepository.find({
      where: { compoundCodingId: coding.id, status: RollStockStatus.IN_STOCK },
      relations: ["compoundCoding", "soldToCompany"],
      order: { rollNumber: "ASC" },
    });
    return rolls.map((r) => this.mapRollStockToDto(r));
  }

  private async impiloCocForInvoice(invoice: RubberTaxInvoice): Promise<RubberSupplierCoc | null> {
    const orderNumber = invoice.extractedData?.orderNumber;
    if (!orderNumber) return null;
    const cocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.CALENDARER })
      .andWhere("coc.supplier_company_id = :companyId", { companyId: invoice.companyId })
      .andWhere("coc.extracted_data->>'orderNumber' = :order", { order: orderNumber })
      .orderBy("coc.created_at", "DESC")
      .limit(1)
      .getMany();
    return cocs.length > 0 ? cocs[0] : null;
  }

  private async sNCocByBatchOverlap(batchNumbers: string[]): Promise<RubberSupplierCoc | null> {
    if (batchNumbers.length === 0) return null;
    const cocs = await this.supplierCocRepository
      .createQueryBuilder("coc")
      .where("coc.coc_type = :type", { type: SupplierCocType.COMPOUNDER })
      .andWhere("coc.extracted_data->'batchNumbers' ?| :batches", { batches: batchNumbers })
      .orderBy("coc.created_at", "DESC")
      .limit(1)
      .getMany();
    return cocs.length > 0 ? cocs[0] : null;
  }

  private async sNInvoiceForCompound(
    snCompanyId: number,
    compoundCode: string | null,
    productionDate: Date | null,
  ): Promise<{ invoice: RubberTaxInvoice; lineUnitPrice: number } | null> {
    const candidates = await this.taxInvoiceRepository
      .createQueryBuilder("inv")
      .where("inv.company_id = :companyId", { companyId: snCompanyId })
      .andWhere("inv.invoice_type = :type", { type: TaxInvoiceType.SUPPLIER })
      .andWhere("inv.is_credit_note = false")
      .orderBy("inv.invoice_date", "DESC")
      .limit(50)
      .getMany();
    const shoreMatch = compoundCode ? compoundCode.match(/(\d{2})/) : null;
    const shore = shoreMatch ? shoreMatch[1] : null;
    const colourMatch = compoundCode ? compoundCode.match(/^([A-Z])/) : null;
    const colourCode = colourMatch ? colourMatch[1] : null;
    const colourMap: Record<string, string[]> = {
      R: ["red"],
      B: ["black"],
      G: ["green"],
      Y: ["yellow"],
      P: ["pink"],
      W: ["white"],
      O: ["orange"],
    };
    const colourTokens = colourCode ? (colourMap[colourCode] ?? []) : [];

    const productionMs = productionDate ? productionDate.getTime() : null;
    const scoreCandidate = (inv: RubberTaxInvoice): number | null => {
      const lineItems = inv.extractedData?.lineItems ?? [];
      const matchLine = lineItems.find((li) => {
        const desc = (li.description ?? "").toLowerCase();
        if (shore && !desc.includes(shore)) return false;
        if (colourTokens.length > 0 && !colourTokens.some((t) => desc.includes(t))) return false;
        return true;
      });
      if (!matchLine || matchLine.unitPrice == null) return null;
      let score = 1000;
      if (productionMs && inv.invoiceDate) {
        const diffDays = (inv.invoiceDate.getTime() - productionMs) / (1000 * 60 * 60 * 24);
        if (diffDays < -1) return null;
        if (diffDays > 14) score -= 100;
        else score += 50 - Math.abs(diffDays);
      }
      return score;
    };

    const ranked = candidates
      .map((inv) => ({ inv, score: scoreCandidate(inv) }))
      .filter((c): c is { inv: RubberTaxInvoice; score: number } => c.score !== null)
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return null;
    const winner = ranked[0].inv;
    const lineItems = winner.extractedData?.lineItems ?? [];
    const matchedLine = lineItems.find((li) => {
      const desc = (li.description ?? "").toLowerCase();
      if (shore && !desc.includes(shore)) return false;
      if (colourTokens.length > 0 && !colourTokens.some((t) => desc.includes(t))) return false;
      return true;
    });
    if (!matchedLine || matchedLine.unitPrice == null) return null;
    return { invoice: winner, lineUnitPrice: matchedLine.unitPrice };
  }

  async resolveCompoundCostPerKgForImpiloInvoice(
    impiloInvoiceId: number,
  ): Promise<{ unitPrice: number; sourceInvoiceId: number; sourceCocId: number | null } | null> {
    const invoice = await this.taxInvoiceRepository.findOne({
      where: { id: impiloInvoiceId },
      relations: ["company"],
    });
    if (!invoice) return null;
    const impiloCoc = await this.impiloCocForInvoice(invoice);
    if (!impiloCoc) return null;
    const batchNumbers = (impiloCoc.extractedData?.batchNumbers as string[] | undefined) ?? [];
    if (batchNumbers.length === 0) return null;
    const snCoc = await this.sNCocByBatchOverlap(batchNumbers);
    if (!snCoc) return null;
    const snCompoundCode =
      (snCoc.extractedData?.compoundCode as string | undefined) ??
      (impiloCoc.extractedData?.compoundCode as string | undefined) ??
      null;
    const result = await this.sNInvoiceForCompound(
      snCoc.supplierCompanyId,
      snCompoundCode,
      snCoc.productionDate,
    );
    if (!result) return null;
    return {
      unitPrice: result.lineUnitPrice,
      sourceInvoiceId: result.invoice.id,
      sourceCocId: snCoc.id,
    };
  }

  async propagateCompoundCostsForImpiloInvoice(
    impiloInvoiceId: number,
  ): Promise<{ updated: number; unitPrice: number | null }> {
    const resolved = await this.resolveCompoundCostPerKgForImpiloInvoice(impiloInvoiceId);
    if (!resolved) return { updated: 0, unitPrice: null };
    const rolls = await this.rollStockRepository.find({
      where: { supplierTaxInvoiceId: impiloInvoiceId },
    });
    const updates = rolls.map((r) => {
      const weight = Number(r.weightKg ?? 0);
      const compoundCost = Math.round(weight * resolved.unitPrice * 100) / 100;
      const tollCost = r.tollCostR ?? 0;
      const total = Math.round((Number(tollCost) + compoundCost) * 100) / 100;
      return {
        ...r,
        compoundCostR: compoundCost,
        totalCostR: total,
        costZar: total,
      };
    });
    if (updates.length > 0) await this.rollStockRepository.save(updates);
    return { updated: updates.length, unitPrice: resolved.unitPrice };
  }
}
