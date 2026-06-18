import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BoltMassRepository } from "../bolt-mass/bolt-mass.repository";
import { FlangeDimensionRepository } from "../flange-dimension/flange-dimension.repository";
import { FlangeTypeWeightService } from "../flange-type-weight/flange-type-weight.service";
import { STEEL_DENSITY_KG_M3 } from "../lib/steel-constants";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { NutMassRepository } from "../nut-mass/nut-mass.repository";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { Sabs62FittingDimensionRepository } from "../sabs62-fitting-dimension/sabs62-fitting-dimension.repository";
import { Sabs719FittingDimensionRepository } from "../sabs719-fitting-dimension/sabs719-fitting-dimension.repository";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { SteelSpecificationRepository } from "../steel-specification/steel-specification.repository";
import { CalculateFittingDto, FittingCalculationResultDto } from "./dto/calculate-fitting.dto";
import { FittingStandard, FittingType } from "./dto/get-fitting-dimensions.dto";

@Injectable()
export class FittingService {
  private readonly logger = new Logger(FittingService.name);

  constructor(
    private readonly sabs62Repository: Sabs62FittingDimensionRepository,
    private readonly sabs719Repository: Sabs719FittingDimensionRepository,
    private pipeDimensionRepository: PipeDimensionRepository,
    private nbNpsLookupRepository: NbNpsLookupRepository,
    private flangeDimensionRepository: FlangeDimensionRepository,
    private boltMassRepository: BoltMassRepository,
    private nutMassRepository: NutMassRepository,
    private steelSpecRepository: SteelSpecificationRepository,
    private flangeTypeWeightService: FlangeTypeWeightService,
  ) {}

  // Prefer the authoritative per-type flange weight table; fall back to the
  // type-ambiguous flange_dimensions.mass_kg only when no per-type row is
  // found (so the number is unchanged in that case). The fitting DTO carries
  // only standard/pressure-class IDs, so resolve the standard code and
  // pressure-class designation (which embeds the /type suffix for SABS 1123 /
  // BS 4504) from the flange-dimension reference tables.
  private async perFlangeWeightKg(
    nominalDiameterMm: number,
    flangeStandardId: number,
    flangePressureClassId: number,
    massKgFallback: number,
  ): Promise<number> {
    const [standard, pressureClass] = await Promise.all([
      this.flangeDimensionRepository.findStandardById(flangeStandardId),
      this.flangeDimensionRepository.findPressureClassById(flangePressureClassId),
    ]);

    const perTypeWeight = await this.flangeTypeWeightService.flangeTypeWeightForDesignation(
      nominalDiameterMm,
      pressureClass?.designation,
      standard?.code,
    );

    return perTypeWeight.found && perTypeWeight.weightKg !== null
      ? perTypeWeight.weightKg
      : massKgFallback;
  }

  async getFittingDimensions(
    standard: FittingStandard,
    fittingType: FittingType,
    nominalDiameterMm: number,
    angleRange?: string,
  ) {
    if (standard === FittingStandard.SABS62) {
      return this.getSabs62FittingDimensions(fittingType, nominalDiameterMm, angleRange);
    } else {
      return this.getSabs719FittingDimensions(fittingType, nominalDiameterMm, angleRange);
    }
  }

  private async getSabs62FittingDimensions(
    fittingType: FittingType,
    nominalDiameterMm: number,
    angleRange?: string,
  ) {
    const fitting = await this.sabs62Repository.findByTypeAndDiameter(
      fittingType,
      nominalDiameterMm,
      angleRange,
    );

    if (!fitting) {
      throw new NotFoundException(
        `SABS62 fitting not found for type ${fittingType}, diameter ${nominalDiameterMm}mm${angleRange ? `, angle range ${angleRange}` : ""}`,
      );
    }

    return fitting;
  }

  private async getSabs719FittingDimensions(
    fittingType: FittingType,
    nominalDiameterMm: number,
    angleRange?: string,
  ) {
    const fitting = await this.sabs719Repository.findByTypeAndDiameter(
      fittingType,
      nominalDiameterMm,
      angleRange,
    );

    if (!fitting) {
      throw new NotFoundException(
        `SABS719 fitting not found for type ${fittingType}, diameter ${nominalDiameterMm}mm`,
      );
    }

    return fitting;
  }

