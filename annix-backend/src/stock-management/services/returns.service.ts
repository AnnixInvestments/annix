import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now, nowMillis } from "../../lib/datetime";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import type { ConsumableReturnCondition } from "../entities/consumable-return.entity";
import type { PaintReturnCondition } from "../entities/paint-return.entity";
import { ReturnSession, type ReturnSessionKind } from "../entities/return-session.entity";
import { RubberWastageBin } from "../entities/rubber-wastage-bin.entity";
import { RubberWastageEntry } from "../entities/rubber-wastage-entry.entity";
import { ConsumableReturnRepository } from "../repositories/consumable-return.repository";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { PaintReturnRepository } from "../repositories/paint-return.repository";
import { ReturnSessionRepository } from "../repositories/return-session.repository";
import { RubberOffcutReturnRepository } from "../repositories/rubber-offcut-return.repository";
import { RubberOffcutStockRepository } from "../repositories/rubber-offcut-stock.repository";
import { RubberWastageBinRepository } from "../repositories/rubber-wastage-bin.repository";
import { RubberWastageEntryRepository } from "../repositories/rubber-wastage-entry.repository";

export interface CreateOffcutReturnInput {
  targetIssuanceRowId?: number | null;
  sourceRubberRollId?: number | null;
  offcutNumber?: string | null;
  widthMm: number;
  lengthM: number;
  thicknessMm: number;
  compoundId?: number | null;
  compoundCode?: string | null;
  colour?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  returnedByStaffId?: number | null;
}

export interface CreateWastageEntryInput {
  colour: string;
  weightKgAdded: number;
  sourceOffcutProductId?: number | null;
  sourceIssuanceRowId?: number | null;
  sourcePurchaseBatchId?: number | null;
  costPerKgAtEntry: number;
  notes?: string | null;
  addedByStaffId?: number | null;
}

export interface CreatePaintReturnInput {
  targetIssuanceRowId?: number | null;
  sourceProductId?: number | null;
  litresReturned: number;
  condition: PaintReturnCondition;
  batchNumber?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  returnedByStaffId?: number | null;
}

