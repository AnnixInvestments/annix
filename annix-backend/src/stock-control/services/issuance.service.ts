import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { JobCard } from "../entities/job-card.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface ScanResult {
  type: "staff" | "stock_item" | "job_card";
  id: number;
  data: StaffMember | StockItem | JobCard;
}

export interface CreateIssuanceDto {
  issuerStaffId: number;
  recipientStaffId: number;
  stockItemId: number;
  jobCardId?: number | null;
  quantity: number;
  notes?: string | null;
}

export interface IssuanceItemDto {
  stockItemId: number;
  quantity: number;
}

export interface BatchIssuanceDto {
  issuerStaffId: number;
  recipientStaffId: number;
  jobCardId?: number | null;
  items: IssuanceItemDto[];
  notes?: string | null;
}

export interface BatchIssuanceResult {
  created: number;
  issuances: StockIssuance[];
  errors: Array<{ stockItemId: number; message: string }>;
}

export interface IssuanceFilters {
  startDate?: string;
  endDate?: string;
  staffId?: number;
  stockItemId?: number;
  jobCardId?: number;
}

@Injectable()
export class IssuanceService {
  private readonly logger = new Logger(IssuanceService.name);

  constructor(
    @InjectRepository(StockIssuance)
    private readonly issuanceRepo: Repository<StockIssuance>,
    @InjectRepository(StaffMember)
    private readonly staffRepo: Repository<StaffMember>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockAllocation)
    private readonly allocationRepo: Repository<StockAllocation>,
  ) {}

  async parseAndValidateQr(companyId: number, rawQr: string): Promise<ScanResult> {
    const trimmed = rawQr.trim();

    const jsonData = this.tryParseJsonQr(trimmed);

    if (trimmed.startsWith("staff:")) {
      const token = trimmed.substring(6);
      const staff = await this.staffRepo.findOne({
        where: { companyId, qrToken: token },
        relations: ["departmentEntity"],
      });

      if (!staff) {
        throw new NotFoundException("Staff member not found for QR token");
      }

      if (!staff.active) {
        throw new BadRequestException(`Staff member ${staff.name} is inactive`);
      }

      return { type: "staff", id: staff.id, data: staff };
    }

    if (trimmed.startsWith("stock:")) {
      const identifier = trimmed.substring(6);
      const stockItem = await this.findStockItem(companyId, identifier);

      if (!stockItem) {
        throw new NotFoundException(`Stock item not found for identifier: ${identifier}`);
      }

      return { type: "stock_item", id: stockItem.id, data: stockItem };
    }

    if (trimmed.startsWith("job:")) {
      const identifier = trimmed.substring(4);
      const jobCard = await this.findJobCard(companyId, identifier);

      if (!jobCard) {
        throw new NotFoundException(`Job card not found for identifier: ${identifier}`);
      }

      return { type: "job_card", id: jobCard.id, data: jobCard };
    }

    if (jsonData) {
      if (jsonData.id || jsonData.sku || jsonData.name) {
        const identifier = String(jsonData.id ?? jsonData.sku ?? jsonData.name);
        const stockItem = await this.findStockItem(companyId, identifier);
        if (stockItem) {
          return { type: "stock_item", id: stockItem.id, data: stockItem };
        }
      }

      if (jsonData.jobNumber || jsonData.job_number) {
        const identifier = String(jsonData.jobNumber ?? jsonData.job_number);
        const jobCard = await this.findJobCard(companyId, identifier);
        if (jobCard) {
          return { type: "job_card", id: jobCard.id, data: jobCard };
        }
      }
    }

    const staff = await this.staffRepo.findOne({
      where: { companyId, qrToken: trimmed },
      relations: ["departmentEntity"],
    });

    if (staff) {
      if (!staff.active) {
        throw new BadRequestException(`Staff member ${staff.name} is inactive`);
      }
      return { type: "staff", id: staff.id, data: staff };
    }

    const stockItem = await this.findStockItem(companyId, trimmed);
    if (stockItem) {
      return { type: "stock_item", id: stockItem.id, data: stockItem };
    }

    const jobCard = await this.findJobCard(companyId, trimmed);
    if (jobCard) {
      return { type: "job_card", id: jobCard.id, data: jobCard };
    }

    throw new NotFoundException(
      `No matching entity found for QR code: ${trimmed.substring(0, 50)}`,
    );
  }

  private tryParseJsonQr(input: string): Record<string, unknown> | null {
    let jsonStr = input;

    if (!jsonStr.startsWith("{")) {
      const braceIndex = input.indexOf("{");
      if (braceIndex >= 0) {
        jsonStr = input.substring(braceIndex);
      }
    }

    if (!jsonStr.endsWith("}")) {
      const lastBrace = jsonStr.lastIndexOf("}");
      if (lastBrace >= 0) {
        jsonStr = jsonStr.substring(0, lastBrace + 1);
      }
    }

    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }

  private async findStockItem(companyId: number, identifier: string): Promise<StockItem | null> {
    const cleanIdentifier = identifier.replace(/[{}"[\]]/g, "").trim();

    if (/^\d+$/.test(cleanIdentifier)) {
      const byId = await this.stockItemRepo
        .createQueryBuilder("si")
        .leftJoinAndSelect("si.locationEntity", "location")
        .where("si.companyId = :companyId", { companyId })
        .andWhere("si.id = :id", { id: parseInt(cleanIdentifier, 10) })
        .getOne();

      if (byId) return byId;
    }

    const bySku = await this.stockItemRepo
      .createQueryBuilder("si")
      .leftJoinAndSelect("si.locationEntity", "location")
      .where("si.companyId = :companyId", { companyId })
      .andWhere("LOWER(si.sku) = LOWER(:identifier)", { identifier: cleanIdentifier })
      .getOne();

    if (bySku) return bySku;

    return this.stockItemRepo
      .createQueryBuilder("si")
      .leftJoinAndSelect("si.locationEntity", "location")
      .where("si.companyId = :companyId", { companyId })
      .andWhere("LOWER(si.name) = LOWER(:identifier)", { identifier: cleanIdentifier })
      .getOne();
  }

  private async findJobCard(companyId: number, identifier: string): Promise<JobCard | null> {
    const byId = await this.jobCardRepo
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.id::text = :identifier", { identifier })
      .getOne();

    if (byId) return byId;

    return this.jobCardRepo
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("LOWER(jc.jobNumber) = LOWER(:identifier)", { identifier })
      .getOne();
  }

  async createIssuance(
    companyId: number,
    dto: CreateIssuanceDto,
    user: UserContext,
  ): Promise<StockIssuance> {
    const [issuer, recipient, stockItem, jobCard] = await Promise.all([
      this.staffRepo.findOne({ where: { id: dto.issuerStaffId, companyId } }),
      this.staffRepo.findOne({ where: { id: dto.recipientStaffId, companyId } }),
      this.stockItemRepo.findOne({ where: { id: dto.stockItemId, companyId } }),
      dto.jobCardId
        ? this.jobCardRepo.findOne({ where: { id: dto.jobCardId, companyId } })
        : Promise.resolve(null),
    ]);

    if (!issuer) {
      throw new NotFoundException("Issuer staff member not found");
    }

    if (!recipient) {
      throw new NotFoundException("Recipient staff member not found");
    }

    if (!stockItem) {
      throw new NotFoundException("Stock item not found");
    }

    if (dto.jobCardId && !jobCard) {
      throw new NotFoundException("Job card not found");
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    if (stockItem.quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${dto.quantity}`,
      );
    }

    const issuance = this.issuanceRepo.create({
      companyId,
      stockItemId: dto.stockItemId,
      issuerStaffId: dto.issuerStaffId,
      recipientStaffId: dto.recipientStaffId,
      jobCardId: dto.jobCardId ?? null,
      quantity: dto.quantity,
      notes: dto.notes ?? null,
      issuedByUserId: user.id,
      issuedByName: user.name,
      issuedAt: now().toJSDate(),
    });

    const savedIssuance = await this.issuanceRepo.save(issuance);

    stockItem.quantity = stockItem.quantity - dto.quantity;
    await this.stockItemRepo.save(stockItem);

    const movement = this.movementRepo.create({
      companyId,
      stockItem,
      movementType: MovementType.OUT,
      quantity: dto.quantity,
      referenceType: ReferenceType.ISSUANCE,
      referenceId: savedIssuance.id,
      notes: `Issued to ${recipient.name} by ${issuer.name}${jobCard ? ` for job ${jobCard.jobNumber}` : ""}`,
      createdBy: user.name,
    });

    await this.movementRepo.save(movement);

    if (jobCard) {
      const allocation = this.allocationRepo.create({
        stockItem,
        jobCard,
        quantityUsed: dto.quantity,
        notes: dto.notes ?? `Issued via mobile by ${issuer.name}`,
        allocatedBy: user.name,
        staffMemberId: dto.recipientStaffId,
        companyId,
        pendingApproval: false,
      });
      await this.allocationRepo.save(allocation);
      this.logger.log(`Stock allocation auto-created for job card ${jobCard.jobNumber}`);
    }

    this.logger.log(
      `Stock issuance created: ${dto.quantity}x ${stockItem.name} from ${issuer.name} to ${recipient.name}`,
    );

    return this.issuanceRepo.findOne({
      where: { id: savedIssuance.id },
      relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard", "issuedByUser"],
    }) as Promise<StockIssuance>;
  }

  async createBatchIssuance(
    companyId: number,
    dto: BatchIssuanceDto,
    user: UserContext,
  ): Promise<BatchIssuanceResult> {
    const result: BatchIssuanceResult = {
      created: 0,
      issuances: [],
      errors: [],
    };

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("At least one item is required");
    }

    const [issuer, recipient, jobCard] = await Promise.all([
      this.staffRepo.findOne({ where: { id: dto.issuerStaffId, companyId } }),
      this.staffRepo.findOne({ where: { id: dto.recipientStaffId, companyId } }),
      dto.jobCardId
        ? this.jobCardRepo.findOne({ where: { id: dto.jobCardId, companyId } })
        : Promise.resolve(null),
    ]);

    if (!issuer) {
      throw new NotFoundException("Issuer staff member not found");
    }

    if (!recipient) {
      throw new NotFoundException("Recipient staff member not found");
    }

    if (dto.jobCardId && !jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const issuedAt = now().toJSDate();

    for (const item of dto.items) {
      const stockItem = await this.stockItemRepo.findOne({
        where: { id: item.stockItemId, companyId },
      });

      if (!stockItem) {
        result.errors.push({ stockItemId: item.stockItemId, message: "Stock item not found" });
        continue;
      }

      if (item.quantity <= 0) {
        result.errors.push({
          stockItemId: item.stockItemId,
          message: "Quantity must be greater than 0",
        });
        continue;
      }

      if (stockItem.quantity < item.quantity) {
        result.errors.push({
          stockItemId: item.stockItemId,
          message: `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${item.quantity}`,
        });
        continue;
      }

      const issuance = this.issuanceRepo.create({
        companyId,
        stockItemId: item.stockItemId,
        issuerStaffId: dto.issuerStaffId,
        recipientStaffId: dto.recipientStaffId,
        jobCardId: dto.jobCardId ?? null,
        quantity: item.quantity,
        notes: dto.notes ?? null,
        issuedByUserId: user.id,
        issuedByName: user.name,
        issuedAt,
      });

      const savedIssuance = await this.issuanceRepo.save(issuance);

      stockItem.quantity = stockItem.quantity - item.quantity;
      await this.stockItemRepo.save(stockItem);

      const movement = this.movementRepo.create({
        companyId,
        stockItem,
        movementType: MovementType.OUT,
        quantity: item.quantity,
        referenceType: ReferenceType.ISSUANCE,
        referenceId: savedIssuance.id,
        notes: `Issued to ${recipient.name} by ${issuer.name}${jobCard ? ` for job ${jobCard.jobNumber}` : ""}`,
        createdBy: user.name,
      });

      await this.movementRepo.save(movement);

      if (jobCard) {
        const allocation = this.allocationRepo.create({
          stockItem,
          jobCard,
          quantityUsed: item.quantity,
          notes: dto.notes ?? `Issued via mobile by ${issuer.name}`,
          allocatedBy: user.name,
          staffMemberId: dto.recipientStaffId,
          companyId,
          pendingApproval: false,
        });
        await this.allocationRepo.save(allocation);
      }

      const fullIssuance = await this.issuanceRepo.findOne({
        where: { id: savedIssuance.id },
        relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard"],
      });

      if (fullIssuance) {
        result.issuances.push(fullIssuance);
        result.created++;
      }

      this.logger.log(
        `Stock issuance created: ${item.quantity}x ${stockItem.name} from ${issuer.name} to ${recipient.name}`,
      );
    }

    return result;
  }

  async findAll(companyId: number, filters?: IssuanceFilters): Promise<StockIssuance[]> {
    const qb = this.issuanceRepo
      .createQueryBuilder("issuance")
      .leftJoinAndSelect("issuance.stockItem", "stockItem")
      .leftJoinAndSelect("issuance.issuerStaff", "issuerStaff")
      .leftJoinAndSelect("issuance.recipientStaff", "recipientStaff")
      .leftJoinAndSelect("issuance.jobCard", "jobCard")
      .where("issuance.companyId = :companyId", { companyId })
      .orderBy("issuance.issuedAt", "DESC");

    if (filters?.startDate) {
      qb.andWhere("issuance.issuedAt >= :startDate", { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      qb.andWhere("issuance.issuedAt <= :endDate", { endDate: filters.endDate });
    }

    if (filters?.staffId) {
      qb.andWhere("(issuance.issuerStaffId = :staffId OR issuance.recipientStaffId = :staffId)", {
        staffId: filters.staffId,
      });
    }

    if (filters?.stockItemId) {
      qb.andWhere("issuance.stockItemId = :stockItemId", { stockItemId: filters.stockItemId });
    }

    if (filters?.jobCardId) {
      qb.andWhere("issuance.jobCardId = :jobCardId", { jobCardId: filters.jobCardId });
    }

    return qb.getMany();
  }

  async findById(companyId: number, id: number): Promise<StockIssuance> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id, companyId },
      relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard", "issuedByUser"],
    });

    if (!issuance) {
      throw new NotFoundException("Issuance not found");
    }

    return issuance;
  }
}
