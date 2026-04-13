import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import type {
  CreateIssuanceSessionDto,
  IssuanceRowInput,
  IssuanceSessionFilters,
  ItemCoatAllocationInput,
  PaintRowInput,
  RubberRollRowInput,
} from "../dto/issuance.dto";
import { ConsumableIssuanceRow } from "../entities/consumable-issuance-row.entity";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { IssuanceItemCoatTracking } from "../entities/issuance-item-coat-tracking.entity";
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
          if (rowInput.itemCoatAllocations) {
            await this.saveCoatAllocations(
              manager,
              companyId,
              savedRow.id,
              rowInput.itemCoatAllocations,
            );
          }
        } else if (rowInput.rowType === "rubber_roll") {
          await rubberRepo.save(this.buildRubberRollChild(savedRow.id, rowInput));
          if (rowInput.itemCoatAllocations) {
            await this.saveCoatAllocations(
              manager,
              companyId,
              savedRow.id,
              rowInput.itemCoatAllocations,
            );
          }
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

  async issuedTotalsForCpo(
    companyId: number,
    cpoId: number,
  ): Promise<{
    totals: Array<{
      productId: number;
      productName: string;
      rowType: string;
      totalIssued: number;
    }>;
    perJc: Record<string, Record<number, number>>;
  }> {
    const rows = await this.dataSource.query(
      `SELECT ir.product_id, ip.name AS product_name, ir.row_type,
              COALESCE(SUM(pir.litres), 0) + COALESCE(SUM(cir.quantity), 0)
              + COALESCE(SUM(rr.weight_kg_issued), 0) + COALESCE(SUM(sol.volume_l), 0)
              AS total_issued
       FROM sm_issuance_row ir
       JOIN sm_issuance_session s ON s.id = ir.session_id
       JOIN sm_issuable_product ip ON ip.id = ir.product_id
       LEFT JOIN sm_paint_issuance_row pir ON pir.row_id = ir.id
       LEFT JOIN sm_consumable_issuance_row cir ON cir.row_id = ir.id
       LEFT JOIN sm_rubber_roll_issuance_row rr ON rr.row_id = ir.id
       LEFT JOIN sm_solution_issuance_row sol ON sol.row_id = ir.id
       WHERE s.company_id = $1 AND s.cpo_id = $2 AND s.status != 'undone'
         AND ir.undone = false
       GROUP BY ir.product_id, ip.name, ir.row_type`,
      [companyId, cpoId],
    );
    const totals = rows.map((r: any) => ({
      productId: r.product_id,
      productName: r.product_name,
      rowType: r.row_type,
      totalIssued: Number(r.total_issued),
    }));

    const splitRows = await this.dataSource.query(
      `SELECT ir.product_id, pir.cpo_pro_rata_split
       FROM sm_paint_issuance_row pir
       JOIN sm_issuance_row ir ON ir.id = pir.row_id
       JOIN sm_issuance_session s ON s.id = ir.session_id
       WHERE s.company_id = $1 AND s.cpo_id = $2 AND s.status != 'undone'
         AND ir.undone = false
         AND pir.cpo_pro_rata_split IS NOT NULL`,
      [companyId, cpoId],
    );

    const perJc: Record<string, Record<number, number>> = {};
    for (const row of splitRows) {
      const productId = row.product_id;
      const split = row.cpo_pro_rata_split as Record<string, number>;
      if (!split) continue;
      for (const [jcId, litres] of Object.entries(split)) {
        if (!perJc[jcId]) perJc[jcId] = {};
        const existing = perJc[jcId][productId] || 0;
        perJc[jcId][productId] = existing + Number(litres);
      }
    }

    return { totals, perJc };
  }

  private async saveCoatAllocations(
    manager: any,
    companyId: number,
    issuanceRowId: number,
    allocations: ItemCoatAllocationInput[],
  ): Promise<void> {
    const trackingRepo = manager.getRepository(IssuanceItemCoatTracking);
    for (const alloc of allocations) {
      if (alloc.quantityIssued <= 0) continue;
      await trackingRepo.save(
        trackingRepo.create({
          companyId,
          issuanceRowId,
          jobCardId: alloc.jobCardId,
          lineItemId: alloc.lineItemId,
          coatType: alloc.coatType,
          quantityIssued: alloc.quantityIssued,
        }),
      );
    }
  }

  async coatStatusForCpo(
    companyId: number,
    cpoId: number,
  ): Promise<
    Array<{
      lineItemId: number;
      jobCardId: number;
      coatType: string;
      totalQuantityIssued: number;
    }>
  > {
    const trackingRows = await this.dataSource.query(
      `SELECT ict.line_item_id, ict.job_card_id, ict.coat_type,
              SUM(ict.quantity_issued)::integer AS total_quantity_issued
       FROM sm_issuance_item_coat_tracking ict
       JOIN sm_issuance_row ir ON ir.id = ict.issuance_row_id
       JOIN sm_issuance_session s ON s.id = ir.session_id
       WHERE ict.company_id = $1
         AND s.cpo_id = $2
         AND s.status != 'undone'
         AND ir.undone = false
       GROUP BY ict.line_item_id, ict.job_card_id, ict.coat_type`,
      [companyId, cpoId],
    );
    const result = trackingRows.map((r: any) => ({
      lineItemId: r.line_item_id as number,
      jobCardId: r.job_card_id as number,
      coatType: r.coat_type as string,
      totalQuantityIssued: Number(r.total_quantity_issued),
    }));

    if (result.length > 0) return result;

    return this.deriveCoatStatusFromPaintRows(companyId, cpoId);
  }

  private async deriveCoatStatusFromPaintRows(
    companyId: number,
    cpoId: number,
  ): Promise<
    Array<{
      lineItemId: number;
      jobCardId: number;
      coatType: string;
      totalQuantityIssued: number;
    }>
  > {
    const paintRows = await this.dataSource.query(
      `SELECT ip.name AS product_name,
              COALESCE(SUM(pir.litres), 0) AS total_litres,
              s.job_card_ids
       FROM sm_issuance_row ir
       JOIN sm_issuance_session s ON s.id = ir.session_id
       JOIN sm_issuable_product ip ON ip.id = ir.product_id
       JOIN sm_paint_issuance_row pir ON pir.row_id = ir.id
       WHERE s.company_id = $1
         AND s.cpo_id = $2
         AND s.status != 'undone'
         AND ir.undone = false
         AND ir.row_type = 'paint'
       GROUP BY ip.name, s.job_card_ids`,
      [companyId, cpoId],
    );
    if (paintRows.length === 0) return [];

    const jcIds = await this.dataSource.query(
      `SELECT DISTINCT jc.id AS job_card_id
       FROM customer_purchase_orders cpo
       JOIN job_cards jc ON jc.cpo_id = cpo.id
       WHERE cpo.id = $1 AND cpo.company_id = $2`,
      [cpoId, companyId],
    );
    const jobCardIds: number[] = jcIds.map((r: any) => Number(r.job_card_id));

    const analyses = await this.dataSource.query(
      `SELECT ca.job_card_id, ca.coats
       FROM job_card_coating_analyses ca
       WHERE ca.company_id = $1
         AND ca.job_card_id = ANY($2)`,
      [companyId, jobCardIds],
    );

    const lineItems = await this.dataSource.query(
      `SELECT li.id, li.job_card_id, li.quantity, li.m2
       FROM job_card_line_items li
       WHERE li.job_card_id = ANY($1)`,
      [jobCardIds],
    );

    const result: Array<{
      lineItemId: number;
      jobCardId: number;
      coatType: string;
      totalQuantityIssued: number;
    }> = [];

    for (const paintRow of paintRows) {
      const productName = (paintRow.product_name as string).toUpperCase();
      const totalLitres = Number(paintRow.total_litres);
      if (totalLitres <= 0) continue;

      for (const ca of analyses) {
        const coats = ca.coats as Array<{
          product: string;
          coatRole?: string;
          area: string;
          coverageM2PerLiter: number;
          litersRequired: number;
        }>;
        const matchedCoat = coats.find((c) => {
          const coatName = c.product.toUpperCase();
          return (
            c.area === "external" &&
            (coatName.includes(productName.slice(0, 15)) ||
              productName.includes(coatName.slice(0, 15)))
          );
        });
        if (!matchedCoat) continue;

        const coatRole = matchedCoat.coatRole == null ? "primer" : matchedCoat.coatRole;
        const coverage = matchedCoat.coverageM2PerLiter;
        const jcLineItems = lineItems.filter(
          (li: any) => Number(li.job_card_id) === Number(ca.job_card_id),
        );
        if (jcLineItems.length === 0 || coverage <= 0) continue;

        const totalJcLitres = matchedCoat.litersRequired;
        if (totalJcLitres <= 0) continue;

        const litresShare = Math.min(totalLitres, totalJcLitres);
        const fraction = litresShare / totalJcLitres;

        for (const li of jcLineItems) {
          const liQty = li.quantity == null ? 1 : Number(li.quantity);
          const issuedUnits = Math.round(liQty * fraction);
          if (issuedUnits <= 0) continue;
          result.push({
            lineItemId: Number(li.id),
            jobCardId: Number(ca.job_card_id),
            coatType: coatRole,
            totalQuantityIssued: issuedUnits,
          });
        }
      }
    }

    return result;
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
