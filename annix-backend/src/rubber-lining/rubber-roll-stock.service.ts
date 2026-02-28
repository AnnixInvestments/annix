import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { generateUniqueId, now } from "../lib/datetime";
import {
  CreateRollStockDto,
  ReserveRollDto,
  RollTraceabilityDto,
  RubberAuCocDto,
  RubberCompoundBatchDto,
  RubberRollStockDto,
  RubberSupplierCocDto,
  SellRollDto,
  UpdateRollStockDto,
} from "./dto/rubber-coc.dto";
import { RubberAuCoc } from "./entities/rubber-au-coc.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { BatchPassFailStatus, RubberCompoundBatch } from "./entities/rubber-compound-batch.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RollStockStatus, RubberRollStock } from "./entities/rubber-roll-stock.entity";
import {
  CocProcessingStatus,
  RubberSupplierCoc,
  SupplierCocType,
} from "./entities/rubber-supplier-coc.entity";

const ROLL_STATUS_LABELS: Record<RollStockStatus, string> = {
  [RollStockStatus.IN_STOCK]: "In Stock",
  [RollStockStatus.RESERVED]: "Reserved",
  [RollStockStatus.SOLD]: "Sold",
  [RollStockStatus.SCRAPPED]: "Scrapped",
};

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
    });

    const saved = await this.rollStockRepository.save(roll);
    const result = await this.rollStockRepository.findOne({
      where: { id: saved.id },
      relations: ["compoundCoding", "soldToCompany"],
    });
    return this.mapRollStockToDto(result!);
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
    return this.mapRollStockToDto(result!);
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
    return this.mapRollStockToDto(result!);
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
    return this.mapRollStockToDto(result!);
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
    return this.mapRollStockToDto(result!);
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

    const batches: RubberCompoundBatch[] = [];
    const supplierCocs: RubberSupplierCoc[] = [];

    if (roll.linkedBatchIds && roll.linkedBatchIds.length > 0) {
      const batchRecords = await this.compoundBatchRepository.find({
        where: { id: In(roll.linkedBatchIds) },
        relations: [
          "supplierCoc",
          "supplierCoc.supplierCompany",
          "compoundStock",
          "compoundStock.compoundCoding",
        ],
      });
      batches.push(...batchRecords);

      const cocIds = [...new Set(batchRecords.map((b) => b.supplierCocId))];
      if (cocIds.length > 0) {
        const cocRecords = await this.supplierCocRepository.find({
          where: { id: In(cocIds) },
          relations: ["supplierCompany"],
        });
        supplierCocs.push(...cocRecords);
      }
    }

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
          status: auCocRecord.status,
          statusLabel: auCocRecord.status,
          generatedPdfPath: auCocRecord.generatedPdfPath,
          sentToEmail: auCocRecord.sentToEmail,
          sentAt: auCocRecord.sentAt?.toISOString() ?? null,
          createdBy: auCocRecord.createdBy,
          notes: auCocRecord.notes,
          createdAt: auCocRecord.createdAt.toISOString(),
          updatedAt: auCocRecord.updatedAt.toISOString(),
        };
      }
    }

    return {
      roll: this.mapRollStockToDto(roll),
      batches: batches.map((b) => this.mapBatchToDto(b)),
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
      createdAt: roll.createdAt.toISOString(),
      updatedAt: roll.updatedAt.toISOString(),
    };
  }

  private mapBatchToDto(batch: RubberCompoundBatch): RubberCompoundBatchDto {
    return {
      id: batch.id,
      firebaseUid: batch.firebaseUid,
      supplierCocId: batch.supplierCocId,
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
        ? (coc.productionDate instanceof Date
            ? coc.productionDate.toISOString().split("T")[0]
            : String(coc.productionDate).split("T")[0])
        : null,
      compoundCode: coc.compoundCode,
      orderNumber: coc.orderNumber,
      ticketNumber: coc.ticketNumber,
      processingStatus: coc.processingStatus,
      processingStatusLabel: PROCESSING_STATUS_LABELS[coc.processingStatus],
      extractedData: coc.extractedData,
      createdBy: coc.createdBy,
      createdAt: coc.createdAt.toISOString(),
      updatedAt: coc.updatedAt.toISOString(),
    };
  }
}
