import { Injectable, NotFoundException } from "@nestjs/common";
import { STEEL_DENSITY_KG_M3 } from "../lib/steel-constants";
import {
  CalculateFabricationCostDto,
  CalculateFlatBarDto,
  CalculatePlateDto,
  CalculateRoundBarDto,
  CalculateSquareBarDto,
  CalculateSteelWeightDto,
  FabricationCostBreakdownDto,
  FabricationCostResultDto,
  SteelCalculationResultDto,
  UpdateLaborRateDto,
} from "./dto/structural-steel.dto";
import { FabricationComplexity } from "./entities/fabrication-complexity.entity";
import { FabricationOperation } from "./entities/fabrication-operation.entity";
import { ShopLaborRate } from "./entities/shop-labor-rate.entity";
import { StructuralSteelGrade } from "./entities/structural-steel-grade.entity";
import { StructuralSteelSection } from "./entities/structural-steel-section.entity";
import { StructuralSteelType } from "./entities/structural-steel-type.entity";
import { StructuralSteelRepository } from "./structural-steel.repository";

@Injectable()
export class StructuralSteelService {
  constructor(private readonly structuralSteelRepository: StructuralSteelRepository) {}

  async getAllTypes(): Promise<StructuralSteelType[]> {
    return this.structuralSteelRepository.findAllActiveTypes();
  }

  async getTypeByCode(code: string): Promise<StructuralSteelType | null> {
    return this.structuralSteelRepository.findTypeByCode(code);
  }

  async getTypeWithSections(typeId: number): Promise<StructuralSteelType | null> {
    return this.structuralSteelRepository.findTypeWithSections(typeId);
  }

  async getAllSections(): Promise<StructuralSteelSection[]> {
    return this.structuralSteelRepository.findAllActiveSections();
  }

  async getSectionsByType(typeCode: string): Promise<StructuralSteelSection[]> {
    const type = await this.structuralSteelRepository.findTypeByCode(typeCode);
    if (!type) return [];

    return this.structuralSteelRepository.findSectionsByTypeId(type.id);
  }

  async getSectionById(id: number): Promise<StructuralSteelSection | null> {
    return this.structuralSteelRepository.findSectionById(id);
  }

  async searchSections(query: string): Promise<StructuralSteelSection[]> {
    return this.structuralSteelRepository.searchSections(query);
  }

  async getAllGrades(): Promise<StructuralSteelGrade[]> {
    return this.structuralSteelRepository.findAllActiveGrades();
  }

  async getGradesForType(typeCode: string): Promise<StructuralSteelGrade[]> {
    return this.structuralSteelRepository.findGradesByTypeCode(typeCode);
  }

  async getGradeByCode(code: string): Promise<StructuralSteelGrade | null> {
    return this.structuralSteelRepository.findGradeByCode(code);
  }

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

  calculatePlate(dto: CalculatePlateDto): SteelCalculationResultDto {
    const thicknessM = dto.thicknessMm / 1000;
    const widthM = dto.widthMm / 1000;
    const lengthM = dto.lengthMm / 1000;

    const weightPerPlateKg = thicknessM * widthM * lengthM * STEEL_DENSITY_KG_M3;
    const surfacePerPlateM2 = 2 * widthM * lengthM;

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
      typeName: "Plate",
      gradeCode: dto.gradeCode,
      dimensions: {
        thicknessMm: dto.thicknessMm,
        widthMm: dto.widthMm,
        lengthMm: dto.lengthMm,
      },
    };
  }

  calculateFlatBar(dto: CalculateFlatBarDto): SteelCalculationResultDto {
    const widthM = dto.widthMm / 1000;
    const thicknessM = dto.thicknessMm / 1000;

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
      typeName: "Flat Bar",
      gradeCode: dto.gradeCode,
      dimensions: {
        widthMm: dto.widthMm,
        thicknessMm: dto.thicknessMm,
      },
    };
  }

  calculateRoundBar(dto: CalculateRoundBarDto): SteelCalculationResultDto {
    const diameterM = dto.diameterMm / 1000;
    const radiusM = diameterM / 2;

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
      typeName: "Round Bar",
      gradeCode: dto.gradeCode,
      dimensions: {
        diameterMm: dto.diameterMm,
      },
    };
  }

  calculateSquareBar(dto: CalculateSquareBarDto): SteelCalculationResultDto {
    const sideM = dto.sideMm / 1000;

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
      typeName: "Square Bar",
      gradeCode: dto.gradeCode,
      dimensions: {
        sideMm: dto.sideMm,
      },
    };
  }

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

  async getAllOperations(): Promise<FabricationOperation[]> {
    return this.structuralSteelRepository.findAllActiveOperations();
  }

  async getOperationByCode(code: string): Promise<FabricationOperation | null> {
    return this.structuralSteelRepository.findOperationByCode(code);
  }

  async getAllComplexityLevels(): Promise<FabricationComplexity[]> {
    return this.structuralSteelRepository.findAllActiveComplexityLevels();
  }

  async getComplexityByLevel(level: string): Promise<FabricationComplexity | null> {
    return this.structuralSteelRepository.findComplexityByLevel(level);
  }

  async getAllLaborRates(): Promise<ShopLaborRate[]> {
    return this.structuralSteelRepository.findAllActiveLaborRates();
  }

  async getLaborRateByCode(code: string): Promise<ShopLaborRate | null> {
    return this.structuralSteelRepository.findLaborRateByCode(code);
  }

  async updateLaborRate(code: string, dto: UpdateLaborRateDto): Promise<ShopLaborRate> {
    const rate = await this.structuralSteelRepository.findLaborRateByCodeUnfiltered(code);
    if (!rate) {
      throw new NotFoundException(`Labor rate with code ${code} not found`);
    }
    rate.ratePerHour = dto.ratePerHour;
    if (dto.currency) {
      rate.currency = dto.currency;
    }
    return this.structuralSteelRepository.saveLaborRate(rate);
  }

  async calculateFabricationCost(
    dto: CalculateFabricationCostDto,
  ): Promise<FabricationCostResultDto> {
    const complexity = await this.getComplexityByLevel(dto.complexityLevel);
    if (!complexity) {
      throw new NotFoundException(`Complexity level ${dto.complexityLevel} not found`);
    }

    const laborRateCode =
      dto.laborRateCode || (dto.isStainless ? "stainless_steel" : "carbon_steel");
    const laborRate = await this.getLaborRateByCode(laborRateCode);
    if (!laborRate) {
      throw new NotFoundException(`Labor rate ${laborRateCode} not found`);
    }

    const weightTons = dto.totalWeightKg / 1000;

    const hoursPerTon = Number(complexity.hoursPerTon);
    const baseFabricationHours = weightTons * hoursPerTon;

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

    const totalLaborHours = baseFabricationHours + totalOperationHours;
    const stainlessMultiplier = dto.isStainless ? 1.5 : 1.0;
    const totalFabricationCost =
      totalLaborHours * Number(laborRate.ratePerHour) * stainlessMultiplier;

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
