import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, MoreThanOrEqual, Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { now } from "../../lib/datetime";
import { CoatDetail, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
import {
  IssuanceSession,
  IssuanceSessionScope,
  IssuanceSessionStatus,
} from "../entities/issuance-session.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardDataBook } from "../entities/job-card-data-book.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockAllocation } from "../entities/stock-allocation.entity";
import { StockIssuance } from "../entities/stock-issuance.entity";
import { StockItem } from "../entities/stock-item.entity";
import { MovementType, ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import { SupplierCertificate } from "../entities/supplier-certificate.entity";
import { CertificateService } from "./certificate.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface ScanResult {
  type: "staff" | "stock_item" | "job_card";
  id: number;
  data: StaffMember | StockItem | JobCard;
  alternatives?: Array<{
    id: number;
    sku: string;
    name: string;
    quantity: number;
    category: string | null;
  }>;
}

export interface CreateIssuanceDto {
  issuerStaffId: number;
  recipientStaffId: number;
  stockItemId: number;
  jobCardId?: number | null;
  quantity: number;
  notes?: string | null;
  batchNumber?: string | null;
}

export interface IssuanceItemDto {
  stockItemId: number;
  quantity: number;
  batchNumber?: string | null;
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
  cpoId?: number;
  sessionId?: number;
}

export interface CpoBatchSplitDto {
  jobCardId: number;
  quantity: number;
}

export interface CpoBatchItemDto {
  stockItemId: number;
  totalQuantity: number;
  batchNumber?: string | null;
  splits: CpoBatchSplitDto[];
}

export interface CpoBatchIssuanceDto {
  cpoId: number;
  jobCardIds: number[];
  issuerStaffId: number;
  recipientStaffId: number;
  items: CpoBatchItemDto[];
  notes?: string | null;
}

export interface CpoBatchIssuanceResult {
  sessionId: number;
  cpoId: number;
  created: number;
  issuances: StockIssuance[];
  warnings: string[];
}

export interface CpoBatchLineItem {
  id: number;
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  jtNo: string | null;
  quantity: number | null;
  m2: number | null;
}

export interface CpoBatchChildJobCard {
  id: number;
  jobNumber: string;
  jcNumber: string | null;
  jobName: string;
  status: string;
  extM2: number;
  intM2: number;
  coatingAnalysis: {
    id: number;
    status: string;
    coats: CoatDetail[];
  } | null;
  lineItems: CpoBatchLineItem[];
  lineItemCount: number;
}

export interface CpoBatchAggregateCoat {
  product: string;
  coatRole: string | null;
  litresRequired: number;
  alreadyAllocated: number;
  litresRemaining: number;
  stockItemId: number | null;
  stockItemName: string | null;
}

export interface CpoBatchIssueContext {
  cpo: {
    id: number;
    cpoNumber: string;
    jobName: string | null;
    customerName: string | null;
  };
  jobCards: CpoBatchChildJobCard[];
  aggregatedCoats: CpoBatchAggregateCoat[];
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
    @InjectRepository(IssuanceBatchRecord)
    private readonly batchRecordRepo: Repository<IssuanceBatchRecord>,
    @InjectRepository(SupplierCertificate)
    private readonly certRepo: Repository<SupplierCertificate>,
    @InjectRepository(JobCardDataBook)
    private readonly dataBookRepo: Repository<JobCardDataBook>,
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingAnalysisRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(IssuanceSession)
    private readonly sessionRepo: Repository<IssuanceSession>,
    @InjectRepository(CustomerPurchaseOrder)
    private readonly cpoRepo: Repository<CustomerPurchaseOrder>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationService: WorkflowNotificationService,
    private readonly certificateService: CertificateService,
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

      return this.stockItemResultWithAlternatives(companyId, stockItem);
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
          return this.stockItemResultWithAlternatives(companyId, stockItem);
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
      return this.stockItemResultWithAlternatives(companyId, stockItem);
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
    const trimmedStart = (() => {
      if (input.startsWith("{")) return input;
      const braceIndex = input.indexOf("{");
      return braceIndex >= 0 ? input.substring(braceIndex) : input;
    })();

    const jsonStr = (() => {
      if (trimmedStart.endsWith("}")) return trimmedStart;
      const lastBrace = trimmedStart.lastIndexOf("}");
      return lastBrace >= 0 ? trimmedStart.substring(0, lastBrace + 1) : trimmedStart;
    })();

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

  private async stockItemResultWithAlternatives(
    companyId: number,
    stockItem: StockItem,
  ): Promise<ScanResult> {
    const alternatives =
      Number(stockItem.quantity) <= 0
        ? await this.findSimilarItemsWithStock(companyId, stockItem)
        : [];
    return {
      type: "stock_item",
      id: stockItem.id,
      data: stockItem,
      ...(alternatives.length > 0 ? { alternatives } : {}),
    };
  }

