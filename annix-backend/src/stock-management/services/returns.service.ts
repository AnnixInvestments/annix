import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { ReturnSession, type ReturnSessionKind } from "../entities/return-session.entity";
import { RubberOffcutReturn } from "../entities/rubber-offcut-return.entity";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";
import { RubberWastageBin } from "../entities/rubber-wastage-bin.entity";
import { RubberWastageEntry } from "../entities/rubber-wastage-entry.entity";

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

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    @InjectRepository(ReturnSession)
    private readonly sessionRepo: Repository<ReturnSession>,
    @InjectRepository(RubberOffcutReturn)
    private readonly offcutReturnRepo: Repository<RubberOffcutReturn>,
    @InjectRepository(RubberOffcutStock)
    private readonly offcutStockRepo: Repository<RubberOffcutStock>,
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    @InjectRepository(RubberWastageBin)
    private readonly binRepo: Repository<RubberWastageBin>,
    @InjectRepository(RubberWastageEntry)
    private readonly wastageEntryRepo: Repository<RubberWastageEntry>,
    private readonly dataSource: DataSource,
  ) {}

  async outstandingReturns(companyId: number): Promise<ReturnSession[]> {
    return this.sessionRepo.find({
      where: { companyId, status: "pending" },
      relations: { offcutReturns: true },
      order: { createdAt: "DESC" },
    });
  }

  async createOffcutReturnSession(
    companyId: number,
    input: CreateOffcutReturnInput,
  ): Promise<ReturnSession> {
    if (input.widthMm <= 0 || input.lengthM <= 0 || input.thicknessMm <= 0) {
      throw new BadRequestException("Offcut dimensions must be positive");
    }
    return this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(ReturnSession);
      const offcutReturnRepo = manager.getRepository(RubberOffcutReturn);
      const productRepo = manager.getRepository(IssuableProduct);
      const offcutStockRepo = manager.getRepository(RubberOffcutStock);

      const session = sessionRepo.create({
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

      const offcutNumber = input.offcutNumber ?? `OFF-${Date.now()}`;
      const productSku = `OFFCUT-${offcutNumber}`;
      const computedWeightKg = this.computeWeight(input.widthMm, input.lengthM, input.thicknessMm);

      const product = productRepo.create({
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

      const offcutStock = offcutStockRepo.create({
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

      const offcutReturn = offcutReturnRepo.create({
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

      const fullSession = await sessionRepo.findOne({
        where: { id: savedSession.id },
        relations: { offcutReturns: true },
      });
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
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, companyId } });
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
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, companyId } });
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
    return this.binRepo.find({
      where: { companyId, active: true },
      order: { colour: "ASC" },
    });
  }

  async ensureWastageBin(companyId: number, colour: string): Promise<RubberWastageBin> {
    const existing = await this.binRepo.findOne({ where: { companyId, colour } });
    if (existing) {
      return existing;
    }
    const created = this.binRepo.create({
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
    return this.dataSource.transaction(async (manager) => {
      const binRepo = manager.getRepository(RubberWastageBin);
      const entryRepo = manager.getRepository(RubberWastageEntry);
      let bin = await binRepo.findOne({ where: { companyId, colour: input.colour } });
      if (!bin) {
        bin = binRepo.create({
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

      const entry = entryRepo.create({
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
    const bin = await this.binRepo.findOne({ where: { id: binId, companyId } });
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
