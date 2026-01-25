import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sabs62FittingDimension } from '../sabs62-fitting-dimension/entities/sabs62-fitting-dimension.entity';
import { Sabs719FittingDimension } from '../sabs719-fitting-dimension/entities/sabs719-fitting-dimension.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';
import { BoltMass } from '../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../nut-mass/entities/nut-mass.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';
import { FittingStandard, FittingType } from './dto/get-fitting-dimensions.dto';
import {
  CalculateFittingDto,
  FittingCalculationResultDto,
} from './dto/calculate-fitting.dto';

@Injectable()
export class FittingService {
  constructor(
    @InjectRepository(Sabs62FittingDimension)
    private sabs62Repository: Repository<Sabs62FittingDimension>,
    @InjectRepository(Sabs719FittingDimension)
    private sabs719Repository: Repository<Sabs719FittingDimension>,
    @InjectRepository(PipeDimension)
    private pipeDimensionRepository: Repository<PipeDimension>,
    @InjectRepository(NbNpsLookup)
    private nbNpsLookupRepository: Repository<NbNpsLookup>,
    @InjectRepository(FlangeDimension)
    private flangeDimensionRepository: Repository<FlangeDimension>,
    @InjectRepository(BoltMass)
    private boltMassRepository: Repository<BoltMass>,
    @InjectRepository(NutMass)
    private nutMassRepository: Repository<NutMass>,
    @InjectRepository(SteelSpecification)
    private steelSpecRepository: Repository<SteelSpecification>,
  ) {}

  async getFittingDimensions(
    standard: FittingStandard,
    fittingType: FittingType,
    nominalDiameterMm: number,
    angleRange?: string,
  ) {
    if (standard === FittingStandard.SABS62) {
      return this.getSabs62FittingDimensions(
        fittingType,
        nominalDiameterMm,
        angleRange,
      );
    } else {
      return this.getSabs719FittingDimensions(
        fittingType,
        nominalDiameterMm,
        angleRange,
      );
    }
  }

  private async getSabs62FittingDimensions(
    fittingType: FittingType,
    nominalDiameterMm: number,
    angleRange?: string,
  ) {
    const queryBuilder = this.sabs62Repository
      .createQueryBuilder('fitting')
      .where('fitting.fittingType = :fittingType', { fittingType })
      .andWhere('fitting.nominalDiameterMm = :nominalDiameterMm', {
        nominalDiameterMm,
      });

    if (angleRange) {
      queryBuilder.andWhere('fitting.angleRange = :angleRange', { angleRange });
    }

    const fitting = await queryBuilder.getOne();

    if (!fitting) {
      throw new NotFoundException(
        `SABS62 fitting not found for type ${fittingType}, diameter ${nominalDiameterMm}mm${angleRange ? `, angle range ${angleRange}` : ''}`,
      );
    }

    return fitting;
  }

  private async getSabs719FittingDimensions(
    fittingType: FittingType,
    nominalDiameterMm: number,
    angleRange?: string,
  ) {
    const queryBuilder = this.sabs719Repository
      .createQueryBuilder('fitting')
      .where('fitting.fittingType = :fittingType', { fittingType })
      .andWhere('fitting.nominalDiameterMm = :nominalDiameterMm', {
        nominalDiameterMm,
      });

    if (angleRange) {
      queryBuilder.andWhere('fitting.angleRange = :angleRange', { angleRange });
    }

    const fitting = await queryBuilder.getOne();

    if (!fitting) {
      throw new NotFoundException(
        `SABS719 fitting not found for type ${fittingType}, diameter ${nominalDiameterMm}mm`,
      );
    }

    return fitting;
  }

  async getAvailableFittingTypes(standard: FittingStandard) {
    if (standard === FittingStandard.SABS62) {
      const types = await this.sabs62Repository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.fittingType', 'fittingType')
        .getRawMany();
      return types.map((t) => t.fittingType);
    } else {
      const types = await this.sabs719Repository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.fittingType', 'fittingType')
        .getRawMany();
      return types.map((t) => t.fittingType);
    }
  }

