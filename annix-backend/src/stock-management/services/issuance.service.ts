import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import type {
  CreateIssuanceSessionDto,
  IssuanceRowInput,
  IssuanceSessionFilters,
  PaintRowInput,
  RubberRollRowInput,
} from "../dto/issuance.dto";
import { ConsumableIssuanceRow } from "../entities/consumable-issuance-row.entity";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { IssuanceRow, type IssuanceRowType } from "../entities/issuance-row.entity";
import { IssuanceSession, type IssuanceSessionKind } from "../entities/issuance-session.entity";
import { PaintIssuanceRow } from "../entities/paint-issuance-row.entity";
import { RubberRollIssuanceRow } from "../entities/rubber-roll-issuance-row.entity";
import { SolutionIssuanceRow } from "../entities/solution-issuance-row.entity";
import { FifoBatchService } from "./fifo-batch.service";

export interface IssuanceSessionListResult {
  items: IssuanceSession[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class IssuanceService {
  private readonly logger = new Logger(IssuanceService.name);

  constructor(
    @InjectRepository(IssuanceSession)
    private readonly sessionRepo: Repository<IssuanceSession>,
    @InjectRepository(IssuanceRow)
    private readonly rowRepo: Repository<IssuanceRow>,
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    private readonly fifoBatchService: FifoBatchService,
    private readonly dataSource: DataSource,
  ) {}

  async createSession(companyId: number, dto: CreateIssuanceSessionDto): Promise<IssuanceSession> {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException("At least one row is required");
    }

    return this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(IssuanceSession);
      const rowRepo = manager.getRepository(IssuanceRow);
      const productRepo = manager.getRepository(IssuableProduct);
      const consumableRepo = manager.getRepository(ConsumableIssuanceRow);
      const paintRepo = manager.getRepository(PaintIssuanceRow);
      const rubberRepo = manager.getRepository(RubberRollIssuanceRow);
      const solutionRepo = manager.getRepository(SolutionIssuanceRow);

      const sessionKind = this.detectSessionKind(dto);
      const session = sessionRepo.create({
        companyId,
        sessionKind,
        status: "active",
        issuerStaffId: dto.issuerStaffId ?? null,
        recipientStaffId: dto.recipientStaffId ?? null,
        cpoId: dto.cpoId ?? null,
        jobCardIds: dto.jobCardIds ?? null,
        notes: dto.notes ?? null,
      });
      const savedSession = await sessionRepo.save(session);

      for (const rowInput of dto.rows) {
        const product = await productRepo.findOne({
          where: { id: rowInput.productId, companyId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${rowInput.productId} not found`);
        }

        const baseRow = rowRepo.create({
          sessionId: savedSession.id,
          companyId,
          rowType: rowInput.rowType as IssuanceRowType,
          productId: rowInput.productId,
          jobCardId: rowInput.jobCardId ?? null,
          notes: rowInput.notes ?? null,
        });
        const savedRow = await rowRepo.save(baseRow);

        const consumeQuantity = this.consumeQuantityFor(rowInput);
        if (consumeQuantity > 0) {
          await this.fifoBatchService.consumeFifoInTransaction(manager, companyId, {
            productId: rowInput.productId,
            movementKind: "issuance",
            movementRefId: savedRow.id,
            quantity: consumeQuantity,
            consumedByStaffId: dto.issuerStaffId ?? null,
          });
        }

        product.quantity = Math.max(0, product.quantity - consumeQuantity);
        await productRepo.save(product);

        if (rowInput.rowType === "consumable") {
          await consumableRepo.save(
            consumableRepo.create({
              rowId: savedRow.id,
              quantity: rowInput.quantity,
              batchNumber: rowInput.batchNumber ?? null,
            }),
          );
        } else if (rowInput.rowType === "paint") {
          await paintRepo.save(this.buildPaintChild(savedRow.id, rowInput));
        } else if (rowInput.rowType === "rubber_roll") {
          await rubberRepo.save(this.buildRubberRollChild(savedRow.id, rowInput));
        } else if (rowInput.rowType === "solution") {
          await solutionRepo.save(
            solutionRepo.create({
              rowId: savedRow.id,
              volumeL: rowInput.volumeL,
              concentrationPct: rowInput.concentrationPct ?? null,
              batchNumber: rowInput.batchNumber ?? null,
            }),
          );
        }
      }

      const sessionWithRows = await sessionRepo.findOne({
        where: { id: savedSession.id },
        relations: this.fullSessionRelations(),
      });
      if (!sessionWithRows) {
        throw new NotFoundException(`Session ${savedSession.id} disappeared after creation`);
      }
      return sessionWithRows;
    });
  }

  async list(
    companyId: number,
    filters: IssuanceSessionFilters = {},
  ): Promise<IssuanceSessionListResult> {
    const where: {
      companyId: number;
      status?: IssuanceSession["status"];
      sessionKind?: IssuanceSessionKind;
      cpoId?: number;
      issuerStaffId?: number;
      recipientStaffId?: number;
    } = { companyId };
    if (filters.status) where.status = filters.status;
    if (filters.sessionKind) where.sessionKind = filters.sessionKind;
    if (filters.cpoId !== undefined) where.cpoId = filters.cpoId;
    if (filters.issuerStaffId !== undefined) where.issuerStaffId = filters.issuerStaffId;
    if (filters.recipientStaffId !== undefined) where.recipientStaffId = filters.recipientStaffId;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE));
    const [items, total] = await this.sessionRepo.findAndCount({
      where,
      relations: this.fullSessionRelations(),
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async byId(companyId: number, id: number): Promise<IssuanceSession> {
    const session = await this.sessionRepo.findOne({
      where: { id, companyId },
      relations: this.fullSessionRelations(),
    });
    if (!session) {
      throw new NotFoundException(`Issuance session ${id} not found`);
    }
    return session;
  }

  async undoSession(
    companyId: number,
    id: number,
    undoneByStaffId: number | null,
  ): Promise<IssuanceSession> {
    const session = await this.byId(companyId, id);
    if (session.status === "undone") {
      throw new BadRequestException(`Session ${id} is already undone`);
    }
    session.status = "undone";
    session.undoneAt = now().toJSDate();
    session.undoneByStaffId = undoneByStaffId;
    await this.sessionRepo.save(session);
    for (const row of session.rows ?? []) {
      row.undone = true;
      row.undoneAt = now().toJSDate();
      row.undoneByStaffId = undoneByStaffId;
      await this.rowRepo.save(row);
    }
    this.logger.log(`Session ${id} undone by staff ${undoneByStaffId}`);
    return this.byId(companyId, id);
  }

  private detectSessionKind(dto: CreateIssuanceSessionDto): IssuanceSessionKind {
    if (dto.sessionKind) {
      return dto.sessionKind;
    }
    if (dto.cpoId) {
      return "cpo_batch";
    }
    const types = new Set(dto.rows.map((r) => r.rowType));
    if (types.size > 1) {
      return "mixed";
    }
    if (types.has("rubber_roll")) {
      return "rubber_roll";
    }
    return "standard";
  }

  private consumeQuantityFor(row: IssuanceRowInput): number {
    if (row.rowType === "consumable") {
      return row.quantity;
    }
    if (row.rowType === "paint") {
      return row.litres;
    }
    if (row.rowType === "rubber_roll") {
      return row.weightKgIssued;
    }
    if (row.rowType === "solution") {
      return row.volumeL;
    }
    return 0;
  }

  private buildPaintChild(rowId: number, input: PaintRowInput): PaintIssuanceRow {
    return {
      rowId,
      litres: input.litres,
      coverageM2: input.coverageM2 ?? null,
      coatCount: input.coatCount ?? null,
      coatingAnalysisId: input.coatingAnalysisId ?? null,
      batchNumber: input.batchNumber ?? null,
      cpoProRataSplit: input.cpoProRataSplit ?? null,
    } as PaintIssuanceRow;
  }

  private buildRubberRollChild(rowId: number, input: RubberRollRowInput): RubberRollIssuanceRow {
    return {
      rowId,
      weightKgIssued: input.weightKgIssued,
      issuedWidthMm: input.issuedWidthMm ?? null,
      issuedLengthM: input.issuedLengthM ?? null,
      issuedThicknessMm: input.issuedThicknessMm ?? null,
      expectedReturnDimensions: input.expectedReturnDimensions ?? null,
      status: "active",
    } as RubberRollIssuanceRow;
  }

  private fullSessionRelations() {
    return {
      rows: {
        product: true,
        consumable: true,
        paint: true,
        rubberRoll: true,
        solution: true,
      },
    };
  }
}
