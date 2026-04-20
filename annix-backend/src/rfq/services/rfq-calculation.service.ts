import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BoltMass } from "../../bolt-mass/entities/bolt-mass.entity";
import { NutMass } from "../../nut-mass/entities/nut-mass.entity";
import { PipeDimension } from "../../pipe-dimension/entities/pipe-dimension.entity";
import { BendCalculationResultDto } from "../dto/bend-calculation-result.dto";
import { CreateBendRfqDto } from "../dto/create-bend-rfq.dto";
import { CreatePumpRfqDto } from "../dto/create-pump-rfq.dto";
import { UnifiedStraightPipeDto } from "../dto/create-unified-rfq.dto";
import { PumpCalculationResultDto } from "../dto/pump-calculation-result.dto";
import { StraightPipeCalculationResultDto } from "../dto/rfq-response.dto";
import { LengthUnit, QuantityType, ScheduleType } from "../entities/straight-pipe-rfq.entity";
import { ReferenceDataCacheService } from "./reference-data-cache.service";

const STEEL_DENSITY_KG_DM3 = 7.85;

@Injectable()
export class RfqCalculationService {
  private readonly logger = new Logger(RfqCalculationService.name);

  constructor(
    @InjectRepository(BoltMass)
    private boltMassRepository: Repository<BoltMass>,
    @InjectRepository(NutMass)
    private nutMassRepository: Repository<NutMass>,
    private referenceDataCache: ReferenceDataCacheService,
  ) {}