  async getAvailableSizes(standard: FittingStandard, fittingType: FittingType) {
    if (standard === FittingStandard.SABS62) {
      const sizes = await this.sabs62Repository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.nominalDiameterMm', 'nominalDiameterMm')
        .where('fitting.fittingType = :fittingType', { fittingType })
        .orderBy('fitting.nominalDiameterMm', 'ASC')
        .getRawMany();
      return sizes.map((s) => parseFloat(s.nominalDiameterMm));
    } else {
      const sizes = await this.sabs719Repository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.nominalDiameterMm', 'nominalDiameterMm')
        .where('fitting.fittingType = :fittingType', { fittingType })
        .orderBy('fitting.nominalDiameterMm', 'ASC')
        .getRawMany();
      return sizes.map((s) => parseFloat(s.nominalDiameterMm));
    }
  }

  async getAvailableAngleRanges(
    fittingType: FittingType,
    nominalDiameterMm: number,
  ) {
    const angleRanges = await this.sabs62Repository
      .createQueryBuilder('fitting')
      .select('DISTINCT fitting.angleRange', 'angleRange')
      .where('fitting.fittingType = :fittingType', { fittingType })
      .andWhere('fitting.nominalDiameterMm = :nominalDiameterMm', {
        nominalDiameterMm,
      })
      .andWhere('fitting.angleRange IS NOT NULL')
      .getRawMany();
    return angleRanges.map((a) => a.angleRange).filter(Boolean);
  }

  async calculateFitting(
    dto: CalculateFittingDto,
  ): Promise<FittingCalculationResultDto> {
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
      throw new BadRequestException(
        'Schedule number is required for SABS719 fittings',
      );
    }
    if (dto.pipeLengthAMm === undefined || dto.pipeLengthBMm === undefined) {
      throw new BadRequestException(
        'Pipe lengths A and B are required for SABS719 fittings',
      );
    }

    // Get fitting dimensions from SABS719 table
    const fittingDimensions = await this.getSabs719FittingDimensions(
      dto.fittingType,
      dto.nominalDiameterMm,
    );

    // Get steel specification
    let steelSpec: SteelSpecification | null = null;
    if (dto.steelSpecificationId) {
      steelSpec = await this.steelSpecRepository.findOne({
        where: { id: dto.steelSpecificationId },
      });
      if (!steelSpec) {
        throw new NotFoundException(
          `Steel specification with ID ${dto.steelSpecificationId} not found`,
        );
      }
    }

    // Generate possible schedule formats to try (DB stores various formats: Sch20, Sch40, MEDIUM, HEAVY, WT6, etc.)
    const possibleScheduleFormats = (scheduleNumber: string): string[] => {
      if (!scheduleNumber) return [scheduleNumber];
      const formats: string[] = [scheduleNumber];

      // Extract number from various formats
      const schMatch = scheduleNumber.match(/^[Ss]ch\s*(\d+[Ss]?)(?:\/\w+)?$/);
      const numMatch = scheduleNumber.match(/^(\d+)(?:\/\w+)?$/);
      const num = schMatch ? schMatch[1] : numMatch ? numMatch[1] : null;

      if (num) {
        formats.push(`Sch${num}`);
        formats.push(`Sch ${num}`);
        formats.push(num);
      }

      return [...new Set(formats)];
    };

    const scheduleFormats = possibleScheduleFormats(dto.scheduleNumber);

    // Find pipe dimension trying multiple schedule formats
    let pipeDimension: PipeDimension | null = null;
    for (const scheduleFormat of scheduleFormats) {
      pipeDimension = await this.pipeDimensionRepository.findOne({
        where: {
          nominalOutsideDiameter: {
            nominal_diameter_mm: dto.nominalDiameterMm,
          },
          schedule_designation: scheduleFormat,
          ...(steelSpec && { steelSpecification: { id: steelSpec.id } }),
        },
        relations: ['nominalOutsideDiameter', 'steelSpecification'],
      });
      if (pipeDimension) break;
    }

    if (!pipeDimension) {
      throw new NotFoundException(
        `Pipe dimension not found for ${dto.nominalDiameterMm}NB, schedule ${dto.scheduleNumber}`,
      );
    }