  async getAvailableFittingTypes(standard: FittingStandard) {
    if (standard === FittingStandard.SABS62) {
      return this.sabs62Repository.distinctFittingTypes();
    } else {
      return this.sabs719Repository.distinctFittingTypes();
    }
  }

  async getAvailableSizes(standard: FittingStandard, fittingType: FittingType) {
    if (standard === FittingStandard.SABS62) {
      return this.sabs62Repository.distinctSizes(fittingType);
    } else {
      return this.sabs719Repository.distinctSizes(fittingType);
    }
  }

  async getAvailableAngleRanges(fittingType: FittingType, nominalDiameterMm: number) {
    return this.sabs62Repository.distinctAngleRanges(fittingType, nominalDiameterMm);
  }

  async calculateFitting(dto: CalculateFittingDto): Promise<FittingCalculationResultDto> {
    if (dto.fittingStandard === FittingStandard.SABS719) {
      return this.calculateSabs719Fitting(dto);
    } else {
      return this.calculateSabs62Fitting(dto);
    }
  }

  private async calculateSabs719Fitting(
    dto: CalculateFittingDto,
  ): Promise<FittingCalculationResultDto> {
    // SABS719: Fabricated fittings - use pipe table for cut lengths + welds

    // Validate required fields for SABS719
    if (!dto.scheduleNumber) {
      throw new BadRequestException("Schedule number is required for SABS719 fittings");
    }
    if (dto.pipeLengthAMm === undefined || dto.pipeLengthBMm === undefined) {
      throw new BadRequestException("Pipe lengths A and B are required for SABS719 fittings");
    }

    // Get fitting dimensions from SABS719 table
    const fittingDimensions = await this.getSabs719FittingDimensions(
      dto.fittingType,
      dto.nominalDiameterMm,
    );

    // Get steel specification
    let steelSpec: SteelSpecification | null = null;
    if (dto.steelSpecificationId) {
      steelSpec = await this.steelSpecRepository.findById(dto.steelSpecificationId);
      if (!steelSpec) {
        throw new NotFoundException(
          `Steel specification with ID ${dto.steelSpecificationId} not found`,
        );
      }
    }

    const mainPipe = await this.resolvePerMeterPipeWeight(
      dto.nominalDiameterMm,
      dto.scheduleNumber,
      steelSpec?.id,
    );

    const outsideDiameterMm = mainPipe.outsideDiameterMm;
    const wallThicknessMm = mainPipe.wallThicknessMm;
    const pipeWeightPerMeter = mainPipe.pipeWeightPerMeter;

    const branchDiameterMm = dto.branchDiameterMm ?? null;
    const branchPipe =
      branchDiameterMm !== null && branchDiameterMm !== dto.nominalDiameterMm
        ? await this.resolvePerMeterPipeWeight(branchDiameterMm, dto.scheduleNumber, steelSpec?.id)
        : mainPipe;
    const branchPipeWeightPerMeter = branchPipe.pipeWeightPerMeter;

    // Calculate weights for pipe sections (convert mm to m)
    // Run pipe: user-specified lengths A and B
    const pipeWeightA = pipeWeightPerMeter * (dto.pipeLengthAMm / 1000);
    const pipeWeightB = pipeWeightPerMeter * (dto.pipeLengthBMm / 1000);
    const runPipeWeight = pipeWeightA + pipeWeightB;

    // Branch pipe: for tees and laterals, add the branch height from fitting dimensions
    // For tees: dimensionAMm is the center-to-face height (branch length)
    // For gusset tees: dimensionBMm is the center-to-face height
    let branchPipeWeight = 0;
    const isTeeType = [
      "SHORT_TEE",
      "GUSSET_TEE",
      "EQUAL_TEE",
      "UNEQUAL_SHORT_TEE",
      "UNEQUAL_GUSSET_TEE",
      "SHORT_REDUCING_TEE",
      "GUSSET_REDUCING_TEE",
    ].includes(dto.fittingType);
    const isGussetType = dto.fittingType.includes("GUSSET");
    const isLateralType = ["LATERAL", "Y_PIECE"].includes(dto.fittingType);

    if (isTeeType && fittingDimensions) {
      // Use dimensionBMm for gusset tees, dimensionAMm for short tees
      const branchHeightMm = isGussetType
        ? fittingDimensions.dimensionBMm || fittingDimensions.dimensionAMm || 0
        : fittingDimensions.dimensionAMm || 0;
      branchPipeWeight = branchPipeWeightPerMeter * (branchHeightMm / 1000);
    } else if (isLateralType && fittingDimensions) {
      // For laterals, use dimensionAMm as the branch height
      const branchHeightMm = fittingDimensions.dimensionAMm || 0;
      branchPipeWeight = branchPipeWeightPerMeter * (branchHeightMm / 1000);
    }

    const totalPipeWeight = (runPipeWeight + branchPipeWeight) * dto.quantityValue;

    // Calculate gusset weight for gusset tees
    // Gussets are triangular reinforcement plates welded between run and branch pipes
    // 2 gussets per tee (one on each side of the branch)
    let gussetWeight = 0;
    let gussetWeldLength = 0;
    let gussetSectionMm = 0;

    if (isGussetType && fittingDimensions) {
      // Gusset section C is directly from the SABS 719 table
      // C represents the gusset dimension as shown in the technical drawing
      // The gusset extends at 45° from the branch pipe
      gussetSectionMm = fittingDimensions.dimensionCMm || 0;

      // Fallback: if C is not available, calculate from B - A
      if (!gussetSectionMm && fittingDimensions.dimensionBMm && fittingDimensions.dimensionAMm) {
        gussetSectionMm = fittingDimensions.dimensionBMm - fittingDimensions.dimensionAMm;
      }

      if (gussetSectionMm > 0) {
        // Each gusset is a right triangle at 45° angle
        // Per the technical drawing: C is the gusset section dimension
        // At 45°, both legs of the triangle are equal to C
        const gussetLegMm = gussetSectionMm;
        const gussetThicknessMm = wallThicknessMm;

        // Triangle area = 0.5 × leg × leg (isoceles right triangle at 45°)
        const gussetAreaMm2 = 0.5 * gussetLegMm * gussetLegMm;
        const gussetVolumeMm3 = gussetAreaMm2 * gussetThicknessMm;
        // Convert mm³ to dm³
        const gussetVolumeDm3 = gussetVolumeMm3 / 1e6;

        // kg/dm³
        const steelDensity = 7.85;
        const singleGussetWeight = gussetVolumeDm3 * steelDensity;

        // 2 gussets per tee
        gussetWeight = 2 * singleGussetWeight * dto.quantityValue;

        // Gusset weld runs along 3 edges of each triangular gusset
        // At 45°: hypotenuse = leg × √2, plus two legs
        const hypotenuseMm = gussetLegMm * Math.sqrt(2);
        const singleGussetWeldLengthMm = hypotenuseMm + 2 * gussetLegMm;

        // 2 gussets per tee, convert to meters
        gussetWeldLength = ((2 * singleGussetWeldLengthMm) / 1000) * dto.quantityValue;
      }
    }

    // Calculate weld weights
    // 1 tee/lateral weld per fitting + flange welds
    // For SABS719, typically 3 flanges (one on each outlet)
    const numberOfFlangesPerFitting = 3;
    const numberOfFlanges = numberOfFlangesPerFitting * dto.quantityValue;
    const numberOfFlangeWelds = numberOfFlanges;
    // 1 tee weld per fitting
    const numberOfTeeWelds = dto.quantityValue;

    // Calculate weld lengths - 2 welds per flange (inside + outside)
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * 2 * circumferenceM;
    const totalTeeWeldLength = numberOfTeeWelds * circumferenceM;

    // Estimate weld weight (typical: 2-3% of pipe weight for butt welds)
    // Include gusset weld length in calculation
    const weldWeight =
      totalPipeWeight * 0.025 +
      (totalFlangeWeldLength + totalTeeWeldLength + gussetWeldLength) * 0.5;

    // Calculate flange, bolt, and nut weights
    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        const flangeDimension =
          await this.flangeDimensionRepository.findByNominalDiameterStandardAndPressureClassWithBolt(
            dto.nominalDiameterMm,
            dto.flangeStandardId,
            dto.flangePressureClassId,
          );

        if (flangeDimension) {
          const perFlangeWeight = await this.perFlangeWeightKg(
            dto.nominalDiameterMm,
            dto.flangeStandardId,
            dto.flangePressureClassId,
            flangeDimension.mass_kg,
          );
          totalFlangeWeight = numberOfFlanges * perFlangeWeight;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);

            const boltMass = await this.boltMassRepository.findClosestByBoltAndMinLength(
              flangeDimension.bolt.id,
              estimatedBoltLengthMm,
            );

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            const nutMass = await this.nutMassRepository.findByBoltId(flangeDimension.bolt.id);

            if (nutMass) {
              const totalNuts = numberOfFlanges * flangeDimension.num_holes;
              totalNutWeight = totalNuts * nutMass.mass_kg;
            }
          }
        }
      } catch (error) {
        this.logger.warn("Flange weight calculation failed:", error.message);
      }
    }

    // Fitting body weight is minimal for SABS719 (it's fabricated from pipe sections)
    const fittingWeight = 0;

    const totalWeight =
      totalPipeWeight +
      fittingWeight +
      totalFlangeWeight +
      totalBoltWeight +
      totalNutWeight +
      gussetWeight +
      weldWeight;

    return {
      totalWeight: Math.round(totalWeight * 100) / 100,
      fittingWeight: Math.round(fittingWeight * 100) / 100,
      pipeWeight: Math.round(totalPipeWeight * 100) / 100,
      runPipeWeightKg: Math.round(runPipeWeight * dto.quantityValue * 100) / 100,
      branchPipeWeightKg: Math.round(branchPipeWeight * dto.quantityValue * 100) / 100,
      branchPipeWeightPerMeter: Math.round(branchPipeWeightPerMeter * 100) / 100,
      flangeWeight: Math.round(totalFlangeWeight * 100) / 100,
      boltWeight: Math.round(totalBoltWeight * 100) / 100,
      nutWeight: Math.round(totalNutWeight * 100) / 100,
      gussetWeight: Math.round(gussetWeight * 100) / 100,
      weldWeight: Math.round(weldWeight * 100) / 100,
      numberOfFlanges,
      numberOfFlangeWelds,
      totalFlangeWeldLength: Math.round(totalFlangeWeldLength * 100) / 100,
      numberOfTeeWelds,
      totalTeeWeldLength: Math.round(totalTeeWeldLength * 100) / 100,
      gussetWeldLength: Math.round(gussetWeldLength * 100) / 100,
      gussetSectionMm: Math.round(gussetSectionMm * 100) / 100,
      outsideDiameterMm,
      wallThicknessMm,
    };
  }

  private async calculateSabs62Fitting(
    dto: CalculateFittingDto,
  ): Promise<FittingCalculationResultDto> {
    // SABS62: Standard fittings - use standard dimensions from table

    // Get fitting dimensions from SABS62 table
    const fittingDimensions = await this.getSabs62FittingDimensions(
      dto.fittingType,
      dto.nominalDiameterMm,
      dto.angleRange,
    );

    // Get NB-NPS lookup for outside diameter
    const nbNpsLookup = await this.nbNpsLookupRepository.findByNbMm(dto.nominalDiameterMm);

    if (!nbNpsLookup) {
      throw new NotFoundException(`NB-NPS lookup not found for ${dto.nominalDiameterMm}NB`);
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;

    // For SABS62, we'll estimate wall thickness based on standard schedules
    // Typically these are Sch40 or STD
    const wallThicknessMm = this.estimateWallThickness(dto.nominalDiameterMm);

    // Calculate fitting body weight based on standard dimensions
    // Using a simplified formula based on fitting dimensions from the table
    // Mass estimation: use density and approximate volume
    const steelDensityKgM3 = STEEL_DENSITY_KG_M3;

    // Estimate fitting weight based on center-to-face and nominal diameter
    // This is a simplified calculation - in reality, exact volumes would be used
    // Formula: C/F length (mm->m) × π × (OD mm->m)² × 0.5 tee/cross/lateral shape factor
    const estimatedVolumeM3 =
      (fittingDimensions.centreToFaceCMm / 1000) * Math.PI * (outsideDiameterMm / 1000) ** 2 * 0.5;
    const fittingWeight = estimatedVolumeM3 * steelDensityKgM3 * dto.quantityValue;

    // For SABS62, typically 3 flanges for tees/crosses/laterals
    const numberOfFlangesPerFitting = 3;
    const numberOfFlanges = numberOfFlangesPerFitting * dto.quantityValue;
    const numberOfFlangeWelds = numberOfFlanges;
    // SABS62 are standard fittings, no fabrication welds
    const numberOfTeeWelds = 0;

    // Calculate weld lengths - 2 welds per flange (inside + outside)
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * 2 * circumferenceM;
    const totalTeeWeldLength = 0;

    // Estimate weld weight
    const weldWeight = totalFlangeWeldLength * 0.5;

    // Calculate tangent weights if specified
    let totalPipeWeight = 0;
    if (dto.pipeLengthAMm && dto.scheduleNumber && dto.steelSpecificationId) {
      // If tangents are specified, calculate their weight
      const normalizeScheduleNumber = (scheduleNumber: string): string => {
        if (!scheduleNumber) return scheduleNumber;
        // Handle formats like "Sch10", "Sch 10", "Sch 40/STD", "Sch 80/XS"
        const schMatch = scheduleNumber.match(/^[Ss]ch\s*(\d+)(?:\/\w+)?$/);
        if (schMatch) {
          return schMatch[1];
        }
        // Handle just the number
        const numMatch = scheduleNumber.match(/^(\d+)(?:\/\w+)?$/);
        if (numMatch) {
          return numMatch[1];
        }
        return scheduleNumber;
      };

      const normalizedSchedule = normalizeScheduleNumber(dto.scheduleNumber);

      const steelSpec = await this.steelSpecRepository.findById(dto.steelSpecificationId);

      const pipeDimension =
        await this.pipeDimensionRepository.findByNominalDiameterScheduleAndSteel(
          dto.nominalDiameterMm,
          normalizedSchedule,
          steelSpec?.id,
        );

      if (pipeDimension) {
        let pipeWeightPerMeter: number;
        if (pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0) {
          pipeWeightPerMeter = pipeDimension.mass_kgm;
        } else {
          // kg/dm³ - used with /1000 for pipe weight formula
          const steelDensity = 7.85;
          pipeWeightPerMeter =
            (Math.PI *
              pipeDimension.wall_thickness_mm *
              (outsideDiameterMm - pipeDimension.wall_thickness_mm) *
              steelDensity) /
            1000;
        }

        // Run pipe: user-specified lengths A and B
        const runPipeLength = (dto.pipeLengthAMm || 0) + (dto.pipeLengthBMm || 0);

        // Branch pipe: for tees and laterals, add the branch height from fitting dimensions
        let branchPipeLength = 0;
        const isTeeType = [
          "SHORT_TEE",
          "GUSSET_TEE",
          "EQUAL_TEE",
          "UNEQUAL_SHORT_TEE",
          "UNEQUAL_GUSSET_TEE",
          "SHORT_REDUCING_TEE",
          "GUSSET_REDUCING_TEE",
        ].includes(dto.fittingType);
        const isLateralType = ["LATERAL", "Y_PIECE"].includes(dto.fittingType);

        if ((isTeeType || isLateralType) && fittingDimensions) {
          // Use centreToFaceCMm as the branch height
          branchPipeLength = fittingDimensions.centreToFaceCMm || 0;
        }

        const totalTangentLength = runPipeLength + branchPipeLength;
        totalPipeWeight = pipeWeightPerMeter * (totalTangentLength / 1000) * dto.quantityValue;
      }
    }

    // Calculate flange, bolt, and nut weights
    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        const flangeDimension =
          await this.flangeDimensionRepository.findByNominalDiameterStandardAndPressureClassWithBolt(
            dto.nominalDiameterMm,
            dto.flangeStandardId,
            dto.flangePressureClassId,
          );

        if (flangeDimension) {
          const perFlangeWeight = await this.perFlangeWeightKg(
            dto.nominalDiameterMm,
            dto.flangeStandardId,
            dto.flangePressureClassId,
            flangeDimension.mass_kg,
          );
          totalFlangeWeight = numberOfFlanges * perFlangeWeight;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);

            const boltMass = await this.boltMassRepository.findClosestByBoltAndMinLength(
              flangeDimension.bolt.id,
              estimatedBoltLengthMm,
            );

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            const nutMass = await this.nutMassRepository.findByBoltId(flangeDimension.bolt.id);

            if (nutMass) {
              const totalNuts = numberOfFlanges * flangeDimension.num_holes;
              totalNutWeight = totalNuts * nutMass.mass_kg;
            }
          }
        }
      } catch (error) {
        this.logger.warn("Flange weight calculation failed:", error.message);
      }
    }

    const totalWeight =
      totalPipeWeight +
      fittingWeight +
      totalFlangeWeight +
      totalBoltWeight +
      totalNutWeight +
      weldWeight;

    return {
      totalWeight: Math.round(totalWeight * 100) / 100,
      fittingWeight: Math.round(fittingWeight * 100) / 100,
      pipeWeight: Math.round(totalPipeWeight * 100) / 100,
      flangeWeight: Math.round(totalFlangeWeight * 100) / 100,
      boltWeight: Math.round(totalBoltWeight * 100) / 100,
      nutWeight: Math.round(totalNutWeight * 100) / 100,
      weldWeight: Math.round(weldWeight * 100) / 100,
      numberOfFlanges,
      numberOfFlangeWelds,
      totalFlangeWeldLength: Math.round(totalFlangeWeldLength * 100) / 100,
      numberOfTeeWelds,
      totalTeeWeldLength: Math.round(totalTeeWeldLength * 100) / 100,
      outsideDiameterMm,
      wallThicknessMm,
    };
  }

  private possibleScheduleFormats(scheduleNumber: string): string[] {
    if (!scheduleNumber) return [scheduleNumber];
    const formats: string[] = [scheduleNumber];

    const schMatch = scheduleNumber.match(/^[Ss]ch\s*(\d+[Ss]?)(?:\/\w+)?$/);
    const numMatch = scheduleNumber.match(/^(\d+)(?:\/\w+)?$/);
    const num = schMatch ? schMatch[1] : numMatch ? numMatch[1] : null;

    if (num) {
      formats.push(`Sch${num}`, `Sch ${num}`, num);
    }

    const wtMatch = scheduleNumber.match(/^[Ww][Tt]\s*(\d+(?:\.\d+)?)(?:\s*\(.*\))?$/);
    const mmMatch = scheduleNumber.match(/^(\d+(?:\.\d+)?)\s*mm$/i);
    const wallThickness = wtMatch ? wtMatch[1] : mmMatch ? mmMatch[1] : null;

    if (wallThickness) {
      formats.push(
        `WT${wallThickness}`,
        `WT ${wallThickness}`,
        `${wallThickness}mm`,
        wallThickness,
      );
    }

    return [...new Set(formats)];
  }

  private async resolvePerMeterPipeWeight(
    nominalDiameterMm: number,
    scheduleNumber: string,
    steelSpecId?: number,
  ): Promise<{ pipeWeightPerMeter: number; outsideDiameterMm: number; wallThicknessMm: number }> {
    const scheduleFormats = this.possibleScheduleFormats(scheduleNumber);

    let pipeDimension: PipeDimension | null = null;
    for (const scheduleFormat of scheduleFormats) {
      pipeDimension = await this.pipeDimensionRepository.findByNominalDiameterScheduleAndSteel(
        nominalDiameterMm,
        scheduleFormat,
        steelSpecId,
      );
      if (pipeDimension) break;
    }

    if (!pipeDimension) {
      throw new NotFoundException(
        `Pipe dimension not found for ${nominalDiameterMm}NB, schedule ${scheduleNumber}`,
      );
    }

    const nbNpsLookup = await this.nbNpsLookupRepository.findByNbMm(nominalDiameterMm);

    if (!nbNpsLookup) {
      throw new NotFoundException(`NB-NPS lookup not found for ${nominalDiameterMm}NB`);
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;
    const wallThicknessMm = pipeDimension.wall_thickness_mm;
    const steelDensityKgDm3 = 7.85;
    const pipeWeightPerMeter =
      pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0
        ? pipeDimension.mass_kgm
        : (Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * steelDensityKgDm3) /
          1000;

    return { pipeWeightPerMeter, outsideDiameterMm, wallThicknessMm };
  }

  private estimateWallThickness(nominalDiameterMm: number): number {
    // Estimate wall thickness based on nominal diameter
    // This is based on typical Sch40/STD values
    if (nominalDiameterMm <= 100) return 6.0;
    if (nominalDiameterMm <= 200) return 8.0;
    if (nominalDiameterMm <= 400) return 10.0;
    if (nominalDiameterMm <= 600) return 12.0;
    return 14.0;
  }
}