export interface CreateConsumableReturnInput {
  targetIssuanceRowId?: number | null;
  sourceProductId?: number | null;
  quantityReturned: number;
  condition: ConsumableReturnCondition;
  batchNumber?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  returnedByStaffId?: number | null;
}

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly sessionRepo: ReturnSessionRepository,
    private readonly offcutReturnRepo: RubberOffcutReturnRepository,
    private readonly offcutStockRepo: RubberOffcutStockRepository,
    private readonly productRepo: IssuableProductRepository,
    private readonly binRepo: RubberWastageBinRepository,
    private readonly wastageEntryRepo: RubberWastageEntryRepository,
    private readonly paintReturnRepo: PaintReturnRepository,
    private readonly consumableReturnRepo: ConsumableReturnRepository,
    private readonly txRunner: TransactionRunner,
  ) {}

  async outstandingReturns(companyId: number): Promise<ReturnSession[]> {
    return this.sessionRepo.findOutstandingForCompany(companyId);
  }

  async createPaintReturnSession(
    companyId: number,
    input: CreatePaintReturnInput,
  ): Promise<ReturnSession> {
    if (input.litresReturned <= 0) {
      throw new BadRequestException("litresReturned must be greater than zero");
    }
    if (input.condition !== "usable" && input.condition !== "contaminated") {
      throw new BadRequestException("condition must be 'usable' or 'contaminated'");
    }
    return this.txRunner.run(async (context) => {
      const sessionRepo = this.sessionRepo.withTransaction(context);
      const paintReturnRepo = this.paintReturnRepo.withTransaction(context);

      const session = sessionRepo.build({
        companyId,
        returnKind: "paint_litres" as ReturnSessionKind,
        targetIssuanceRowId: input.targetIssuanceRowId ?? null,
        targetSessionId: null,
        targetJobCardId: null,
        returnedByStaffId: input.returnedByStaffId ?? null,
        status: "pending",
        notes: input.notes ?? null,
      });
      const savedSession = await sessionRepo.save(session);

      const paintReturn = paintReturnRepo.build({
        returnSessionId: savedSession.id,
        companyId,
        sourceIssuanceRowId: input.targetIssuanceRowId ?? null,
        sourceProductId: input.sourceProductId ?? null,
        litresReturned: input.litresReturned,
        condition: input.condition,
        batchNumber: input.batchNumber ?? null,
        photoUrl: input.photoUrl ?? null,
        notes: input.notes ?? null,
      });
      await paintReturnRepo.save(paintReturn);

      const fullSession = await sessionRepo.findByIdWithReturns(savedSession.id);
      if (!fullSession) {
        throw new NotFoundException(`Return session ${savedSession.id} disappeared after creation`);
      }
      return fullSession;
    });
  }

  async createConsumableReturnSession(
    companyId: number,
    input: CreateConsumableReturnInput,
  ): Promise<ReturnSession> {
    if (input.quantityReturned <= 0) {
      throw new BadRequestException("quantityReturned must be greater than zero");
    }
    if (input.condition !== "usable" && input.condition !== "contaminated") {
      throw new BadRequestException("condition must be 'usable' or 'contaminated'");
    }
    return this.txRunner.run(async (context) => {
      const sessionRepo = this.sessionRepo.withTransaction(context);
      const consumableReturnRepo = this.consumableReturnRepo.withTransaction(context);

      const session = sessionRepo.build({
        companyId,
        returnKind: "consumable_qty" as ReturnSessionKind,
        targetIssuanceRowId: input.targetIssuanceRowId ?? null,
        targetSessionId: null,
        targetJobCardId: null,
        returnedByStaffId: input.returnedByStaffId ?? null,
        status: "pending",
        notes: input.notes ?? null,
      });
      const savedSession = await sessionRepo.save(session);

      const consumableReturn = consumableReturnRepo.build({
        returnSessionId: savedSession.id,
        companyId,
        sourceIssuanceRowId: input.targetIssuanceRowId ?? null,
        sourceProductId: input.sourceProductId ?? null,
        quantityReturned: input.quantityReturned,
        condition: input.condition,
        batchNumber: input.batchNumber ?? null,
        photoUrl: input.photoUrl ?? null,
        notes: input.notes ?? null,
      });
      await consumableReturnRepo.save(consumableReturn);

      const fullSession = await sessionRepo.findByIdWithReturns(savedSession.id);
      if (!fullSession) {
        throw new NotFoundException(`Return session ${savedSession.id} disappeared after creation`);
      }
      return fullSession;
    });
  }

  async createOffcutReturnSession(
    companyId: number,
    input: CreateOffcutReturnInput,
  ): Promise<ReturnSession> {
    if (input.widthMm <= 0 || input.lengthM <= 0 || input.thicknessMm <= 0) {
      throw new BadRequestException("Offcut dimensions must be positive");
    }
    return this.txRunner.run(async (context) => {
      const sessionRepo = this.sessionRepo.withTransaction(context);
      const offcutReturnRepo = this.offcutReturnRepo.withTransaction(context);
      const productRepo = this.productRepo.withTransaction(context);
      const offcutStockRepo = this.offcutStockRepo.withTransaction(context);

      const session = sessionRepo.build({
        companyId,
        returnKind: "rubber_offcut" as ReturnSessionKind,
        targetIssuanceRowId: input.targetIssuanceRowId ?? null,
        targetSessionId: null,
        targetJobCardId: null,
        returnedByStaffId: input.returnedByStaffId ?? null,
        status: "pending",
        notes: input.notes ?? null,
      });
      const savedSession = await sessionRepo.save(session);

      const offcutNumber = input.offcutNumber ?? `OFF-${nowMillis()}`;
      const productSku = `OFFCUT-${offcutNumber}`;
      const computedWeightKg = this.computeWeight(input.widthMm, input.lengthM, input.thicknessMm);

      const product = productRepo.build({
        companyId,
        productType: "rubber_offcut",
        sku: productSku,
        name: `Rubber offcut ${offcutNumber}`,
        unitOfMeasure: "kg",
        costPerUnit: 0,
        quantity: computedWeightKg,
        active: true,
      });
      const savedProduct = await productRepo.save(product);

      const offcutStock = offcutStockRepo.build({
        productId: savedProduct.id,
        offcutNumber,
        sourceRollId: input.sourceRubberRollId ?? null,
        compoundCode: input.compoundCode ?? null,
        compoundId: input.compoundId ?? null,
        colour: input.colour ?? null,
        widthMm: input.widthMm,
        lengthM: input.lengthM,
        thicknessMm: input.thicknessMm,
        computedWeightKg,
        status: "available",
        receivedAt: now().toJSDate(),
      });
      await offcutStockRepo.save(offcutStock);

      const offcutReturn = offcutReturnRepo.build({
        returnSessionId: savedSession.id,
        companyId,
        sourceIssuanceRowId: input.targetIssuanceRowId ?? null,
        sourceRubberRollId: input.sourceRubberRollId ?? null,
        offcutNumber,
        widthMm: input.widthMm,
        lengthM: input.lengthM,
        thicknessMm: input.thicknessMm,
        computedWeightKg,
        compoundId: input.compoundId ?? null,
        compoundCode: input.compoundCode ?? null,
        colour: input.colour ?? null,
        photoUrl: input.photoUrl ?? null,
        createsOffcutProductId: savedProduct.id,
        notes: input.notes ?? null,
      });
      await offcutReturnRepo.save(offcutReturn);

      const fullSession = await sessionRepo.findByIdWithOffcutReturns(savedSession.id);
      if (!fullSession) {
        throw new NotFoundException(`Return session ${savedSession.id} disappeared after creation`);
      }
      return fullSession;
    });
  }

  async confirm(
    companyId: number,
    sessionId: number,
    confirmedByStaffId: number,
  ): Promise<ReturnSession> {
    const session = await this.sessionRepo.findByIdForCompany(companyId, sessionId);
    if (!session) {
      throw new NotFoundException(`Return session ${sessionId} not found`);
    }
    if (session.status !== "pending") {
      throw new BadRequestException(`Return session ${sessionId} is not pending`);
    }
    session.status = "confirmed";
    session.confirmedByStaffId = confirmedByStaffId;
    return this.sessionRepo.save(session);
  }

  async reject(companyId: number, sessionId: number, reason: string): Promise<ReturnSession> {
    const session = await this.sessionRepo.findByIdForCompany(companyId, sessionId);
    if (!session) {
      throw new NotFoundException(`Return session ${sessionId} not found`);
    }
    if (session.status !== "pending") {
      throw new BadRequestException(`Return session ${sessionId} is not pending`);
    }
    session.status = "rejected";
    session.notes = `${session.notes ? `${session.notes}\n\n` : ""}REJECTED: ${reason}`;
    return this.sessionRepo.save(session);
  }

  async listWastageBins(companyId: number): Promise<RubberWastageBin[]> {
    return this.binRepo.findActiveForCompany(companyId);
  }

  async ensureWastageBin(companyId: number, colour: string): Promise<RubberWastageBin> {
    const existing = await this.binRepo.findByColour(companyId, colour);
    if (existing) {
      return existing;
    }
    const created = this.binRepo.build({
      companyId,
      colour,
      currentWeightKg: 0,
      currentValueR: 0,
      active: true,
    });
    return this.binRepo.save(created);
  }

  async addWastageEntry(
    companyId: number,
    input: CreateWastageEntryInput,
  ): Promise<RubberWastageEntry> {
    if (input.weightKgAdded <= 0) {
      throw new BadRequestException("weightKgAdded must be greater than zero");
    }
    return this.txRunner.run(async (context) => {
      const binRepo = this.binRepo.withTransaction(context);
      const entryRepo = this.wastageEntryRepo.withTransaction(context);
      let bin = await binRepo.findByColour(companyId, input.colour);
      if (!bin) {
        bin = binRepo.build({
          companyId,
          colour: input.colour,
          currentWeightKg: 0,
          currentValueR: 0,
          active: true,
        });
        bin = await binRepo.save(bin);
      }
      const totalCostR = input.weightKgAdded * input.costPerKgAtEntry;
      bin.currentWeightKg += input.weightKgAdded;
      bin.currentValueR += totalCostR;
      await binRepo.save(bin);

      const entry = entryRepo.build({
        wastageBinId: bin.id,
        companyId,
        weightKgAdded: input.weightKgAdded,
        sourceOffcutProductId: input.sourceOffcutProductId ?? null,
        sourceIssuanceRowId: input.sourceIssuanceRowId ?? null,
        sourcePurchaseBatchId: input.sourcePurchaseBatchId ?? null,
        costPerKgAtEntry: input.costPerKgAtEntry,
        totalCostR,
        addedByStaffId: input.addedByStaffId ?? null,
        notes: input.notes ?? null,
      });
      return entryRepo.save(entry);
    });
  }

  async emptyWastageBin(companyId: number, binId: number): Promise<RubberWastageBin> {
    const bin = await this.binRepo.findByIdForCompany(companyId, binId);
    if (!bin) {
      throw new NotFoundException(`Wastage bin ${binId} not found`);
    }
    bin.lastEmptiedAt = now().toJSDate();
    bin.lastEmptiedValueR = bin.currentValueR;
    bin.currentWeightKg = 0;
    bin.currentValueR = 0;
    return this.binRepo.save(bin);
  }

  private computeWeight(widthMm: number, lengthM: number, thicknessMm: number): number {
    const ASSUMED_DENSITY_KG_PER_M3 = 1000;
    const widthM = widthMm / 1000;
    const thicknessM = thicknessMm / 1000;
    return widthM * lengthM * thicknessM * ASSUMED_DENSITY_KG_PER_M3;
  }
}
