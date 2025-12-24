import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuralSteelType } from './entities/structural-steel-type.entity';
import { StructuralSteelSection } from './entities/structural-steel-section.entity';
import { StructuralSteelGrade } from './entities/structural-steel-grade.entity';
import { FabricationOperation } from './entities/fabrication-operation.entity';
import { FabricationComplexity } from './entities/fabrication-complexity.entity';
import { ShopLaborRate } from './entities/shop-labor-rate.entity';
import {
  CalculateSteelWeightDto,
  CalculatePlateDto,
  CalculateFlatBarDto,
  CalculateRoundBarDto,
  CalculateSquareBarDto,
  SteelCalculationResultDto,
  CalculateFabricationCostDto,
  FabricationCostResultDto,
  FabricationCostBreakdownDto,
  UpdateLaborRateDto,
} from './dto/structural-steel.dto';

// Steel density in kg/m³
const STEEL_DENSITY_KG_M3 = 7850;

@Injectable()
export class StructuralSteelService {
  constructor(
    @InjectRepository(StructuralSteelType)
    private readonly typeRepository: Repository<StructuralSteelType>,
    @InjectRepository(StructuralSteelSection)
    private readonly sectionRepository: Repository<StructuralSteelSection>,
    @InjectRepository(StructuralSteelGrade)
    private readonly gradeRepository: Repository<StructuralSteelGrade>,
    @InjectRepository(FabricationOperation)
    private readonly operationRepository: Repository<FabricationOperation>,
    @InjectRepository(FabricationComplexity)
    private readonly complexityRepository: Repository<FabricationComplexity>,
    @InjectRepository(ShopLaborRate)
    private readonly laborRateRepository: Repository<ShopLaborRate>,
  ) {}

  // ==================== Type Methods ====================