  async calculateStraightPipeRequirements(
    dto: UnifiedStraightPipeDto,
  ): Promise<StraightPipeCalculationResultDto> {
    const steelSpec = dto.steelSpecificationId
      ? this.referenceDataCache.steelSpecificationById(dto.steelSpecificationId)
      : null;

    if (dto.steelSpecificationId && !steelSpec) {
      throw new NotFoundException(
        `Steel specification with ID ${dto.steelSpecificationId} not found`,
      );
    }

    const normalizedSchedule = dto.scheduleNumber
      ? this.normalizeScheduleNumber(dto.scheduleNumber)
      : null;

    let pipeDimension: PipeDimension | null | undefined = null;
    if (dto.scheduleType === ScheduleType.SCHEDULE && normalizedSchedule) {
      pipeDimension = this.referenceDataCache.pipeDimensionByNbAndSchedule(
        dto.nominalBoreMm,
        normalizedSchedule,
        steelSpec?.id,
      );
    } else if (dto.scheduleType === ScheduleType.WALL_THICKNESS && dto.wallThicknessMm) {
      pipeDimension = this.referenceDataCache.pipeDimensionByNbAndWallThickness(
        dto.nominalBoreMm,
        dto.wallThicknessMm,
        steelSpec?.id,
      );
    }

    if (!pipeDimension) {
      const scheduleInfo =
        dto.scheduleType === ScheduleType.SCHEDULE && dto.scheduleNumber
          ? `schedule ${dto.scheduleNumber}${dto.scheduleNumber !== normalizedSchedule ? ` (normalized to: ${normalizedSchedule})` : ""}`
          : `wall thickness ${dto.wallThicknessMm}mm`;

      throw new NotFoundException(
        `The combination of ${dto.nominalBoreMm}NB with ${scheduleInfo} is not available in the database.\n\nPlease select a different schedule (STD, XS, XXS, 40, 80, 120, 160, MEDIUM, or HEAVY) or use the automated calculation by setting working pressure.`,
      );
    }

    const nbNpsLookup = this.referenceDataCache.nbNpsLookupByNb(dto.nominalBoreMm);
    if (!nbNpsLookup) {
      throw new NotFoundException(`NB-NPS lookup not found for ${dto.nominalBoreMm}NB`);
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;
    const wallThicknessMm = pipeDimension.wall_thickness_mm;

    let pipeWeightPerMeter: number;
    if (pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0) {
      pipeWeightPerMeter = pipeDimension.mass_kgm;
    } else {
      pipeWeightPerMeter =
        (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * STEEL_DENSITY_KG_DM3) /
        1000;
    }

    let individualPipeLengthM = dto.individualPipeLength;
    if (dto.lengthUnit === LengthUnit.FEET) {
      individualPipeLengthM = dto.individualPipeLength * 0.3048;
    }

    let calculatedPipeCount: number;
    let calculatedTotalLengthM: number;

    if (dto.quantityType === QuantityType.TOTAL_LENGTH) {
      let totalLengthM = dto.quantityValue;
      if (dto.lengthUnit === LengthUnit.FEET) {
        totalLengthM = dto.quantityValue * 0.3048;
      }
      calculatedTotalLengthM = totalLengthM;
      calculatedPipeCount = Math.ceil(totalLengthM / individualPipeLengthM);
    } else {
      calculatedPipeCount = dto.quantityValue;
      calculatedTotalLengthM = calculatedPipeCount * individualPipeLengthM;
    }

    const totalPipeWeight = pipeWeightPerMeter * calculatedTotalLengthM;

    const numberOfFlanges = calculatedPipeCount * 2;
    const numberOfFlangeWelds = numberOfFlanges;
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * 2 * circumferenceM;
    const numberOfButtWelds = 0;
    const totalButtWeldLength = 0;

    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        const flangeDimension = this.referenceDataCache.flangeDimension(
          dto.nominalBoreMm,
          dto.flangeStandardId,
          dto.flangePressureClassId,
        );

        if (flangeDimension) {
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);

            const boltMass = await this.boltMassRepository
              .createQueryBuilder("bm")
              .where("bm.bolt = :boltId", { boltId: flangeDimension.bolt.id })
              .andWhere("bm.length_mm >= :minLength", { minLength: estimatedBoltLengthMm })
              .orderBy("bm.length_mm", "ASC")
              .getOne();

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            const nutMass = await this.nutMassRepository.findOne({
              where: { bolt: { id: flangeDimension.bolt.id } },
            });

            if (nutMass) {
              const totalNuts = numberOfFlanges * flangeDimension.num_holes;
              totalNutWeight = totalNuts * nutMass.mass_kg;
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Flange weight calculation failed: ${error.message}. ` +
            `Flange Standard ID: ${dto.flangeStandardId}, ` +
            `Pressure Class ID: ${dto.flangePressureClassId}, ` +
            `Nominal Bore: ${dto.nominalBoreMm}`,
        );
      }
    }

    const totalSystemWeight =
      totalPipeWeight + totalFlangeWeight + totalBoltWeight + totalNutWeight;

    return {
      outsideDiameterMm,
      wallThicknessMm,
      pipeWeightPerMeter: Math.round(pipeWeightPerMeter * 100) / 100,
      totalPipeWeight: Math.round(totalPipeWeight),
      totalFlangeWeight: Math.round(totalFlangeWeight * 100) / 100,
      totalBoltWeight: Math.round(totalBoltWeight * 100) / 100,
      totalNutWeight: Math.round(totalNutWeight * 100) / 100,
      totalSystemWeight: Math.round(totalSystemWeight),
      calculatedPipeCount,
      calculatedTotalLength: Math.round(calculatedTotalLengthM * 100) / 100,
      numberOfFlanges,
      numberOfButtWelds,
      totalButtWeldLength,
      numberOfFlangeWelds,
      totalFlangeWeldLength: Math.round(totalFlangeWeldLength * 100) / 100,
    };
  }

  async calculateBendRequirements(dto: CreateBendRfqDto): Promise<BendCalculationResultDto> {
    const weightBreakdown = this.bendWeight(dto);
    const centerToFace = this.centerToFace(dto);
    const numberOfFlanges = dto.numberOfTangents + 1;

    const flangeDim =
      dto.flangeStandardId && dto.flangePressureClassId
        ? this.referenceDataCache.flangeDimension(
            dto.nominalBoreMm,
            dto.flangeStandardId,
            dto.flangePressureClassId,
          )
        : null;
    const flangeMassKg = flangeDim?.mass_kg || 0;
    const flangeWeight = flangeMassKg * numberOfFlanges;

    const nbLookup = this.referenceDataCache.nbNpsLookupByNb(dto.nominalBoreMm);
    const od = nbLookup?.outside_diameter_mm || dto.nominalBoreMm * 1.25;

    return {
      totalWeight: weightBreakdown.totalWeight + flangeWeight,
      centerToFaceDimension: centerToFace,
      bendWeight: weightBreakdown.bendBodyWeight,
      tangentWeight: weightBreakdown.tangentWeight,
      flangeWeight,
      numberOfFlanges,
      numberOfFlangeWelds: dto.numberOfTangents,
      totalFlangeWeldLength: (dto.numberOfTangents * Math.PI * dto.nominalBoreMm) / 1000,
      numberOfButtWelds: dto.numberOfTangents > 0 ? 1 : 0,
      totalButtWeldLength: dto.numberOfTangents > 0 ? (Math.PI * dto.nominalBoreMm) / 1000 : 0,
      outsideDiameterMm: od,
      wallThicknessMm: this.wallThicknessFromSchedule(dto.scheduleNumber),
    };
  }

  async calculatePumpRequirements(dto: CreatePumpRfqDto): Promise<PumpCalculationResultDto> {
    const flowRate = dto.flowRate || 0;
    const totalHead = dto.totalHead || 0;
    const specificGravity = dto.specificGravity || 1.0;

    const hydraulicPowerKw = (flowRate * totalHead * specificGravity * 9.81) / 3600;
    const estimatedEfficiency = this.pumpEfficiency(flowRate, totalHead, dto.pumpType);

    if (estimatedEfficiency <= 0) {
      return {
        hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
        estimatedMotorPowerKw: 0,
        estimatedEfficiency: 0,
        specificSpeed: 0,
        recommendedPumpType: "Unknown",
        npshRequired: 0,
        bepFlowRate: 0,
        bepHead: 0,
        operatingPointPercentBep: 0,
        warnings: ["Pump efficiency could not be estimated. Check flow rate and head inputs."],
        recommendations: [],
      };
    }

    const estimatedMotorPowerKw = hydraulicPowerKw / (estimatedEfficiency / 100);
    const specificSpeed = this.specificSpeed(flowRate, totalHead);
    const recommendedPumpType = this.recommendedPumpType(specificSpeed);
    const npshRequired = this.npshRequired(flowRate, specificSpeed);

    const bepFlowRate = flowRate * 1.1;
    const bepHead = totalHead * 1.05;
    const operatingPointPercentBep = bepFlowRate <= 0 ? 0 : (flowRate / bepFlowRate) * 100;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (dto.npshAvailable && dto.npshAvailable < npshRequired * 1.3) {
      warnings.push(
        `NPSHa (${dto.npshAvailable}m) is close to NPSHr (${npshRequired.toFixed(2)}m). Risk of cavitation.`,
      );
    }

    if (operatingPointPercentBep < 70 || operatingPointPercentBep > 120) {
      warnings.push(
        `Operating point (${operatingPointPercentBep.toFixed(0)}% of BEP) is outside optimal range (70-120%).`,
      );
    }

    if (dto.viscosity && dto.viscosity > 100) {
      recommendations.push("Consider positive displacement pump for high viscosity fluids.");
    }

    if (dto.solidsContent && dto.solidsContent > 10) {
      recommendations.push(
        "Consider slurry pump or recessed impeller design for high solids content.",
      );
    }

    if (dto.isAbrasive) {
      recommendations.push(
        "Use hardened materials (high chrome, ceramic, or rubber-lined) for abrasive service.",
      );
    }

    if (dto.isCorrosive) {
      recommendations.push(
        "Select corrosion-resistant materials appropriate for the specific chemical.",
      );
    }

    if (specificSpeed < 500) {
      recommendations.push("Low specific speed - consider radial flow centrifugal pump.");
    } else if (specificSpeed > 10000) {
      recommendations.push("High specific speed - consider axial flow pump or mixed flow design.");
    }

    return {
      hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
      estimatedMotorPowerKw: Math.round(estimatedMotorPowerKw * 100) / 100,
      estimatedEfficiency: Math.round(estimatedEfficiency * 10) / 10,
      specificSpeed: Math.round(specificSpeed),
      recommendedPumpType,
      npshRequired: Math.round(npshRequired * 100) / 100,
      bepFlowRate: Math.round(bepFlowRate * 10) / 10,
      bepHead: Math.round(bepHead * 10) / 10,
      operatingPointPercentBep: Math.round(operatingPointPercentBep),
      warnings,
      recommendations,
    };
  }

  private normalizeScheduleNumber(scheduleNumber: string): string {
    if (!scheduleNumber) return scheduleNumber;
    const schMatch = scheduleNumber.match(/^[Ss]ch\s*(\d+)(?:\/\w+)?$/);
    if (schMatch) return schMatch[1];
    const numMatch = scheduleNumber.match(/^(\d+)(?:\/\w+)?$/);
    if (numMatch) return numMatch[1];
    return scheduleNumber;
  }

  private bendWeight(dto: CreateBendRfqDto): {
    bendBodyWeight: number;
    tangentWeight: number;
    totalWeight: number;
  } {
    const bendBodyWeight = (dto.nominalBoreMm / 25) ** 2 * 2;
    const tangentWeight = dto.tangentLengths.reduce((total, length) => {
      return total + (length / 1000) * (dto.nominalBoreMm / 25) * STEEL_DENSITY_KG_DM3;
    }, 0);
    return { bendBodyWeight, tangentWeight, totalWeight: bendBodyWeight + tangentWeight };
  }

  private centerToFace(dto: CreateBendRfqDto): number {
    if (!dto.bendType) return dto.nominalBoreMm * 1.5;
    const multiplier = parseFloat(dto.bendType.replace("D", "")) || 1.5;
    const radius = dto.nominalBoreMm * multiplier;
    return radius * Math.sin((dto.bendDegrees * Math.PI) / 180 / 2);
  }

  private wallThicknessFromSchedule(scheduleNumber: string): number {
    const scheduleMap: { [key: string]: number } = {
      Sch10: 2.77,
      Sch20: 3.91,
      Sch30: 5.54,
      Sch40: 6.35,
      Sch80: 8.74,
      Sch160: 14.27,
    };
    return scheduleMap[scheduleNumber] || 6.35;
  }

  private pumpEfficiency(flowRate: number, head: number, pumpType: string): number {
    let baseEfficiency = 70;
    if (flowRate > 100) {
      baseEfficiency += Math.min(15, Math.log10(flowRate / 100) * 10);
    } else if (flowRate < 10) {
      baseEfficiency -= 15;
    }
    if (head > 100) {
      baseEfficiency -= Math.min(10, (head - 100) / 50);
    }
    if (pumpType.includes("multistage") || pumpType.includes("positive_displacement")) {
      baseEfficiency -= 5;
    }
    return Math.max(30, Math.min(90, baseEfficiency));
  }

  private specificSpeed(flowRate: number, head: number): number {
    if (head <= 0 || flowRate <= 0) return 0;
    const n = 2900;
    return (n * Math.sqrt(flowRate)) / head ** 0.75;
  }

  private recommendedPumpType(specificSpeed: number): string {
    if (specificSpeed < 500) return "Radial flow centrifugal pump";
    if (specificSpeed < 2000) return "End suction centrifugal pump";
    if (specificSpeed < 5000) return "Mixed flow pump";
    if (specificSpeed < 10000) return "Axial flow pump";
    return "Propeller pump or axial flow design";
  }

  private npshRequired(flowRate: number, specificSpeed: number): number {
    const baseNpsh = 2.5;
    const flowFactor = (flowRate / 100) ** 0.33;
    const speedFactor = specificSpeed > 2000 ? 1.2 : 1.0;
    return baseNpsh * flowFactor * speedFactor;
  }
}
