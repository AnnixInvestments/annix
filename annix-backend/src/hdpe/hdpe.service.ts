import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CalculateFittingCostDto } from "./dto/calculate-fitting-cost.dto";
import { CalculatePipeCostDto } from "./dto/calculate-pipe-cost.dto";
import { CalculateTotalTransportDto } from "./dto/calculate-total-transport.dto";
import { FittingCostResponseDto } from "./dto/fitting-cost-response.dto";
import { PipeCostResponseDto } from "./dto/pipe-cost-response.dto";
import {
  TransportItemWeightDto,
  TransportWeightResponseDto,
} from "./dto/transport-weight-response.dto";
import { HdpeButtweldPriceRepository } from "./hdpe-buttweld-price.repository";
import { HdpeFittingTypeRepository } from "./hdpe-fitting-type.repository";
import { HdpeFittingWeightRepository } from "./hdpe-fitting-weight.repository";
import { HdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository";
import { HdpeStandardRepository } from "./hdpe-standard.repository";
import { HdpeStubPriceRepository } from "./hdpe-stub-price.repository";

@Injectable()
export class HdpeService {
  private readonly HDPE_DENSITY = 955; // kg/m³

  constructor(
    private readonly pipeSpecRepo: HdpePipeSpecificationRepository,
    private readonly fittingTypeRepo: HdpeFittingTypeRepository,
    private readonly fittingWeightRepo: HdpeFittingWeightRepository,
    private readonly buttweldPriceRepo: HdpeButtweldPriceRepository,
    private readonly stubPriceRepo: HdpeStubPriceRepository,
    private readonly standardRepo: HdpeStandardRepository,
  ) {}

  // Standards
  async getAllStandards() {
    return this.standardRepo.findActiveOrderedByDisplayOrder();
  }

  async getStandardByCode(code: string) {
    const standard = await this.standardRepo.findByCode(code);
    if (!standard) {
      throw new NotFoundException(`Standard with code ${code} not found`);
    }
    return standard;
  }

  // Pipe Specifications
  async getAllPipeSpecifications() {
    return this.pipeSpecRepo.findActiveOrderedByNominalBoreAndSdr();
  }

  async getPipeSpecificationsByNB(nominalBore: number) {
    return this.pipeSpecRepo.findAllByNominalBore(nominalBore);
  }

  async getPipeSpecification(nominalBore: number, sdr: number) {
    const spec = await this.pipeSpecRepo.findByNominalBoreAndSdr(nominalBore, sdr);
    if (!spec) {
      throw new NotFoundException(
        `Pipe specification for NB ${nominalBore} and SDR ${sdr} not found`,
      );
    }
    return spec;
  }

  // Fitting Types
  async getAllFittingTypes() {
    return this.fittingTypeRepo.findActiveOrderedByDisplayOrder();
  }

  async getFittingTypeByCode(code: string) {
    const fittingType = await this.fittingTypeRepo.findByCode(code);
    if (!fittingType) {
      throw new NotFoundException(`Fitting type with code ${code} not found`);
    }
    return fittingType;
  }

  // Fitting Weights
  async getFittingWeights(fittingTypeId: number) {
    return this.fittingWeightRepo.findByFittingTypeId(fittingTypeId);
  }

  async getFittingWeight(fittingTypeCode: string, nominalBore: number) {
    const fittingType = await this.getFittingTypeByCode(fittingTypeCode);
    const weight = await this.fittingWeightRepo.findByFittingTypeIdAndNominalBore(
      fittingType.id,
      nominalBore,
    );
    if (!weight) {
      throw new NotFoundException(
        `Weight data for ${fittingTypeCode} at NB ${nominalBore} not found`,
      );
    }
    return weight;
  }

  async buttweldPrice(nominalBore: number): Promise<number> {
    const price = await this.buttweldPriceRepo.findByNominalBore(nominalBore);
    if (!price) {
      return 10 + nominalBore / 10;
    }
    return Number(price.pricePerWeld);
  }

  async stubPrice(nominalBore: number): Promise<number> {
    const price = await this.stubPriceRepo.findByNominalBore(nominalBore);
    if (!price) {
      return 5 + nominalBore / 20;
    }
    return Number(price.pricePerStub);
  }

  // Calculation: Pipe Cost
  async calculatePipeCost(dto: CalculatePipeCostDto): Promise<PipeCostResponseDto> {
    const spec = await this.getPipeSpecification(dto.nominalBore, dto.sdr);
    const buttweldPrice = dto.buttweldPrice ?? (await this.buttweldPrice(dto.nominalBore));

    const totalWeight = Number(spec.weightKgPerM) * dto.length;
    const numButtwelds = 0; // Straight pipe has no welds
    const materialCost = totalWeight * dto.pricePerKg;
    const buttweldCost = numButtwelds * buttweldPrice;
    const totalCost = materialCost + buttweldCost;

    return {
      nominalBore: spec.nominalBore,
      sdr: Number(spec.sdr),
      length: dto.length,
      outerDiameter: Number(spec.outerDiameter),
      wallThickness: Number(spec.wallThickness),
      innerDiameter: Number(spec.innerDiameter),
      weightKgPerM: Number(spec.weightKgPerM),
      totalWeight,
      numButtwelds,
      materialCost,
      buttweldCost,
      totalCost,
      pricePerKg: dto.pricePerKg,
      buttweldPrice,
    };
  }

  // Calculation: Fitting Cost
  async calculateFittingCost(dto: CalculateFittingCostDto): Promise<FittingCostResponseDto> {
    const fittingType = await this.getFittingTypeByCode(dto.fittingTypeCode);
    const weightData = await this.getFittingWeight(dto.fittingTypeCode, dto.nominalBore);
    const buttweldPrice = dto.buttweldPrice ?? (await this.buttweldPrice(dto.nominalBore));

    const weightKg = Number(weightData.weightKg);
    const numButtwelds = fittingType.numButtwelds;
    const materialCost = weightKg * dto.pricePerKg;
    const buttweldCost = numButtwelds * buttweldPrice;

    let stubCost = 0;
    if (dto.fittingTypeCode === "stub_end") {
      stubCost = dto.stubPrice ?? (await this.stubPrice(dto.nominalBore));
    }

    const totalCost = materialCost + buttweldCost + stubCost;

    return {
      fittingType: fittingType.name,
      fittingTypeCode: fittingType.code,
      nominalBore: dto.nominalBore,
      weightKg,
      numButtwelds,
      isMolded: fittingType.isMolded,
      isFabricated: fittingType.isFabricated,
      materialCost,
      buttweldCost,
      stubCost,
      totalCost,
      pricePerKg: dto.pricePerKg,
      buttweldPrice,
    };
  }

  // Calculation: Total Transport Weight
  async calculateTotalTransportWeight(
    dto: CalculateTotalTransportDto,
  ): Promise<TransportWeightResponseDto> {
    const items: TransportItemWeightDto[] = [];
    let totalWeight = 0;

    for (const item of dto.items) {
      let weightKg = 0;

      if (item.type === "straight_pipe") {
        if (!item.sdr || !item.length) {
          throw new BadRequestException("SDR and length are required for straight_pipe items");
        }
        const spec = await this.getPipeSpecification(item.nominalBore, item.sdr);
        weightKg = Number(spec.weightKgPerM) * item.length;
      } else {
        const weightData = await this.getFittingWeight(item.type, item.nominalBore);
        weightKg = Number(weightData.weightKg);
      }

      items.push({
        type: item.type,
        nominalBore: item.nominalBore,
        sdr: item.sdr,
        length: item.length,
        weightKg,
      });

      totalWeight += weightKg;
    }

    return {
      items,
      totalWeight,
      itemCount: items.length,
    };
  }

  // Available Nominal Bores
  async getAvailableNominalBores(): Promise<number[]> {
    return this.pipeSpecRepo.findDistinctNominalBores();
  }

  // Available SDRs for a given NB
  async getAvailableSDRs(nominalBore: number): Promise<number[]> {
    const pipes = await this.pipeSpecRepo.findAllByNominalBore(nominalBore);
    return pipes.map((p) => Number(p.sdr));
  }
}