  async getAllTypes(): Promise<StructuralSteelType[]> {
    return this.typeRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async getTypeByCode(code: string): Promise<StructuralSteelType | null> {
    return this.typeRepository.findOne({ where: { code, isActive: true } });
  }

  async getTypeWithSections(typeId: number): Promise<StructuralSteelType | null> {
    return this.typeRepository.findOne({
      where: { id: typeId, isActive: true },
      relations: ['sections'],
    });
  }

  // ==================== Section Methods ====================

  async getAllSections(): Promise<StructuralSteelSection[]> {
    return this.sectionRepository.find({
      where: { isActive: true },
      relations: ['steelType'],
      order: { typeId: 'ASC', displayOrder: 'ASC' },
    });
  }

  async getSectionsByType(typeCode: string): Promise<StructuralSteelSection[]> {
    const type = await this.typeRepository.findOne({ where: { code: typeCode, isActive: true } });
    if (!type) return [];

    return this.sectionRepository.find({
      where: { typeId: type.id, isActive: true },
      order: { displayOrder: 'ASC', designation: 'ASC' },
    });
  }

  async getSectionById(id: number): Promise<StructuralSteelSection | null> {
    return this.sectionRepository.findOne({
      where: { id, isActive: true },
      relations: ['steelType'],
    });
  }

  async searchSections(query: string): Promise<StructuralSteelSection[]> {
    return this.sectionRepository
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.steelType', 'type')
      .where('section.is_active = :active', { active: true })
      .andWhere('(section.designation ILIKE :query OR type.name ILIKE :query)', { query: `%${query}%` })
      .orderBy('type.display_order', 'ASC')
      .addOrderBy('section.display_order', 'ASC')
      .getMany();
  }

  // ==================== Grade Methods ====================

  async getAllGrades(): Promise<StructuralSteelGrade[]> {
    return this.gradeRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', code: 'ASC' },
    });
  }

  async getGradesForType(typeCode: string): Promise<StructuralSteelGrade[]> {
    return this.gradeRepository
      .createQueryBuilder('grade')
      .where('grade.is_active = :active', { active: true })
      .andWhere(':typeCode = ANY(grade.compatible_types)', { typeCode })
      .orderBy('grade.display_order', 'ASC')
      .getMany();
  }

  async getGradeByCode(code: string): Promise<StructuralSteelGrade | null> {
    return this.gradeRepository.findOne({ where: { code, isActive: true } });
  }

  // ==================== Calculation Methods ====================

  /**
   * Calculate weight and surface area for a standard section
   */
  async calculateForSection(dto: CalculateSteelWeightDto): Promise<SteelCalculationResultDto> {
    const section = await this.getSectionById(dto.sectionId);
    if (!section) {
      throw new NotFoundException(`Section with ID ${dto.sectionId} not found`);
    }

    const weightKgPerM = Number(section.weightKgPerM);
    const surfaceAreaM2PerM = Number(section.surfaceAreaM2PerM);
    const totalWeightKg = weightKgPerM * dto.lengthM * dto.quantity;
    const totalSurfaceAreaM2 = surfaceAreaM2PerM * dto.lengthM * dto.quantity;

    return {
      weightKgPerM: Math.round(weightKgPerM * 1000) / 1000,
      surfaceAreaM2PerM: Math.round(surfaceAreaM2PerM * 1000000) / 1000000,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalSurfaceAreaM2: Math.round(totalSurfaceAreaM2 * 1000) / 1000,
      lengthM: dto.lengthM,
      quantity: dto.quantity,
      designation: section.designation,
      typeName: section.steelType?.name,
      gradeCode: dto.gradeCode,
      dimensions: section.dimensions,
    };
  }

  /**
   * Calculate weight and surface area for a steel plate
   * Weight = thickness(m) × width(m) × length(m) × density(kg/m³)
   * Surface = 2 × width(m) × length(m) (top and bottom, ignoring edges for thin plates)
   */
  calculatePlate(dto: CalculatePlateDto): SteelCalculationResultDto {
    const thicknessM = dto.thicknessMm / 1000;
    const widthM = dto.widthMm / 1000;
    const lengthM = dto.lengthMm / 1000;

    // Weight per plate
    const weightPerPlateKg = thicknessM * widthM * lengthM * STEEL_DENSITY_KG_M3;
    // Surface area per plate (both sides)
    const surfacePerPlateM2 = 2 * widthM * lengthM;

    // For consistency with linear sections, express as per-meter values
    const weightKgPerM = thicknessM * widthM * STEEL_DENSITY_KG_M3;
    const surfaceAreaM2PerM = 2 * widthM;

    const totalWeightKg = weightPerPlateKg * dto.quantity;
    const totalSurfaceAreaM2 = surfacePerPlateM2 * dto.quantity;

    return {
      weightKgPerM: Math.round(weightKgPerM * 1000) / 1000,
      surfaceAreaM2PerM: Math.round(surfaceAreaM2PerM * 1000000) / 1000000,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalSurfaceAreaM2: Math.round(totalSurfaceAreaM2 * 1000) / 1000,
      lengthM: lengthM,
      quantity: dto.quantity,
      typeName: 'Plate',
      gradeCode: dto.gradeCode,
      dimensions: {
        thicknessMm: dto.thicknessMm,
        widthMm: dto.widthMm,
        lengthMm: dto.lengthMm,
      },
    };
  }

  /**
   * Calculate weight and surface area for a flat bar
   * Weight = width(m) × thickness(m) × length(m) × density(kg/m³)
   * Surface = (2×width + 2×thickness)(m) × length(m)
   */
  calculateFlatBar(dto: CalculateFlatBarDto): SteelCalculationResultDto {
    const widthM = dto.widthMm / 1000;
    const thicknessM = dto.thicknessMm / 1000;

    // Per meter values
    const weightKgPerM = widthM * thicknessM * STEEL_DENSITY_KG_M3;
    const surfaceAreaM2PerM = 2 * (widthM + thicknessM);

    const totalWeightKg = weightKgPerM * dto.lengthM * dto.quantity;
    const totalSurfaceAreaM2 = surfaceAreaM2PerM * dto.lengthM * dto.quantity;

    return {
      weightKgPerM: Math.round(weightKgPerM * 1000) / 1000,
      surfaceAreaM2PerM: Math.round(surfaceAreaM2PerM * 1000000) / 1000000,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalSurfaceAreaM2: Math.round(totalSurfaceAreaM2 * 1000) / 1000,
      lengthM: dto.lengthM,
      quantity: dto.quantity,
      typeName: 'Flat Bar',
      gradeCode: dto.gradeCode,
      dimensions: {
        widthMm: dto.widthMm,
        thicknessMm: dto.thicknessMm,
      },
    };
  }

  /**
   * Calculate weight and surface area for a round bar
   * Weight = π × (d/2)² × length × density
   * Surface = π × d × length (external surface)
   */
  calculateRoundBar(dto: CalculateRoundBarDto): SteelCalculationResultDto {
    const diameterM = dto.diameterMm / 1000;
    const radiusM = diameterM / 2;

    // Per meter values
    const weightKgPerM = Math.PI * radiusM * radiusM * STEEL_DENSITY_KG_M3;
    const surfaceAreaM2PerM = Math.PI * diameterM;

    const totalWeightKg = weightKgPerM * dto.lengthM * dto.quantity;
    const totalSurfaceAreaM2 = surfaceAreaM2PerM * dto.lengthM * dto.quantity;

    return {
      weightKgPerM: Math.round(weightKgPerM * 1000) / 1000,
      surfaceAreaM2PerM: Math.round(surfaceAreaM2PerM * 1000000) / 1000000,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalSurfaceAreaM2: Math.round(totalSurfaceAreaM2 * 1000) / 1000,
      lengthM: dto.lengthM,
      quantity: dto.quantity,
      typeName: 'Round Bar',
      gradeCode: dto.gradeCode,
      dimensions: {
        diameterMm: dto.diameterMm,
      },
    };
  }

  /**
   * Calculate weight and surface area for a square bar
   * Weight = side² × length × density
   * Surface = 4 × side × length (external surface)
   */
  calculateSquareBar(dto: CalculateSquareBarDto): SteelCalculationResultDto {
    const sideM = dto.sideMm / 1000;

    // Per meter values
    const weightKgPerM = sideM * sideM * STEEL_DENSITY_KG_M3;
    const surfaceAreaM2PerM = 4 * sideM;

    const totalWeightKg = weightKgPerM * dto.lengthM * dto.quantity;
    const totalSurfaceAreaM2 = surfaceAreaM2PerM * dto.lengthM * dto.quantity;

    return {
      weightKgPerM: Math.round(weightKgPerM * 1000) / 1000,
      surfaceAreaM2PerM: Math.round(surfaceAreaM2PerM * 1000000) / 1000000,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalSurfaceAreaM2: Math.round(totalSurfaceAreaM2 * 1000) / 1000,
      lengthM: dto.lengthM,
      quantity: dto.quantity,
      typeName: 'Square Bar',
      gradeCode: dto.gradeCode,
      dimensions: {
        sideMm: dto.sideMm,
      },
    };
  }

  /**
   * Generic calculation given weight per meter and surface per meter
   */
  calculateGeneric(
    weightKgPerM: number,
    surfaceAreaM2PerM: number,
    lengthM: number,
    quantity: number,
  ): { totalWeightKg: number; totalSurfaceAreaM2: number } {
    return {
      totalWeightKg: Math.round(weightKgPerM * lengthM * quantity * 100) / 100,
      totalSurfaceAreaM2: Math.round(surfaceAreaM2PerM * lengthM * quantity * 1000) / 1000,
    };
  }

  // ==================== Integration with Surface Protection ====================

  /**
   * Get surface area for coating calculation
   * This method can be called from the coating specification module
   */
  async getSurfaceAreaForCoating(
    sectionId: number,
    lengthM: number,
    quantity: number,
  ): Promise<number> {
    const section = await this.getSectionById(sectionId);
    if (!section) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }
    return Number(section.surfaceAreaM2PerM) * lengthM * quantity;
  }

  // ==================== Fabrication Operation Methods ====================

  async getAllOperations(): Promise<FabricationOperation[]> {
    return this.operationRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async getOperationByCode(code: string): Promise<FabricationOperation | null> {
    return this.operationRepository.findOne({ where: { code, isActive: true } });
  }

  // ==================== Fabrication Complexity Methods ====================

  async getAllComplexityLevels(): Promise<FabricationComplexity[]> {
    return this.complexityRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async getComplexityByLevel(level: string): Promise<FabricationComplexity | null> {
    return this.complexityRepository.findOne({ where: { level, isActive: true } });
  }

  // ==================== Labor Rate Methods ====================

  async getAllLaborRates(): Promise<ShopLaborRate[]> {
    return this.laborRateRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async getLaborRateByCode(code: string): Promise<ShopLaborRate | null> {
    return this.laborRateRepository.findOne({ where: { code, isActive: true } });
  }

  async updateLaborRate(code: string, dto: UpdateLaborRateDto): Promise<ShopLaborRate> {
    const rate = await this.laborRateRepository.findOne({ where: { code } });
    if (!rate) {
      throw new NotFoundException(`Labor rate with code ${code} not found`);
    }
    rate.ratePerHour = dto.ratePerHour;
    if (dto.currency) {
      rate.currency = dto.currency;
    }
    return this.laborRateRepository.save(rate);
  }

  // ==================== Fabrication Cost Calculation ====================

  /**
   * Calculate fabrication cost based on weight, complexity, and operations
   *
   * Base hours = weight (tons) × hours_per_ton for complexity level
   * Operation hours = sum of (operation.hours_per_unit × quantity) for each operation
   * Total hours = base hours + operation hours
   * Stainless multiplier = 1.5x for stainless steel
   * Total cost = total hours × labor rate × stainless multiplier
   */
  async calculateFabricationCost(dto: CalculateFabricationCostDto): Promise<FabricationCostResultDto> {
    // Get complexity level
    const complexity = await this.getComplexityByLevel(dto.complexityLevel);
    if (!complexity) {
      throw new NotFoundException(`Complexity level ${dto.complexityLevel} not found`);
    }

    // Get labor rate
    const laborRateCode = dto.laborRateCode || (dto.isStainless ? 'stainless_steel' : 'carbon_steel');
    const laborRate = await this.getLaborRateByCode(laborRateCode);
    if (!laborRate) {
      throw new NotFoundException(`Labor rate ${laborRateCode} not found`);
    }

    // Convert to tons
    const weightTons = dto.totalWeightKg / 1000;

    // Calculate base fabrication hours from complexity
    const hoursPerTon = Number(complexity.hoursPerTon);
    const baseFabricationHours = weightTons * hoursPerTon;

    // Calculate operation hours
    const operationBreakdown: FabricationCostBreakdownDto[] = [];
    let totalOperationHours = 0;

    if (dto.operations && dto.operations.length > 0) {
      for (const opItem of dto.operations) {
        const operation = await this.getOperationByCode(opItem.operationCode);
        if (!operation) {
          throw new NotFoundException(`Operation ${opItem.operationCode} not found`);
        }

        const hoursPerUnit = Number(operation.hoursPerUnit);
        const opHours = hoursPerUnit * opItem.quantity;
        const stainlessMult = dto.isStainless ? Number(operation.stainlessMultiplier) : 1.0;
        const adjustedHours = opHours * stainlessMult;

        totalOperationHours += adjustedHours;

        operationBreakdown.push({
          operationCode: operation.code,
          operationName: operation.name,
          quantity: opItem.quantity,
          hoursPerUnit,
          totalHours: Math.round(adjustedHours * 100) / 100,
          cost: Math.round(adjustedHours * Number(laborRate.ratePerHour) * 100) / 100,
        });
      }
    }

    // Calculate totals
    const totalLaborHours = baseFabricationHours + totalOperationHours;
    const stainlessMultiplier = dto.isStainless ? 1.5 : 1.0;
    const totalFabricationCost = totalLaborHours * Number(laborRate.ratePerHour) * stainlessMultiplier;

    return {
      totalWeightKg: dto.totalWeightKg,
      weightTons: Math.round(weightTons * 1000) / 1000,
      complexityLevel: dto.complexityLevel,
      hoursPerTon,
      baseFabricationHours: Math.round(baseFabricationHours * 100) / 100,
      operationBreakdown,
      totalOperationHours: Math.round(totalOperationHours * 100) / 100,
      totalLaborHours: Math.round(totalLaborHours * 100) / 100,
      laborRatePerHour: Number(laborRate.ratePerHour),
      stainlessMultiplier,
      totalFabricationCost: Math.round(totalFabricationCost * 100) / 100,
      currency: laborRate.currency,
    };
  }

  /**
   * Quick estimate using just weight and complexity (no detailed operations)
   */
  async quickFabricationEstimate(
    totalWeightKg: number,
    complexityLevel: string,
    isStainless: boolean = false,
  ): Promise<{ totalHours: number; estimatedCost: number; currency: string }> {
    const result = await this.calculateFabricationCost({
      totalWeightKg,
      complexityLevel,
      isStainless,
    });

    return {
      totalHours: result.totalLaborHours,
      estimatedCost: result.totalFabricationCost,
      currency: result.currency,
    };
  }
}
