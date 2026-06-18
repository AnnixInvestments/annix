import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import type {
  CreateIssuanceSessionDto,
  IssuanceRowInput,
  IssuanceSessionFilters,
  ItemCoatAllocationInput,
  PaintRowInput,
  RubberRollRowInput,
} from "../dto/issuance.dto";
import { type IssuanceRowType } from "../entities/issuance-row.entity";
import { IssuanceSession, type IssuanceSessionKind } from "../entities/issuance-session.entity";
import { PaintIssuanceRow } from "../entities/paint-issuance-row.entity";
import { RubberRollIssuanceRow } from "../entities/rubber-roll-issuance-row.entity";
import { ConsumableIssuanceRowRepository } from "../repositories/consumable-issuance-row.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { IssuanceItemCoatTrackingRepository } from "../repositories/issuance-item-coat-tracking.repository";
import { IssuanceRowRepository } from "../repositories/issuance-row.repository";
import { IssuanceSessionRepository } from "../repositories/issuance-session.repository";
import { PaintIssuanceRowRepository } from "../repositories/paint-issuance-row.repository";
import { RubberRollIssuanceRowRepository } from "../repositories/rubber-roll-issuance-row.repository";
import { SolutionIssuanceRowRepository } from "../repositories/solution-issuance-row.repository";
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
    private readonly sessionRepo: IssuanceSessionRepository,
    private readonly rowRepo: IssuanceRowRepository,
    private readonly productRepo: IssuableProductRepository,
    private readonly consumableRowRepo: ConsumableIssuanceRowRepository,
    private readonly paintRowRepo: PaintIssuanceRowRepository,
    private readonly rubberRowRepo: RubberRollIssuanceRowRepository,
    private readonly solutionRowRepo: SolutionIssuanceRowRepository,
    private readonly coatTrackingRepo: IssuanceItemCoatTrackingRepository,
    private readonly fifoBatchService: FifoBatchService,
    private readonly txRunner: TransactionRunner,
  ) {}

  async createSession(companyId: number, dto: CreateIssuanceSessionDto): Promise<IssuanceSession> {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException("At least one row is required");
    }

    return this.txRunner.run(async (context) => {
      const sessionRepo = this.sessionRepo.withTransaction(context);
      const rowRepo = this.rowRepo.withTransaction(context);
      const productRepo = this.productRepo.withTransaction(context);
      const consumableRepo = this.consumableRowRepo.withTransaction(context);
      const paintRepo = this.paintRowRepo.withTransaction(context);
      const rubberRepo = this.rubberRowRepo.withTransaction(context);
      const solutionRepo = this.solutionRowRepo.withTransaction(context);

      const sessionKind = this.detectSessionKind(dto);
      const session = sessionRepo.build({
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
        const product = await productRepo.findByIdForCompany(companyId, rowInput.productId);
        if (!product) {
          throw new NotFoundException(`Product ${rowInput.productId} not found`);
        }

        const baseRow = rowRepo.build({
          sessionId: savedSession.id,
          companyId,
          rowType: rowInput.rowType as IssuanceRowType,
          productId: rowInput.productId,
          jobCardId: rowInput.jobCardId ?? null,
          notes: rowInput.notes ?? null,
          undone: false,
        });
        const savedRow = await rowRepo.save(baseRow);

        const consumeQuantity = this.consumeQuantityFor(rowInput);
        if (consumeQuantity > 0) {
          await this.fifoBatchService.consumeFifoInTransaction(context, companyId, {
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
            consumableRepo.build({
              rowId: savedRow.id,
              quantity: rowInput.quantity,
              batchNumber: rowInput.batchNumber ?? null,
            }),
          );
        } else if (rowInput.rowType === "paint") {
          await paintRepo.save(this.buildPaintChild(savedRow.id, rowInput));
          if (rowInput.itemCoatAllocations) {
            await this.saveCoatAllocations(
              context,
              companyId,
              savedRow.id,
              rowInput.itemCoatAllocations,
            );
          }
        } else if (rowInput.rowType === "rubber_roll") {
          await rubberRepo.save(this.buildRubberRollChild(savedRow.id, rowInput));
          if (rowInput.itemCoatAllocations) {
            await this.saveCoatAllocations(
              context,
              companyId,
              savedRow.id,
              rowInput.itemCoatAllocations,
            );
          }
        } else if (rowInput.rowType === "solution") {
          await solutionRepo.save(
            solutionRepo.build({
              rowId: savedRow.id,
              volumeL: rowInput.volumeL,
              concentrationPct: rowInput.concentrationPct ?? null,
              batchNumber: rowInput.batchNumber ?? null,
            }),
          );
        }
      }

      const sessionWithRows = await sessionRepo.findByIdWithFullRelations(savedSession.id);
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
    const { items, total } = await this.sessionRepo.findPaginatedForCompany(
      where,
      (page - 1) * pageSize,
      pageSize,
    );
    return { items, total, page, pageSize };
  }

  async byId(companyId: number, id: number): Promise<IssuanceSession> {
    const session = await this.sessionRepo.findByIdForCompanyWithFullRelations(companyId, id);
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
    const rows = await this.rowRepo.issuedTotalsForCpo(companyId, cpoId);
    const totals = rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      rowType: r.row_type,
      totalIssued: Number(r.total_issued),
    }));

    const splitRows = await this.rowRepo.paintSplitsForCpo(companyId, cpoId);

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
    context: TransactionContext,
    companyId: number,
    issuanceRowId: number,
    allocations: ItemCoatAllocationInput[],
  ): Promise<void> {
    const trackingRepo = this.coatTrackingRepo.withTransaction(context);
    for (const alloc of allocations) {
      if (alloc.quantityIssued <= 0) continue;
      await trackingRepo.save(
        trackingRepo.build({
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
    const trackingRows = await this.rowRepo.coatTrackingForCpo(companyId, cpoId);
    const result = trackingRows.map((r) => ({
      lineItemId: r.line_item_id,
      jobCardId: r.job_card_id,
      coatType: r.coat_type,
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
    const paintRows = await this.rowRepo.paintRowsForCpo(companyId, cpoId);
    if (paintRows.length === 0) return [];

    const jcIds = await this.rowRepo.jobCardIdsForCpo(companyId, cpoId);
    const jobCardIds: number[] = jcIds.map((r) => Number(r.job_card_id));

    const analyses = await this.rowRepo.coatingAnalysesForJobCards(companyId, jobCardIds);

    const lineItems = await this.rowRepo.lineItemsForJobCards(jobCardIds);

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
        const coats = ca.coats;
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
          (li) => Number(li.job_card_id) === Number(ca.job_card_id),
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
}
