import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { CostRateType, RubberCostRate } from "./entities/rubber-cost-rate.entity";
import { ProductCodingType } from "./entities/rubber-product-coding.entity";
import { RubberRollStock } from "./entities/rubber-roll-stock.entity";
import { RubberCostRateRepository } from "./repositories/rubber-cost-rate.repository";
import { RubberProductCodingRepository } from "./repositories/rubber-product-coding.repository";
import { RubberRollStockRepository } from "./repositories/rubber-roll-stock.repository";

export interface CostRateDto {
  id: number;
  rateType: CostRateType;
  costPerKgZar: number;
  compoundCodingId: number | null;
  compoundCode: string | null;
  compoundName: string | null;
  notes: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostRateDto {
  rateType: CostRateType;
  costPerKgZar: number;
  compoundCodingId?: number | null;
  notes?: string | null;
}

export interface UpdateCostRateDto {
  costPerKgZar?: number;
  notes?: string | null;
}

export interface RollCosDto {
  rollId: number;
  rollNumber: string;
  compoundCode: string | null;
  compoundName: string | null;
  weightKg: number;
  compoundCostPerKg: number | null;
  compoundCostTotal: number | null;
  calendererCostPerKg: number | null;
  calendererCostTotal: number | null;
  totalCos: number | null;
  currentCostZar: number | null;
  anomalyZar: number | null;
  priceZar: number | null;
  profitLossZar: number | null;
}

export interface CalendererConversionRates {
  uncuredPerKg: number | null;
  curedBuffedPerKg: number | null;
}

@Injectable()
export class RubberCostService {
  private readonly logger = new Logger(RubberCostService.name);

  constructor(
    private readonly costRateRepo: RubberCostRateRepository,
    private readonly rollStockRepo: RubberRollStockRepository,
    private readonly productCodingRepo: RubberProductCodingRepository,
  ) {}

  async allCostRates(rateType?: CostRateType): Promise<CostRateDto[]> {
    const rates = await this.costRateRepo.findAllWithCodingOrdered(rateType);
    return rates.map((r) => this.mapCostRateToDto(r));
  }

  async costRateById(id: number): Promise<CostRateDto | null> {
    const rate = await this.costRateRepo.findOneByIdWithCoding(id);

    if (!rate) return null;
    return this.mapCostRateToDto(rate);
  }

  async createCostRate(dto: CreateCostRateDto, updatedBy?: string): Promise<CostRateDto> {
    if (dto.rateType === CostRateType.COMPOUND && !dto.compoundCodingId) {
      throw new BadRequestException("Compound cost rates require a compound coding ID");
    }

    if (dto.rateType !== CostRateType.COMPOUND && dto.compoundCodingId) {
      throw new BadRequestException(
        "Calenderer conversion rates must not have a compound coding ID",
      );
    }

    if (dto.compoundCodingId) {
      const coding = await this.productCodingRepo.findOneById(dto.compoundCodingId);
      if (!coding) {
        throw new BadRequestException("Compound coding not found");
      }
      if (coding.codingType !== ProductCodingType.COMPOUND) {
        throw new BadRequestException("Coding must be of type COMPOUND");
      }
    }

    const rate = this.costRateRepo.build({
      rateType: dto.rateType,
      costPerKgZar: dto.costPerKgZar,
      compoundCodingId: dto.compoundCodingId || null,
      notes: dto.notes || null,
      updatedBy: updatedBy || null,
    });

    const saved = await this.costRateRepo.save(rate);
    const full = await this.costRateById(saved.id);
    return full!;
  }

  async updateCostRate(
    id: number,
    dto: UpdateCostRateDto,
    updatedBy?: string,
  ): Promise<CostRateDto | null> {
    const rate = await this.costRateRepo.findById(id);
    if (!rate) return null;

    if (dto.costPerKgZar !== undefined) {
      rate.costPerKgZar = dto.costPerKgZar;
    }
    if (dto.notes !== undefined) {
      rate.notes = dto.notes;
    }
    rate.updatedBy = updatedBy || rate.updatedBy;

    await this.costRateRepo.save(rate);
    return this.costRateById(id);
  }

  async deleteCostRate(id: number): Promise<boolean> {
    return this.costRateRepo.deleteById(id);
  }

  async calendererConversionRates(): Promise<CalendererConversionRates> {
    const uncured = await this.costRateRepo.findOneByRateType(CostRateType.CALENDERER_UNCURED);
    const curedBuffed = await this.costRateRepo.findOneByRateType(
      CostRateType.CALENDERER_CURED_BUFFED,
    );
    return {
      uncuredPerKg: uncured ? Number(uncured.costPerKgZar) : null,
      curedBuffedPerKg: curedBuffed ? Number(curedBuffed.costPerKgZar) : null,
    };
  }

  async compoundCostPerKg(compoundCodingId: number): Promise<number | null> {
    const rate = await this.costRateRepo.findOneByRateTypeAndCoding(
      CostRateType.COMPOUND,
      compoundCodingId,
    );
    return rate ? Number(rate.costPerKgZar) : null;
  }

  async rollCos(rollId: number): Promise<RollCosDto | null> {
    const roll = await this.rollStockRepo.findOneByIdWithCoding(rollId);

    if (!roll) return null;
    return this.calculateRollCos(roll);
  }

