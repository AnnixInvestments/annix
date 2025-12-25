import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HdpePipeSpecification } from './entities/hdpe-pipe-specification.entity';
import { HdpeFittingType } from './entities/hdpe-fitting-type.entity';
import { HdpeFittingWeight } from './entities/hdpe-fitting-weight.entity';
import { HdpeButtweldPrice } from './entities/hdpe-buttweld-price.entity';
import { HdpeStubPrice } from './entities/hdpe-stub-price.entity';
import { HdpeStandard } from './entities/hdpe-standard.entity';
import { CalculatePipeCostDto } from './dto/calculate-pipe-cost.dto';
import { CalculateFittingCostDto } from './dto/calculate-fitting-cost.dto';
import { CalculateTotalTransportDto } from './dto/calculate-total-transport.dto';
import { PipeCostResponseDto } from './dto/pipe-cost-response.dto';
import { FittingCostResponseDto } from './dto/fitting-cost-response.dto';
import { TransportWeightResponseDto, TransportItemWeightDto } from './dto/transport-weight-response.dto';

@Injectable()
export class HdpeService {
  private readonly HDPE_DENSITY = 955; // kg/m³

  constructor(
    @InjectRepository(HdpePipeSpecification)
    private pipeSpecRepo: Repository<HdpePipeSpecification>,
    @InjectRepository(HdpeFittingType)
    private fittingTypeRepo: Repository<HdpeFittingType>,
    @InjectRepository(HdpeFittingWeight)
    private fittingWeightRepo: Repository<HdpeFittingWeight>,
    @InjectRepository(HdpeButtweldPrice)
    private buttweldPriceRepo: Repository<HdpeButtweldPrice>,
    @InjectRepository(HdpeStubPrice)
    private stubPriceRepo: Repository<HdpeStubPrice>,
    @InjectRepository(HdpeStandard)
    private standardRepo: Repository<HdpeStandard>,
  ) {}

  // Standards
  async getAllStandards() {
    return this.standardRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async getStandardByCode(code: string) {
    const standard = await this.standardRepo.findOne({
      where: { code, isActive: true },
    });
    if (!standard) {
      throw new NotFoundException(`Standard with code ${code} not found`);
    }
    return standard;
  }

  // Pipe Specifications
  async getAllPipeSpecifications() {
    return this.pipeSpecRepo.find({
      where: { isActive: true },
      order: { nominalBore: 'ASC', sdr: 'ASC' },
    });
  }

  async getPipeSpecificationsByNB(nominalBore: number) {
    return this.pipeSpecRepo.find({
      where: { nominalBore, isActive: true },
      order: { sdr: 'ASC' },
    });
  }

  async getPipeSpecification(nominalBore: number, sdr: number) {
    const spec = await this.pipeSpecRepo.findOne({
      where: { nominalBore, sdr, isActive: true },
    });
    if (!spec) {
      throw new NotFoundException(
        `Pipe specification for NB ${nominalBore} and SDR ${sdr} not found`,
      );
    }
    return spec;
  }

  // Fitting Types
  async getAllFittingTypes() {
    return this.fittingTypeRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async getFittingTypeByCode(code: string) {
    const fittingType = await this.fittingTypeRepo.findOne({
      where: { code, isActive: true },
    });
    if (!fittingType) {
      throw new NotFoundException(`Fitting type with code ${code} not found`);
    }
    return fittingType;
  }

  // Fitting Weights
  async getFittingWeights(fittingTypeId: number) {
    return this.fittingWeightRepo.find({
      where: { fittingTypeId, isActive: true },
      order: { nominalBore: 'ASC' },
    });
  }

  async getFittingWeight(fittingTypeCode: string, nominalBore: number) {
    const fittingType = await this.getFittingTypeByCode(fittingTypeCode);
    const weight = await this.fittingWeightRepo.findOne({
      where: {
        fittingTypeId: fittingType.id,
        nominalBore,
        isActive: true,
      },
    });
    if (!weight) {
      throw new NotFoundException(
        `Weight data for ${fittingTypeCode} at NB ${nominalBore} not found`,
      );
    }
    return weight;
  }

  // Buttweld Prices
  async getButtweldPrice(nominalBore: number): Promise<number> {
    const price = await this.buttweldPriceRepo.findOne({
      where: { nominalBore, isActive: true },
    });
    if (!price) {
      // Return default price if not found (10 + nb/10)
      return 10 + nominalBore / 10;
    }
    return Number(price.pricePerWeld);
  }

  // Stub Prices
  async getStubPrice(nominalBore: number): Promise<number> {
    const price = await this.stubPriceRepo.findOne({
      where: { nominalBore, isActive: true },
    });
    if (!price) {
      // Return default price if not found (5 + nb/20)
      return 5 + nominalBore / 20;
    }
    return Number(price.pricePerStub);
  }

  // Calculation: Pipe Cost
  async calculatePipeCost(dto: CalculatePipeCostDto): Promise<PipeCostResponseDto> {
    const spec = await this.getPipeSpecification(dto.nominalBore, dto.sdr);
    const buttweldPrice = dto.buttweldPrice ?? (await this.getButtweldPrice(dto.nominalBore));

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
    const buttweldPrice = dto.buttweldPrice ?? (await this.getButtweldPrice(dto.nominalBore));

    const weightKg = Number(weightData.weightKg);
    const numButtwelds = fittingType.numButtwelds;
    const materialCost = weightKg * dto.pricePerKg;
    const buttweldCost = numButtwelds * buttweldPrice;

    let stubCost = 0;
    if (dto.fittingTypeCode === 'stub_end') {
      stubCost = dto.stubPrice ?? (await this.getStubPrice(dto.nominalBore));
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

      if (item.type === 'straight_pipe') {
        if (!item.sdr || !item.length) {
          throw new BadRequestException(
            'SDR and length are required for straight_pipe items',
          );
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
    const pipes = await this.pipeSpecRepo
      .createQueryBuilder('pipe')
      .select('DISTINCT pipe.nominalBore', 'nb')
      .where('pipe.isActive = :active', { active: true })
      .orderBy('pipe.nominalBore', 'ASC')
      .getRawMany();

    return pipes.map((p) => p.nb);
  }

  // Available SDRs for a given NB
  async getAvailableSDRs(nominalBore: number): Promise<number[]> {
    const pipes = await this.pipeSpecRepo.find({
      where: { nominalBore, isActive: true },
      order: { sdr: 'ASC' },
    });

    return pipes.map((p) => Number(p.sdr));
  }
}