  private async findSimilarItemsWithStock(
    companyId: number,
    item: StockItem,
  ): Promise<
    Array<{ id: number; sku: string; name: string; quantity: number; category: string | null }>
  > {
    const nameWords = item.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (nameWords.length === 0) return [];

    const conditions = nameWords.map((w) => `LOWER(si.name) LIKE '%${w.replace(/'/g, "''")}%'`);
    const whereClause = conditions.join(" OR ");

    const similar: Array<{
      id: number;
      sku: string;
      name: string;
      quantity: number;
      category: string | null;
    }> = await this.stockItemRepo
      .createQueryBuilder("si")
      .select(["si.id", "si.sku", "si.name", "si.quantity", "si.category"])
      .where("si.companyId = :companyId", { companyId })
      .andWhere("si.id != :excludeId", { excludeId: item.id })
      .andWhere("si.quantity > 0")
      .andWhere(`(${whereClause})`)
      .orderBy("si.quantity", "DESC")
      .take(5)
      .getMany();

    return similar.map((s) => ({
      id: s.id,
      sku: s.sku,
      name: s.name,
      quantity: Number(s.quantity),
      category: s.category,
    }));
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

    if (dto.quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stockItem = await queryRunner.manager.findOne(StockItem, {
        where: { id: dto.stockItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (!stockItem) {
        throw new NotFoundException("Stock item not found");
      }

      if (stockItem.quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${dto.quantity}`,
        );
      }

      if (jobCard) {
        const limitCheck = await this.checkCoatingAnalysisLimit(
          companyId,
          dto.jobCardId!,
          stockItem,
          dto.quantity,
        );

        if (limitCheck.requiresApproval) {
          await queryRunner.rollbackTransaction();
          this.sendOverAllocationNotification(
            companyId,
            dto.jobCardId!,
            stockItem.name,
            dto.quantity,
            limitCheck.allowedLitres ?? 0,
            limitCheck.alreadyAllocated,
          );
          throw new BadRequestException(
            `Stock limit reached for ${stockItem.name}. Authorized: ${limitCheck.allowedLitres}L, Already issued: ${limitCheck.alreadyAllocated}L, Requested: ${dto.quantity}L. Admin Manager has been notified for authorization.`,
          );
        }
      }

      const issuance = queryRunner.manager.create(StockIssuance, {
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

      const savedIssuance = await queryRunner.manager.save(StockIssuance, issuance);

      stockItem.quantity = stockItem.quantity - dto.quantity;
      await queryRunner.manager.save(StockItem, stockItem);

      const movement = queryRunner.manager.create(StockMovement, {
        companyId,
        stockItem,
        movementType: MovementType.OUT,
        quantity: dto.quantity,
        referenceType: ReferenceType.ISSUANCE,
        referenceId: savedIssuance.id,
        notes: `${recipient.name}${jobCard ? ` — job ${jobCard.jobNumber}` : ""}`,
        createdBy: user.name,
      });

      await queryRunner.manager.save(StockMovement, movement);

      if (jobCard) {
        const allocation = queryRunner.manager.create(StockAllocation, {
          stockItem,
          jobCard,
          quantityUsed: dto.quantity,
          notes: dto.notes ?? `Issued via mobile by ${issuer.name}`,
          allocatedBy: user.name,
          staffMemberId: dto.recipientStaffId,
          companyId,
          pendingApproval: false,
        });
        await queryRunner.manager.save(StockAllocation, allocation);
        this.logger.log(`Stock allocation auto-created for job card ${jobCard.jobNumber}`);
      }

      await queryRunner.commitTransaction();

      if (dto.batchNumber) {
        await this.createBatchRecord(
          companyId,
          savedIssuance.id,
          dto.stockItemId,
          dto.jobCardId ?? null,
          dto.batchNumber,
          dto.quantity,
        );
      }

      if (dto.jobCardId) {
        await this.markDataBookStale(companyId, dto.jobCardId);
      }

      this.auditService
        .log({
          entityType: "stock_issuance",
          entityId: savedIssuance.id,
          action: AuditAction.CREATE,
          newValues: {
            stockItemId: dto.stockItemId,
            quantity: dto.quantity,
            jobCardId: dto.jobCardId ?? null,
            issuedBy: user.name,
            recipientStaffId: dto.recipientStaffId,
          },
        })
        .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

      this.logger.log(
        `Stock issuance created: ${dto.quantity}x ${stockItem.name} from ${issuer.name} to ${recipient.name}`,
      );

      const fullIssuance = await this.issuanceRepo.findOne({
        where: { id: savedIssuance.id },
        relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard", "issuedByUser"],
      });

      if (!fullIssuance) {
        throw new NotFoundException(`Issuance ${savedIssuance.id} not found after creation`);
      }

      return fullIssuance;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async createBatchIssuance(
    companyId: number,
    dto: BatchIssuanceDto,
    user: UserContext,
  ): Promise<BatchIssuanceResult> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("At least one item is required");
    }

    const duplicateWindow = now().minus({ seconds: 5 }).toJSDate();
    const recentDuplicate = await this.issuanceRepo.findOne({
      where: {
        companyId,
        issuerStaffId: dto.issuerStaffId,
        recipientStaffId: dto.recipientStaffId,
        stockItemId: dto.items[0].stockItemId,
        quantity: dto.items[0].quantity,
        issuedAt: MoreThanOrEqual(duplicateWindow),
        undone: false,
      },
      order: { issuedAt: "DESC" },
    });

    if (recentDuplicate) {
      this.logger.warn(
        `Duplicate batch issuance blocked: same issuer/recipient/item within 5s (existing #${recentDuplicate.id})`,
      );
      const existingIssuances = await this.issuanceRepo.find({
        where: {
          companyId,
          issuerStaffId: dto.issuerStaffId,
          recipientStaffId: dto.recipientStaffId,
          issuedAt: MoreThanOrEqual(duplicateWindow),
          undone: false,
        },
        relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard"],
      });
      return { created: existingIssuances.length, issuances: existingIssuances, errors: [] };
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const initialResult: BatchIssuanceResult = {
        created: 0,
        issuances: [],
        errors: [],
      };

      const issuedAt = now().toJSDate();
      const stockItemIds = dto.items.map((item) => item.stockItemId);
      const stockItems = await queryRunner.manager.find(StockItem, {
        where: { id: In(stockItemIds), companyId },
        lock: { mode: "pessimistic_write" },
      });
      const stockItemMap = new Map(stockItems.map((si) => [si.id, si]));

      const result = await dto.items.reduce(async (accPromise, item) => {
        const acc = await accPromise;
        const stockItem = stockItemMap.get(item.stockItemId) ?? null;

        if (!stockItem) {
          return {
            ...acc,
            errors: [
              ...acc.errors,
              { stockItemId: item.stockItemId, message: "Stock item not found" },
            ],
          };
        }

        if (item.quantity <= 0) {
          return {
            ...acc,
            errors: [
              ...acc.errors,
              { stockItemId: item.stockItemId, message: "Quantity must be greater than 0" },
            ],
          };
        }

        if (stockItem.quantity < item.quantity) {
          return {
            ...acc,
            errors: [
              ...acc.errors,
              {
                stockItemId: item.stockItemId,
                message: `Insufficient stock. Available: ${stockItem.quantity}, Requested: ${item.quantity}`,
              },
            ],
          };
        }

        if (jobCard) {
          const limitCheck = await this.checkCoatingAnalysisLimit(
            companyId,
            dto.jobCardId!,
            stockItem,
            item.quantity,
          );

          if (limitCheck.requiresApproval) {
            this.sendOverAllocationNotification(
              companyId,
              dto.jobCardId!,
              stockItem.name,
              item.quantity,
              limitCheck.allowedLitres ?? 0,
              limitCheck.alreadyAllocated,
            );
            return {
              ...acc,
              errors: [
                ...acc.errors,
                {
                  stockItemId: item.stockItemId,
                  message: `Stock limit reached for ${stockItem.name}. Authorized: ${limitCheck.allowedLitres}L, Already issued: ${limitCheck.alreadyAllocated}L, Requested: ${item.quantity}L. Admin Manager has been notified.`,
                },
              ],
            };
          }
        }

        const issuance = queryRunner.manager.create(StockIssuance, {
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

        const savedIssuance = await queryRunner.manager.save(StockIssuance, issuance);

        stockItem.quantity = stockItem.quantity - item.quantity;
        await queryRunner.manager.save(StockItem, stockItem);

        const movement = queryRunner.manager.create(StockMovement, {
          companyId,
          stockItem,
          movementType: MovementType.OUT,
          quantity: item.quantity,
          referenceType: ReferenceType.ISSUANCE,
          referenceId: savedIssuance.id,
          notes: `${recipient.name}${jobCard ? ` — job ${jobCard.jobNumber}` : ""}`,
          createdBy: user.name,
        });

        await queryRunner.manager.save(StockMovement, movement);

        if (jobCard) {
          const allocation = queryRunner.manager.create(StockAllocation, {
            stockItem,
            jobCard,
            quantityUsed: item.quantity,
            notes: dto.notes ?? `Issued via mobile by ${issuer.name}`,
            allocatedBy: user.name,
            staffMemberId: dto.recipientStaffId,
            companyId,
            pendingApproval: false,
          });
          await queryRunner.manager.save(StockAllocation, allocation);
        }

        this.logger.log(
          `Stock issuance created: ${item.quantity}x ${stockItem.name} from ${issuer.name} to ${recipient.name}`,
        );

        return {
          ...acc,
          created: acc.created + 1,
          issuances: [...acc.issuances, savedIssuance],
        };
      }, Promise.resolve(initialResult));

      await queryRunner.commitTransaction();

      await dto.items
        .filter((item) => item.batchNumber)
        .reduce(async (prev, item) => {
          await prev;
          const matchingIssuance = result.issuances.find((i) => i.stockItemId === item.stockItemId);
          if (matchingIssuance) {
            await this.createBatchRecord(
              companyId,
              matchingIssuance.id,
              item.stockItemId,
              dto.jobCardId ?? null,
              item.batchNumber!,
              item.quantity,
            );
          }
        }, Promise.resolve());

      if (dto.jobCardId && result.created > 0) {
        await this.markDataBookStale(companyId, dto.jobCardId);
      }

      const fullIssuances = await this.issuanceRepo.find({
        where: { id: In(result.issuances.map((i) => i.id)) },
        relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard"],
      });

      return { ...result, issuances: fullIssuances };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    companyId: number,
    filters?: IssuanceFilters,
    page: number = 1,
    limit: number = 50,
  ): Promise<StockIssuance[]> {
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

    return qb
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
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

  async undoIssuance(companyId: number, id: number, user: UserContext): Promise<StockIssuance> {
    const issuance = await this.issuanceRepo.findOne({
      where: { id, companyId },
      relations: ["stockItem"],
    });

    if (!issuance) {
      throw new NotFoundException("Issuance not found");
    }

    if (issuance.undone) {
      throw new BadRequestException("This issuance has already been undone");
    }

    const fiveMinutesAgo = now().minus({ minutes: 5 }).toJSDate();
    if (issuance.issuedAt < fiveMinutesAgo) {
      throw new BadRequestException("Issuances can only be undone within 5 minutes of creation");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      issuance.undone = true;
      issuance.undoneAt = now().toJSDate();
      issuance.undoneByName = user.name;
      await queryRunner.manager.save(StockIssuance, issuance);

      const stockItem = await queryRunner.manager.findOne(StockItem, {
        where: { id: issuance.stockItemId, companyId },
        lock: { mode: "pessimistic_write" },
      });

      if (stockItem) {
        stockItem.quantity = stockItem.quantity + issuance.quantity;
        await queryRunner.manager.save(StockItem, stockItem);
      }

      const movement = queryRunner.manager.create(StockMovement, {
        companyId,
        stockItem: stockItem ?? undefined,
        movementType: MovementType.IN,
        quantity: issuance.quantity,
        referenceType: ReferenceType.ISSUANCE,
        referenceId: issuance.id,
        notes: `Undo issuance #${issuance.id} by ${user.name}`,
        createdBy: user.name,
      });
      await queryRunner.manager.save(StockMovement, movement);

      if (issuance.jobCardId) {
        const allocation = await queryRunner.manager.findOne(StockAllocation, {
          where: {
            companyId,
            jobCard: { id: issuance.jobCardId },
            stockItem: { id: issuance.stockItemId },
            staffMemberId: issuance.recipientStaffId,
          },
        });

        if (allocation) {
          await queryRunner.manager.remove(StockAllocation, allocation);
        }
      }

      await queryRunner.commitTransaction();

      this.auditService
        .log({
          entityType: "stock_issuance",
          entityId: id,
          action: AuditAction.DELETE,
          oldValues: {
            stockItemId: issuance.stockItemId,
            quantity: issuance.quantity,
            jobCardId: issuance.jobCardId,
          },
          newValues: { undone: true, undoneBy: user.name },
        })
        .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

      this.logger.log(`Issuance #${id} undone by ${user.name}`);

      const fullIssuance = await this.issuanceRepo.findOne({
        where: { id },
        relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard"],
      });

      if (!fullIssuance) {
        throw new NotFoundException("Issuance not found after undo");
      }

      return fullIssuance;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async recentByUser(companyId: number, limit = 20): Promise<StockIssuance[]> {
    const oneDayAgo = now().minus({ hours: 24 }).toJSDate();

    return this.issuanceRepo.find({
      where: {
        companyId,
        undone: false,
        issuedAt: MoreThanOrEqual(oneDayAgo),
      },
      relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard"],
      order: { issuedAt: "DESC" },
      take: limit,
    });
  }

  private async createBatchRecord(
    companyId: number,
    issuanceId: number,
    stockItemId: number,
    jobCardId: number | null,
    batchNumber: string,
    quantity: number,
  ): Promise<void> {
    const trimmedBatch = batchNumber.trim();

    const matchingCert = await this.certificateService.findMatchingCertificate(
      companyId,
      trimmedBatch,
    );

    if (matchingCert && jobCardId && !matchingCert.jobCardId) {
      await this.certRepo.update(matchingCert.id, { jobCardId });
      this.logger.log(`Linked certificate ${matchingCert.id} to job card ${jobCardId}`);
    }

    if (matchingCert && !matchingCert.stockItemId) {
      await this.certRepo.update(matchingCert.id, { stockItemId });
    }

    const batchRecord = this.batchRecordRepo.create({
      companyId,
      stockIssuanceId: issuanceId,
      stockItemId,
      jobCardId,
      batchNumber: trimmedBatch,
      quantity,
      supplierCertificateId: matchingCert?.id || null,
    });

    await this.batchRecordRepo.save(batchRecord);

    this.logger.log(
      `Batch record created: batch=${trimmedBatch} issuance=${issuanceId} cert=${matchingCert?.id || "none"}`,
    );
  }

  private async markDataBookStale(companyId: number, jobCardId: number): Promise<void> {
    const dataBook = await this.dataBookRepo.findOne({
      where: { companyId, jobCardId },
      order: { generatedAt: "DESC" },
    });

    if (dataBook && !dataBook.isStale) {
      dataBook.isStale = true;
      await this.dataBookRepo.save(dataBook);
      this.logger.log(`Data book marked stale for job card ${jobCardId}`);
    }
  }

  private async checkCoatingAnalysisLimit(
    companyId: number,
    jobCardId: number,
    stockItem: StockItem,
    quantityRequested: number,
  ): Promise<{
    requiresApproval: boolean;
    allowedLitres: number | null;
    alreadyAllocated: number;
  }> {
    const coatingAnalysis = await this.coatingAnalysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!coatingAnalysis?.coats || coatingAnalysis.coats.length === 0) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0 };
    }

    const matchingCoat = this.fuzzyMatchCoat(stockItem.name, coatingAnalysis.coats);
    if (!matchingCoat) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0 };
    }

    const existingAllocations = await this.allocationRepo.find({
      where: {
        jobCardId,
        stockItemId: stockItem.id,
        companyId,
        undone: false,
        rejectedAt: IsNull(),
      },
    });

    const alreadyAllocated = existingAllocations.reduce(
      (sum, alloc) => sum + Number(alloc.quantityUsed),
      0,
    );
    const totalAfterAllocation = alreadyAllocated + quantityRequested;
    const allowedLitres = matchingCoat.litersRequired;

    if (totalAfterAllocation > allowedLitres) {
      return { requiresApproval: true, allowedLitres, alreadyAllocated };
    }

    return { requiresApproval: false, allowedLitres, alreadyAllocated };
  }

  private fuzzyMatchCoat(stockItemName: string, coats: CoatDetail[]): CoatDetail | null {
    const normalised = stockItemName.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalised.split(" ");

    const scored = coats
      .map((coat) => {
        const coatName = coat.product.toLowerCase().replace(/\s+/g, " ").trim();
        const matchingWords = words.filter((word) => coatName.includes(word));
        return { coat, score: matchingWords.length / words.length };
      })
      .filter((entry) => entry.score >= 0.4)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].coat : null;
  }

  private sendOverAllocationNotification(
    companyId: number,
    jobCardId: number,
    productName: string,
    quantityRequested: number,
    allowedLitres: number,
    alreadyAllocated: number,
  ): void {
    this.notificationService
      .notifyOverAllocationApproval(
        companyId,
        jobCardId,
        0,
        productName,
        quantityRequested,
        allowedLitres,
        alreadyAllocated,
      )
      .catch((err) =>
        this.logger.error(`Failed to send over-allocation notification: ${err.message}`),
      );
  }

  async cpoBatchIssueContext(companyId: number, cpoId: number): Promise<CpoBatchIssueContext> {
    const cpo = await this.cpoRepo.findOne({ where: { id: cpoId, companyId } });
    if (!cpo) {
      throw new NotFoundException(`CPO ${cpoId} not found`);
    }

    const jobCards = await this.jobCardRepo
      .createQueryBuilder("jc")
      .leftJoinAndSelect("jc.lineItems", "lineItems")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.cpoId = :cpoId", { cpoId })
      .andWhere("jc.supersededById IS NULL")
      .andWhere("jc.status IN (:...statuses)", { statuses: ["draft", "active"] })
      .orderBy("jc.jcNumber", "ASC")
      .addOrderBy("jc.id", "ASC")
      .getMany();

    if (jobCards.length === 0) {
      return {
        cpo: {
          id: cpo.id,
          cpoNumber: cpo.cpoNumber,
          jobName: cpo.jobName,
          customerName: cpo.customerName,
        },
        jobCards: [],
        aggregatedCoats: [],
      };
    }

    const jobCardIds = jobCards.map((jc) => jc.id);
    const analyses = await this.coatingAnalysisRepo.find({
      where: { jobCardId: In(jobCardIds), companyId },
    });
    const analysisByJc = new Map(analyses.map((a) => [a.jobCardId, a]));

    const childJobCards: CpoBatchChildJobCard[] = jobCards.map((jc) => {
      const analysis = analysisByJc.get(jc.id) ?? null;
      const lineItems = (jc.lineItems ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((li) => ({
          id: li.id,
          itemCode: li.itemCode,
          itemDescription: li.itemDescription,
          itemNo: li.itemNo,
          jtNo: li.jtNo,
          quantity: li.quantity !== null ? Number(li.quantity) : null,
          m2: li.m2 !== null ? Number(li.m2) : null,
        }));
      const nonBandingCoats = analysis
        ? this.stripBandingCoats(analysis.coats ?? [], analysis.rawNotes)
        : [];
      return {
        id: jc.id,
        jobNumber: jc.jobNumber,
        jcNumber: jc.jcNumber,
        jobName: jc.jobName,
        status: jc.status,
        extM2: analysis ? Number(analysis.extM2) : 0,
        intM2: analysis ? Number(analysis.intM2) : 0,
        coatingAnalysis: analysis
          ? {
              id: analysis.id,
              status: analysis.status,
              coats: nonBandingCoats,
            }
          : null,
        lineItems,
        lineItemCount: lineItems.length,
      };
    });

    const aggregatedCoats = this.aggregateCoatsAcrossJobCards(analyses);

    const stockItems = await this.stockItemRepo.find({ where: { companyId } });
    const aggregatedWithStock = await Promise.all(
      aggregatedCoats.map(async (aggregate) => {
        const matched = this.fuzzyMatchStockItemByName(aggregate.product, stockItems);
        const alreadyAllocated = matched
          ? await this.alreadyAllocatedAcrossJobCards(companyId, jobCardIds, matched.id)
          : 0;
        return {
          ...aggregate,
          alreadyAllocated,
          litresRemaining: Math.max(0, aggregate.litresRequired - alreadyAllocated),
          stockItemId: matched?.id ?? null,
          stockItemName: matched?.name ?? null,
        };
      }),
    );

    return {
      cpo: {
        id: cpo.id,
        cpoNumber: cpo.cpoNumber,
        jobName: cpo.jobName,
        customerName: cpo.customerName,
      },
      jobCards: childJobCards,
      aggregatedCoats: aggregatedWithStock,
    };
  }

  private isBandingCoat(productName: string, rawNotes: string | null): boolean {
    const productUpper = productName.toUpperCase();
    if (!rawNotes) {
      return productUpper.includes("BANDING");
    }
    const notesUpper = rawNotes.toUpperCase();
    const bandingIdx = notesUpper.indexOf("BANDING");
    if (bandingIdx < 0) {
      return productUpper.includes("BANDING");
    }
    const afterBanding = notesUpper.substring(bandingIdx);
    return afterBanding.includes(productUpper);
  }

  private stripBandingCoats(coats: CoatDetail[], rawNotes: string | null): CoatDetail[] {
    return coats.filter((coat) => !this.isBandingCoat(coat.product, rawNotes));
  }

  private aggregateCoatsAcrossJobCards(
    analyses: JobCardCoatingAnalysis[],
  ): CpoBatchAggregateCoat[] {
    const byProduct = analyses.reduce((acc, analysis) => {
      const coats = this.stripBandingCoats(analysis.coats ?? [], analysis.rawNotes);
      return coats.reduce((innerAcc, coat) => {
        const key = coat.product.trim().toLowerCase();
        const existing = innerAcc.get(key);
        if (existing) {
          innerAcc.set(key, {
            ...existing,
            litresRequired: existing.litresRequired + Number(coat.litersRequired ?? 0),
          });
        } else {
          innerAcc.set(key, {
            product: coat.product,
            coatRole: coat.coatRole ?? null,
            litresRequired: Number(coat.litersRequired ?? 0),
            alreadyAllocated: 0,
            litresRemaining: 0,
            stockItemId: null,
            stockItemName: null,
          });
        }
        return innerAcc;
      }, acc);
    }, new Map<string, CpoBatchAggregateCoat>());

    return Array.from(byProduct.values()).sort((a, b) => a.product.localeCompare(b.product));
  }

  private async alreadyAllocatedAcrossJobCards(
    companyId: number,
    jobCardIds: number[],
    stockItemId: number,
  ): Promise<number> {
    if (jobCardIds.length === 0) return 0;
    const allocations = await this.allocationRepo.find({
      where: {
        companyId,
        stockItemId,
        jobCardId: In(jobCardIds),
        undone: false,
        rejectedAt: IsNull(),
      },
    });
    return allocations.reduce((sum, a) => sum + Number(a.quantityUsed), 0);
  }

  private fuzzyMatchStockItemByName(
    productName: string,
    stockItems: StockItem[],
  ): StockItem | null {
    const normalised = productName.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalised.split(" ").filter((w) => w.length > 2);
    if (words.length === 0) return null;

    const scored = stockItems
      .filter((si) => !si.isLeftover)
      .map((item) => {
        const itemName = item.name.toLowerCase().replace(/\s+/g, " ").trim();
        const matchingWords = words.filter((w) => itemName.includes(w));
        return { item, score: matchingWords.length / words.length };
      })
      .filter((entry) => entry.score >= 0.4)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].item : null;
  }

  async checkCpoBatchCoatingLimit(
    companyId: number,
    jobCardIds: number[],
    stockItem: StockItem,
    quantityRequested: number,
  ): Promise<{
    requiresApproval: boolean;
    allowedLitres: number | null;
    alreadyAllocated: number;
    perJobCard: Array<{ jobCardId: number; matchedCoat: string | null; litresRequired: number }>;
  }> {
    if (jobCardIds.length === 0) {
      return {
        requiresApproval: false,
        allowedLitres: null,
        alreadyAllocated: 0,
        perJobCard: [],
      };
    }

    const analyses = await this.coatingAnalysisRepo.find({
      where: { jobCardId: In(jobCardIds), companyId },
    });

    const perJobCard = analyses.map((analysis) => {
      const nonBandingCoats = this.stripBandingCoats(analysis.coats ?? [], analysis.rawNotes);
      const matchingCoat = this.fuzzyMatchCoat(stockItem.name, nonBandingCoats);
      return {
        jobCardId: analysis.jobCardId,
        matchedCoat: matchingCoat?.product ?? null,
        litresRequired: matchingCoat ? Number(matchingCoat.litersRequired) : 0,
      };
    });

    const anyMatched = perJobCard.some((p) => p.matchedCoat !== null);
    if (!anyMatched) {
      return { requiresApproval: false, allowedLitres: null, alreadyAllocated: 0, perJobCard };
    }

    const allowedLitres = perJobCard.reduce((sum, p) => sum + p.litresRequired, 0);
    const alreadyAllocated = await this.alreadyAllocatedAcrossJobCards(
      companyId,
      jobCardIds,
      stockItem.id,
    );

    const totalAfter = alreadyAllocated + quantityRequested;
    return {
      requiresApproval: totalAfter > allowedLitres,
      allowedLitres,
      alreadyAllocated,
      perJobCard,
    };
  }

  async createCpoBatchIssuance(
    companyId: number,
    dto: CpoBatchIssuanceDto,
    user: UserContext,
  ): Promise<CpoBatchIssuanceResult> {
    this.validateCpoBatchDto(dto);

    const cpo = await this.cpoRepo.findOne({ where: { id: dto.cpoId, companyId } });
    if (!cpo) {
      throw new NotFoundException(`CPO ${dto.cpoId} not found`);
    }

    const [issuer, recipient] = await Promise.all([
      this.staffRepo.findOne({ where: { id: dto.issuerStaffId, companyId } }),
      this.staffRepo.findOne({ where: { id: dto.recipientStaffId, companyId } }),
    ]);

    if (!issuer) {
      throw new NotFoundException("Issuer staff member not found");
    }
    if (!recipient) {
      throw new NotFoundException("Recipient staff member not found");
    }

    const jobCards = await this.jobCardRepo.find({
      where: { id: In(dto.jobCardIds), companyId, cpoId: dto.cpoId },
    });

    if (jobCards.length !== dto.jobCardIds.length) {
      const foundIds = jobCards.map((jc) => jc.id);
      const missing = dto.jobCardIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Job cards not found or not linked to CPO ${cpo.cpoNumber}: ${missing.join(", ")}`,
      );
    }

    const jobCardMap = new Map(jobCards.map((jc) => [jc.id, jc]));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const session = queryRunner.manager.create(IssuanceSession, {
        companyId,
        cpoId: dto.cpoId,
        issuerStaffId: dto.issuerStaffId,
        recipientStaffId: dto.recipientStaffId,
        scope: IssuanceSessionScope.CPO_BATCH,
        status: IssuanceSessionStatus.ACTIVE,
        jobCardIds: dto.jobCardIds,
        notes: dto.notes ?? null,
        issuedByUserId: user.id,
        issuedByName: user.name,
        issuedAt: now().toJSDate(),
      });
      const savedSession = await queryRunner.manager.save(IssuanceSession, session);

      const stockItemIds = dto.items.map((item) => item.stockItemId);
      const stockItems = await queryRunner.manager.find(StockItem, {
        where: { id: In(stockItemIds), companyId },
        lock: { mode: "pessimistic_write" },
      });
      const stockItemMap = new Map(stockItems.map((si) => [si.id, si]));

      const warnings: string[] = [];
      const allIssuances: StockIssuance[] = [];

      const itemProcessing = dto.items.reduce(
        async (accPromise, item) => {
          const acc = await accPromise;
          const stockItem = stockItemMap.get(item.stockItemId);
          if (!stockItem) {
            throw new NotFoundException(`Stock item ${item.stockItemId} not found`);
          }

          if (Number(stockItem.quantity) < item.totalQuantity) {
            throw new BadRequestException(
              `Insufficient stock for ${stockItem.name}. Available: ${stockItem.quantity}, Requested: ${item.totalQuantity}`,
            );
          }

          const limitCheck = await this.checkCpoBatchCoatingLimit(
            companyId,
            dto.jobCardIds,
            stockItem,
            item.totalQuantity,
          );

          if (limitCheck.requiresApproval) {
            savedSession.status = IssuanceSessionStatus.PENDING_APPROVAL;
            warnings.push(
              `${stockItem.name}: requested ${item.totalQuantity}L exceeds aggregated limit ${limitCheck.allowedLitres}L across ${dto.jobCardIds.length} JCs (already allocated ${limitCheck.alreadyAllocated}L)`,
            );
            this.sendCpoBatchOverAllocationNotification(
              companyId,
              savedSession.id,
              dto.cpoId,
              stockItem.name,
              item.totalQuantity,
              limitCheck.allowedLitres ?? 0,
              limitCheck.alreadyAllocated,
            );
          }

          stockItem.quantity = Number(stockItem.quantity) - item.totalQuantity;
          await queryRunner.manager.save(StockItem, stockItem);

          const perSplitIssuances = await item.splits.reduce(
            async (splitAccPromise, split) => {
              const splitAcc = await splitAccPromise;
              const jobCard = jobCardMap.get(split.jobCardId);
              if (!jobCard) {
                throw new BadRequestException(
                  `Split references job card ${split.jobCardId} which is not part of this CPO batch`,
                );
              }

              const issuance = queryRunner.manager.create(StockIssuance, {
                companyId,
                stockItemId: item.stockItemId,
                issuerStaffId: dto.issuerStaffId,
                recipientStaffId: dto.recipientStaffId,
                jobCardId: split.jobCardId,
                sessionId: savedSession.id,
                cpoId: dto.cpoId,
                quantity: split.quantity,
                notes: dto.notes ?? null,
                issuedByUserId: user.id,
                issuedByName: user.name,
                issuedAt: savedSession.issuedAt,
              });
              const savedIssuance = await queryRunner.manager.save(StockIssuance, issuance);

              const movement = queryRunner.manager.create(StockMovement, {
                companyId,
                stockItem,
                movementType: MovementType.OUT,
                quantity: split.quantity,
                referenceType: ReferenceType.ISSUANCE,
                referenceId: savedIssuance.id,
                notes: `${recipient.name} — job ${jobCard.jobNumber} (CPO ${cpo.cpoNumber} batch session #${savedSession.id})`,
                createdBy: user.name,
              });
              await queryRunner.manager.save(StockMovement, movement);

              const allocation = queryRunner.manager.create(StockAllocation, {
                stockItem,
                jobCard,
                quantityUsed: split.quantity,
                notes:
                  dto.notes ?? `Issued via CPO batch session #${savedSession.id} by ${issuer.name}`,
                allocatedBy: user.name,
                staffMemberId: dto.recipientStaffId,
                companyId,
                pendingApproval: savedSession.status === IssuanceSessionStatus.PENDING_APPROVAL,
              });
              await queryRunner.manager.save(StockAllocation, allocation);

              return [...splitAcc, savedIssuance];
            },
            Promise.resolve([] as StockIssuance[]),
          );

          return [...acc, ...perSplitIssuances];
        },
        Promise.resolve([] as StockIssuance[]),
      );

      const issuances = await itemProcessing;
      allIssuances.push(...issuances);

      if (savedSession.status === IssuanceSessionStatus.PENDING_APPROVAL) {
        await queryRunner.manager.save(IssuanceSession, savedSession);
      }

      await queryRunner.commitTransaction();

      await dto.items
        .filter((item) => item.batchNumber)
        .reduce(async (prev, item) => {
          await prev;
          const matchingIssuances = allIssuances.filter((i) => i.stockItemId === item.stockItemId);
          await matchingIssuances.reduce(async (inner, issuance) => {
            await inner;
            await this.createCpoBatchRecord(
              companyId,
              issuance.id,
              item.stockItemId,
              issuance.jobCardId,
              savedSession.id,
              dto.cpoId,
              item.batchNumber!,
              issuance.quantity,
            );
          }, Promise.resolve());
        }, Promise.resolve());

      await dto.jobCardIds.reduce(async (prev, jcId) => {
        await prev;
        await this.markDataBookStale(companyId, jcId);
      }, Promise.resolve());

      this.auditService
        .log({
          entityType: "issuance_session",
          entityId: savedSession.id,
          action: AuditAction.CREATE,
          newValues: {
            cpoId: dto.cpoId,
            jobCardIds: dto.jobCardIds,
            itemCount: dto.items.length,
            scope: IssuanceSessionScope.CPO_BATCH,
            status: savedSession.status,
            issuedBy: user.name,
          },
        })
        .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

      this.logger.log(
        `CPO batch issuance session #${savedSession.id} created: ${allIssuances.length} issuances across ${dto.jobCardIds.length} JCs for CPO ${cpo.cpoNumber}`,
      );

      const fullIssuances = await this.issuanceRepo.find({
        where: { id: In(allIssuances.map((i) => i.id)) },
        relations: ["stockItem", "issuerStaff", "recipientStaff", "jobCard"],
      });

      return {
        sessionId: savedSession.id,
        cpoId: dto.cpoId,
        created: fullIssuances.length,
        issuances: fullIssuances,
        warnings,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private validateCpoBatchDto(dto: CpoBatchIssuanceDto): void {
    if (!dto.cpoId) {
      throw new BadRequestException("cpoId is required");
    }
    if (!dto.jobCardIds || dto.jobCardIds.length === 0) {
      throw new BadRequestException("At least one job card is required");
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("At least one item is required");
    }

    dto.items.forEach((item) => {
      if (item.totalQuantity <= 0) {
        throw new BadRequestException(
          `Item ${item.stockItemId}: totalQuantity must be greater than 0`,
        );
      }
      if (!item.splits || item.splits.length === 0) {
        throw new BadRequestException(`Item ${item.stockItemId}: at least one split is required`);
      }
      const splitSum = item.splits.reduce((sum, split) => sum + split.quantity, 0);
      if (Math.abs(splitSum - item.totalQuantity) > 0.001) {
        throw new BadRequestException(
          `Item ${item.stockItemId}: split sum ${splitSum} does not equal totalQuantity ${item.totalQuantity}`,
        );
      }
      item.splits.forEach((split) => {
        if (!dto.jobCardIds.includes(split.jobCardId)) {
          throw new BadRequestException(
            `Item ${item.stockItemId}: split references job card ${split.jobCardId} which is not in the session`,
          );
        }
        if (split.quantity <= 0) {
          throw new BadRequestException(
            `Item ${item.stockItemId}: split quantity must be greater than 0`,
          );
        }
      });
    });
  }

  private async createCpoBatchRecord(
    companyId: number,
    issuanceId: number,
    stockItemId: number,
    jobCardId: number | null,
    sessionId: number,
    cpoId: number,
    batchNumber: string,
    quantity: number,
  ): Promise<void> {
    const trimmedBatch = batchNumber.trim();
    const matchingCert = await this.certificateService.findMatchingCertificate(
      companyId,
      trimmedBatch,
    );

    if (matchingCert && jobCardId && !matchingCert.jobCardId) {
      await this.certRepo.update(matchingCert.id, { jobCardId });
    }
    if (matchingCert && !matchingCert.stockItemId) {
      await this.certRepo.update(matchingCert.id, { stockItemId });
    }

    const batchRecord = this.batchRecordRepo.create({
      companyId,
      stockIssuanceId: issuanceId,
      stockItemId,
      jobCardId,
      sessionId,
      cpoId,
      batchNumber: trimmedBatch,
      quantity,
      supplierCertificateId: matchingCert?.id || null,
    });
    await this.batchRecordRepo.save(batchRecord);
  }

  private sendCpoBatchOverAllocationNotification(
    companyId: number,
    sessionId: number,
    cpoId: number,
    productName: string,
    quantityRequested: number,
    allowedLitres: number,
    alreadyAllocated: number,
  ): void {
    this.notificationService
      .notifyOverAllocationApproval(
        companyId,
        0,
        0,
        `${productName} (CPO batch session #${sessionId}, CPO ${cpoId})`,
        quantityRequested,
        allowedLitres,
        alreadyAllocated,
      )
      .catch((err) =>
        this.logger.error(`Failed to send CPO batch over-allocation notification: ${err.message}`),
      );
  }

  async sessionById(companyId: number, sessionId: number): Promise<IssuanceSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, companyId },
      relations: [
        "cpo",
        "issuerStaff",
        "recipientStaff",
        "issuances",
        "issuances.stockItem",
        "issuances.jobCard",
      ],
    });
    if (!session) {
      throw new NotFoundException(`Issuance session ${sessionId} not found`);
    }
    return session;
  }

  async undoSession(
    companyId: number,
    sessionId: number,
    user: UserContext,
  ): Promise<IssuanceSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, companyId },
      relations: ["issuances", "issuances.stockItem"],
    });

    if (!session) {
      throw new NotFoundException(`Issuance session ${sessionId} not found`);
    }

    if (session.undoneAt) {
      throw new BadRequestException("This session has already been undone");
    }

    if (session.status === IssuanceSessionStatus.REJECTED) {
      throw new BadRequestException("Rejected sessions cannot be undone (already rolled back)");
    }

    const fiveMinutesAgo = now().minus({ minutes: 5 }).toJSDate();
    if (
      session.issuedAt < fiveMinutesAgo &&
      session.status !== IssuanceSessionStatus.PENDING_APPROVAL
    ) {
      throw new BadRequestException("Sessions can only be undone within 5 minutes of creation");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const activeIssuances = (session.issuances ?? []).filter((i) => !i.undone);

      await activeIssuances.reduce(async (prev, issuance) => {
        await prev;

        issuance.undone = true;
        issuance.undoneAt = now().toJSDate();
        issuance.undoneByName = user.name;
        await queryRunner.manager.save(StockIssuance, issuance);

        const stockItem = await queryRunner.manager.findOne(StockItem, {
          where: { id: issuance.stockItemId, companyId },
          lock: { mode: "pessimistic_write" },
        });

        if (stockItem) {
          stockItem.quantity = Number(stockItem.quantity) + Number(issuance.quantity);
          await queryRunner.manager.save(StockItem, stockItem);
        }

        const movement = queryRunner.manager.create(StockMovement, {
          companyId,
          stockItem: stockItem ?? undefined,
          movementType: MovementType.IN,
          quantity: issuance.quantity,
          referenceType: ReferenceType.ISSUANCE,
          referenceId: issuance.id,
          notes: `Undo CPO batch session #${session.id} by ${user.name}`,
          createdBy: user.name,
        });
        await queryRunner.manager.save(StockMovement, movement);

        if (issuance.jobCardId) {
          const allocation = await queryRunner.manager.findOne(StockAllocation, {
            where: {
              companyId,
              jobCard: { id: issuance.jobCardId },
              stockItem: { id: issuance.stockItemId },
              staffMemberId: issuance.recipientStaffId,
            },
            order: { createdAt: "DESC" },
          });
          if (allocation) {
            await queryRunner.manager.remove(StockAllocation, allocation);
          }
        }
      }, Promise.resolve());

      session.status = IssuanceSessionStatus.UNDONE;
      session.undoneAt = now().toJSDate();
      session.undoneByName = user.name;
      const saved = await queryRunner.manager.save(IssuanceSession, session);

      await queryRunner.commitTransaction();

      this.auditService
        .log({
          entityType: "issuance_session",
          entityId: session.id,
          action: AuditAction.DELETE,
          oldValues: {
            cpoId: session.cpoId,
            jobCardIds: session.jobCardIds,
            issuanceCount: activeIssuances.length,
          },
          newValues: { undone: true, undoneBy: user.name },
        })
        .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

      this.logger.log(
        `Issuance session #${session.id} undone by ${user.name} (${activeIssuances.length} issuances reversed)`,
      );

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async approveSession(
    companyId: number,
    sessionId: number,
    managerStaffId: number,
    user: UserContext,
  ): Promise<IssuanceSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, companyId } });
    if (!session) {
      throw new NotFoundException(`Issuance session ${sessionId} not found`);
    }
    if (session.status !== IssuanceSessionStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Session ${sessionId} is not pending approval (status: ${session.status})`,
      );
    }

    const manager = await this.staffRepo.findOne({ where: { id: managerStaffId, companyId } });
    if (!manager) {
      throw new NotFoundException("Approving manager not found");
    }

    session.status = IssuanceSessionStatus.APPROVED;
    session.approvedByManagerId = managerStaffId;
    session.approvedAt = now().toJSDate();
    const saved = await this.sessionRepo.save(session);

    await this.allocationRepo
      .createQueryBuilder()
      .update()
      .set({
        pendingApproval: false,
        approvedByManagerId: managerStaffId,
        approvedAt: now().toJSDate(),
      })
      .where("companyId = :companyId", { companyId })
      .andWhere("jobCardId IN (:...jobCardIds)", { jobCardIds: session.jobCardIds })
      .andWhere("pendingApproval = :pending", { pending: true })
      .execute();

    this.auditService
      .log({
        entityType: "issuance_session",
        entityId: session.id,
        action: AuditAction.UPDATE,
        newValues: { status: "approved", approvedBy: user.name },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`, err.stack));

    this.logger.log(`Session #${sessionId} approved by ${user.name}`);
    return saved;
  }

  async rejectSession(
    companyId: number,
    sessionId: number,
    reason: string,
    user: UserContext,
  ): Promise<IssuanceSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, companyId },
      relations: ["issuances", "issuances.stockItem"],
    });
    if (!session) {
      throw new NotFoundException(`Issuance session ${sessionId} not found`);
    }
    if (session.status !== IssuanceSessionStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Session ${sessionId} is not pending approval (status: ${session.status})`,
      );
    }

    await this.undoSession(companyId, sessionId, user);

    const refreshed = await this.sessionRepo.findOne({ where: { id: sessionId, companyId } });
    if (refreshed) {
      refreshed.status = IssuanceSessionStatus.REJECTED;
      refreshed.rejectedAt = now().toJSDate();
      refreshed.rejectionReason = reason;
      await this.sessionRepo.save(refreshed);
    }

    this.logger.log(`Session #${sessionId} rejected by ${user.name}: ${reason}`);
    return refreshed ?? session;
  }

  async pendingApprovalSessions(companyId: number): Promise<IssuanceSession[]> {
    return this.sessionRepo.find({
      where: { companyId, status: IssuanceSessionStatus.PENDING_APPROVAL },
      relations: ["cpo", "issuerStaff", "recipientStaff"],
      order: { createdAt: "DESC" },
    });
  }

  async sessionsForCpo(companyId: number, cpoId: number): Promise<IssuanceSession[]> {
    return this.sessionRepo.find({
      where: { companyId, cpoId },
      relations: [
        "issuerStaff",
        "recipientStaff",
        "issuances",
        "issuances.stockItem",
        "issuances.jobCard",
      ],
      order: { issuedAt: "DESC" },
    });
  }

  async sessionsForJobCard(companyId: number, jobCardId: number): Promise<IssuanceSession[]> {
    return this.sessionRepo
      .createQueryBuilder("session")
      .leftJoinAndSelect("session.cpo", "cpo")
      .leftJoinAndSelect("session.issuerStaff", "issuer")
      .leftJoinAndSelect("session.recipientStaff", "recipient")
      .where("session.companyId = :companyId", { companyId })
      .andWhere("session.jobCardIds @> :jobCardIds::jsonb", {
        jobCardIds: JSON.stringify([jobCardId]),
      })
      .orderBy("session.issuedAt", "DESC")
      .getMany();
  }
}
