import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, MoreThanOrEqual, Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { AuditAction } from "../../audit/entities/audit-log.entity";
import { now } from "../../lib/datetime";
import { CoatDetail, JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { IssuanceBatchRecord } from "../entities/issuance-batch-record.entity";
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
}