  async allRollCos(status?: string): Promise<RollCosDto[]> {
    const rolls = await this.rollStockRepo.findAllWithCodingByStatusOrdered(status);

    const compoundRates = await this.costRateRepo.findByRateType(CostRateType.COMPOUND);
    const compoundRateMap = new Map(
      compoundRates.map((r) => [r.compoundCodingId, Number(r.costPerKgZar)]),
    );

    const calendererRates = await this.calendererConversionRates();

    return rolls.map((roll) =>
      this.calculateRollCosWithRates(roll, compoundRateMap, calendererRates),
    );
  }

  private async calculateRollCos(roll: RubberRollStock): Promise<RollCosDto> {
    const weightKg = Number(roll.weightKg);
    const compoundCostPerKg = roll.compoundCodingId
      ? await this.compoundCostPerKg(roll.compoundCodingId)
      : null;
    const calendererRates = await this.calendererConversionRates();
    const calendererCostPerKg = calendererRates.curedBuffedPerKg || calendererRates.uncuredPerKg;

    const compoundCostTotal = compoundCostPerKg !== null ? compoundCostPerKg * weightKg : null;
    const calendererCostTotal =
      calendererCostPerKg !== null ? calendererCostPerKg * weightKg : null;

    const totalCos =
      compoundCostTotal !== null && calendererCostTotal !== null
        ? compoundCostTotal + calendererCostTotal
        : null;

    const currentCostZar = roll.costZar !== null ? Number(roll.costZar) : null;
    const anomalyZar =
      totalCos !== null && currentCostZar !== null ? currentCostZar - totalCos : null;

    const priceZar = roll.priceZar !== null ? Number(roll.priceZar) : null;
    const profitLossZar = priceZar !== null && totalCos !== null ? priceZar - totalCos : null;

    return {
      rollId: roll.id,
      rollNumber: roll.rollNumber,
      compoundCode: roll.compoundCoding?.code || null,
      compoundName: roll.compoundCoding?.name || null,
      weightKg,
      compoundCostPerKg,
      compoundCostTotal:
        compoundCostTotal !== null ? Math.round(compoundCostTotal * 100) / 100 : null,
      calendererCostPerKg,
      calendererCostTotal:
        calendererCostTotal !== null ? Math.round(calendererCostTotal * 100) / 100 : null,
      totalCos: totalCos !== null ? Math.round(totalCos * 100) / 100 : null,
      currentCostZar,
      anomalyZar: anomalyZar !== null ? Math.round(anomalyZar * 100) / 100 : null,
      priceZar,
      profitLossZar: profitLossZar !== null ? Math.round(profitLossZar * 100) / 100 : null,
    };
  }

  private calculateRollCosWithRates(
    roll: RubberRollStock,
    compoundRateMap: Map<number | null, number>,
    calendererRates: CalendererConversionRates,
  ): RollCosDto {
    const weightKg = Number(roll.weightKg);
    const compoundCostPerKg = roll.compoundCodingId
      ? compoundRateMap.get(roll.compoundCodingId) || null
      : null;
    const calendererCostPerKg = calendererRates.curedBuffedPerKg || calendererRates.uncuredPerKg;

    const compoundCostTotal = compoundCostPerKg !== null ? compoundCostPerKg * weightKg : null;
    const calendererCostTotal =
      calendererCostPerKg !== null ? calendererCostPerKg * weightKg : null;

    const totalCos =
      compoundCostTotal !== null && calendererCostTotal !== null
        ? compoundCostTotal + calendererCostTotal
        : null;

    const currentCostZar = roll.costZar !== null ? Number(roll.costZar) : null;
    const anomalyZar =
      totalCos !== null && currentCostZar !== null ? currentCostZar - totalCos : null;

    const priceZar = roll.priceZar !== null ? Number(roll.priceZar) : null;
    const profitLossZar = priceZar !== null && totalCos !== null ? priceZar - totalCos : null;

    return {
      rollId: roll.id,
      rollNumber: roll.rollNumber,
      compoundCode: roll.compoundCoding?.code || null,
      compoundName: roll.compoundCoding?.name || null,
      weightKg,
      compoundCostPerKg,
      compoundCostTotal:
        compoundCostTotal !== null ? Math.round(compoundCostTotal * 100) / 100 : null,
      calendererCostPerKg,
      calendererCostTotal:
        calendererCostTotal !== null ? Math.round(calendererCostTotal * 100) / 100 : null,
      totalCos: totalCos !== null ? Math.round(totalCos * 100) / 100 : null,
      currentCostZar,
      anomalyZar: anomalyZar !== null ? Math.round(anomalyZar * 100) / 100 : null,
      priceZar,
      profitLossZar: profitLossZar !== null ? Math.round(profitLossZar * 100) / 100 : null,
    };
  }

  private mapCostRateToDto(rate: RubberCostRate): CostRateDto {
    return {
      id: rate.id,
      rateType: rate.rateType,
      costPerKgZar: Number(rate.costPerKgZar),
      compoundCodingId: rate.compoundCodingId,
      compoundCode: rate.compoundCoding?.code || null,
      compoundName: rate.compoundCoding?.name || null,
      notes: rate.notes,
      updatedBy: rate.updatedBy,
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    };
  }
}