    // Get NB-NPS lookup for outside diameter
    const nbNpsLookup = await this.nbNpsLookupRepository.findOne({
      where: { nb_mm: dto.nominalDiameterMm },
    });

    if (!nbNpsLookup) {
      throw new NotFoundException(
        `NB-NPS lookup not found for ${dto.nominalDiameterMm}NB`,
      );
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;
    const wallThicknessMm = pipeDimension.wall_thickness_mm;

    // Calculate pipe weight for lengths A and B
    let pipeWeightPerMeter: number;
    if (pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0) {
      pipeWeightPerMeter = pipeDimension.mass_kgm;
    } else {
      const steelDensity = 7.85; // kg/dm³
      pipeWeightPerMeter =
        (Math.PI *
          wallThicknessMm *
          (outsideDiameterMm - wallThicknessMm) *
          steelDensity) /
        1000;
    }

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
      'SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE',
      'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE',
      'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE',
    ].includes(dto.fittingType);
    const isGussetType = dto.fittingType.includes('GUSSET');
    const isLateralType = ['LATERAL', 'Y_PIECE'].includes(dto.fittingType);

    if (isTeeType && fittingDimensions) {
      // Use dimensionBMm for gusset tees, dimensionAMm for short tees
      const branchHeightMm = isGussetType
        ? (fittingDimensions.dimensionBMm || fittingDimensions.dimensionAMm || 0)
        : (fittingDimensions.dimensionAMm || 0);
      branchPipeWeight = pipeWeightPerMeter * (branchHeightMm / 1000);
    } else if (isLateralType && fittingDimensions) {
      // For laterals, use dimensionAMm as the branch height
      const branchHeightMm = fittingDimensions.dimensionAMm || 0;
      branchPipeWeight = pipeWeightPerMeter * (branchHeightMm / 1000);
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
        const gussetVolumeDm3 = gussetVolumeMm3 / 1e6; // Convert mm³ to dm³

        const steelDensity = 7.85; // kg/dm³
        const singleGussetWeight = gussetVolumeDm3 * steelDensity;

        // 2 gussets per tee
        gussetWeight = 2 * singleGussetWeight * dto.quantityValue;

        // Gusset weld runs along 3 edges of each triangular gusset
        // At 45°: hypotenuse = leg × √2, plus two legs
        const hypotenuseMm = gussetLegMm * Math.sqrt(2);
        const singleGussetWeldLengthMm = hypotenuseMm + (2 * gussetLegMm);

        // 2 gussets per tee, convert to meters
        gussetWeldLength = (2 * singleGussetWeldLengthMm / 1000) * dto.quantityValue;
      }
    }

    // Calculate weld weights
    // 1 tee/lateral weld per fitting + flange welds
    // For SABS719, typically 3 flanges (one on each outlet)
    const numberOfFlangesPerFitting = 3;
    const numberOfFlanges = numberOfFlangesPerFitting * dto.quantityValue;
    const numberOfFlangeWelds = numberOfFlanges;
    const numberOfTeeWelds = dto.quantityValue; // 1 tee weld per fitting

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
        const flangeDimension = await this.flangeDimensionRepository.findOne({
          where: {
            nominalOutsideDiameter: {
              nominal_diameter_mm: dto.nominalDiameterMm,
            },
            standard: { id: dto.flangeStandardId },
            pressureClass: { id: dto.flangePressureClassId },
          },
          relations: ['bolt', 'nominalOutsideDiameter'],
        });

        if (flangeDimension) {
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);

            const boltMass = await this.boltMassRepository
              .createQueryBuilder('bm')
              .where('bm.bolt = :boltId', { boltId: flangeDimension.bolt.id })
              .andWhere('bm.length_mm >= :minLength', {
                minLength: estimatedBoltLengthMm,
              })
              .orderBy('bm.length_mm', 'ASC')
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
        console.warn('Flange weight calculation failed:', error.message);
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
    const nbNpsLookup = await this.nbNpsLookupRepository.findOne({
      where: { nb_mm: dto.nominalDiameterMm },
    });

    if (!nbNpsLookup) {
      throw new NotFoundException(
        `NB-NPS lookup not found for ${dto.nominalDiameterMm}NB`,
      );
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;

    // For SABS62, we'll estimate wall thickness based on standard schedules
    // Typically these are Sch40 or STD
    const wallThicknessMm = this.estimateWallThickness(dto.nominalDiameterMm);

    // Calculate fitting body weight based on standard dimensions
    // Using a simplified formula based on fitting dimensions from the table
    // Mass estimation: use density and approximate volume
    const steelDensityKgM3 = 7850; // kg/m³ (7.85 kg/dm³ = 7850 kg/m³)

    // Estimate fitting weight based on center-to-face and nominal diameter
    // This is a simplified calculation - in reality, exact volumes would be used
    // Formula: C/F length × cross-section area × shape factor
    const estimatedVolumeM3 =
      (fittingDimensions.centreToFaceCMm / 1000) * // mm to m
      Math.PI *
      Math.pow(outsideDiameterMm / 1000, 2) * // (mm to m)²
      0.5; // factor for tee/cross/lateral shape
    const fittingWeight =
      estimatedVolumeM3 * steelDensityKgM3 * dto.quantityValue;

    // For SABS62, typically 3 flanges for tees/crosses/laterals
    const numberOfFlangesPerFitting = 3;
    const numberOfFlanges = numberOfFlangesPerFitting * dto.quantityValue;
    const numberOfFlangeWelds = numberOfFlanges;
    const numberOfTeeWelds = 0; // SABS62 are standard fittings, no fabrication welds

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

      const steelSpec = await this.steelSpecRepository.findOne({
        where: { id: dto.steelSpecificationId },
      });

      const pipeDimension = await this.pipeDimensionRepository.findOne({
        where: {
          nominalOutsideDiameter: {
            nominal_diameter_mm: dto.nominalDiameterMm,
          },
          schedule_designation: normalizedSchedule,
          ...(steelSpec && { steelSpecification: { id: steelSpec.id } }),
        },
        relations: ['nominalOutsideDiameter', 'steelSpecification'],
      });

      if (pipeDimension) {
        let pipeWeightPerMeter: number;
        if (pipeDimension.mass_kgm && pipeDimension.mass_kgm > 0) {
          pipeWeightPerMeter = pipeDimension.mass_kgm;
        } else {
          const steelDensity = 7.85; // kg/dm³ - used with /1000 for pipe weight formula
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
          'SHORT_TEE', 'GUSSET_TEE', 'EQUAL_TEE',
          'UNEQUAL_SHORT_TEE', 'UNEQUAL_GUSSET_TEE',
          'SHORT_REDUCING_TEE', 'GUSSET_REDUCING_TEE',
        ].includes(dto.fittingType);
        const isLateralType = ['LATERAL', 'Y_PIECE'].includes(dto.fittingType);

        if ((isTeeType || isLateralType) && fittingDimensions) {
          // Use centreToFaceCMm as the branch height
          branchPipeLength = fittingDimensions.centreToFaceCMm || 0;
        }

        const totalTangentLength = runPipeLength + branchPipeLength;
        totalPipeWeight =
          pipeWeightPerMeter * (totalTangentLength / 1000) * dto.quantityValue;
      }
    }

    // Calculate flange, bolt, and nut weights
    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        const flangeDimension = await this.flangeDimensionRepository.findOne({
          where: {
            nominalOutsideDiameter: {
              nominal_diameter_mm: dto.nominalDiameterMm,
            },
            standard: { id: dto.flangeStandardId },
            pressureClass: { id: dto.flangePressureClassId },
          },
          relations: ['bolt', 'nominalOutsideDiameter'],
        });

        if (flangeDimension) {
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);

            const boltMass = await this.boltMassRepository
              .createQueryBuilder('bm')
              .where('bm.bolt = :boltId', { boltId: flangeDimension.bolt.id })
              .andWhere('bm.length_mm >= :minLength', {
                minLength: estimatedBoltLengthMm,
              })
              .orderBy('bm.length_mm', 'ASC')
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
        console.warn('Flange weight calculation failed:', error.message);
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
