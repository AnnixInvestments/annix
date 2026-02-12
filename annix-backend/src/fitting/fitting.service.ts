import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { CalculateFittingDto, FittingCalculationResultDto } from './dto/calculate-fitting.dto';

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
      return this.getSabs62FittingDimensions(fittingType, nominalDiameterMm, angleRange);
    } else {
      return this.getSabs719FittingDimensions(fittingType, nominalDiameterMm);
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
      .andWhere('fitting.nominalDiameterMm = :nominalDiameterMm', { nominalDiameterMm });

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
  ) {
    const fitting = await this.sabs719Repository.findOne({
      where: {
        fittingType,
        nominalDiameterMm,
      },
    });

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
      return types.map(t => t.fittingType);
    } else {
      const types = await this.sabs719Repository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.fittingType', 'fittingType')
        .getRawMany();
      return types.map(t => t.fittingType);
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
      return sizes.map(s => parseFloat(s.nominalDiameterMm));
    } else {
      const sizes = await this.sabs719Repository
        .createQueryBuilder('fitting')
        .select('DISTINCT fitting.nominalDiameterMm', 'nominalDiameterMm')
        .where('fitting.fittingType = :fittingType', { fittingType })
        .orderBy('fitting.nominalDiameterMm', 'ASC')
        .getRawMany();
      return sizes.map(s => parseFloat(s.nominalDiameterMm));
    }
  }

  async getAvailableAngleRanges(fittingType: FittingType, nominalDiameterMm: number) {
    const angleRanges = await this.sabs62Repository
      .createQueryBuilder('fitting')
      .select('DISTINCT fitting.angleRange', 'angleRange')
      .where('fitting.fittingType = :fittingType', { fittingType })
      .andWhere('fitting.nominalDiameterMm = :nominalDiameterMm', { nominalDiameterMm })
      .andWhere('fitting.angleRange IS NOT NULL')
      .getRawMany();
    return angleRanges.map(a => a.angleRange).filter(Boolean);
  }

  async calculateFitting(dto: CalculateFittingDto): Promise<FittingCalculationResultDto> {
    if (dto.fittingStandard === FittingStandard.SABS719) {
      return this.calculateSabs719Fitting(dto);
    } else {
      return this.calculateSabs62Fitting(dto);
    }
  }

  private async calculateSabs719Fitting(dto: CalculateFittingDto): Promise<FittingCalculationResultDto> {
    // SABS719: Fabricated fittings - use pipe table for cut lengths + welds

    // Validate required fields for SABS719
    if (!dto.scheduleNumber) {
      throw new BadRequestException('Schedule number is required for SABS719 fittings');
    }
    if (dto.pipeLengthAMm === undefined || dto.pipeLengthBMm === undefined) {
      throw new BadRequestException('Pipe lengths A and B are required for SABS719 fittings');
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
        throw new NotFoundException(`Steel specification with ID ${dto.steelSpecificationId} not found`);
      }
    }

    // Normalize schedule number (convert "Sch40" to "40", etc.)
    const normalizeScheduleNumber = (scheduleNumber: string): string => {
      if (!scheduleNumber) return scheduleNumber;
      const schMatch = scheduleNumber.match(/^[Ss]ch(\d+)$/);
      if (schMatch) {
        return schMatch[1];
      }
      return scheduleNumber;
    };

    const normalizedSchedule = normalizeScheduleNumber(dto.scheduleNumber);

    // Find pipe dimension for the specified nominal diameter and schedule
    const pipeDimension = await this.pipeDimensionRepository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalDiameterMm },
        schedule_designation: normalizedSchedule,
        ...(steelSpec && { steelSpecification: { id: steelSpec.id } }),
      },
      relations: ['nominalOutsideDiameter', 'steelSpecification'],
    });

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
      throw new NotFoundException(`NB-NPS lookup not found for ${dto.nominalDiameterMm}NB`);
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
        Math.PI * wallThicknessMm * (outsideDiameterMm - wallThicknessMm) * steelDensity / 1000;
    }

    // Calculate weights for pipe sections (convert mm to m)
    const pipeWeightA = pipeWeightPerMeter * (dto.pipeLengthAMm / 1000);
    const pipeWeightB = pipeWeightPerMeter * (dto.pipeLengthBMm / 1000);
    const totalPipeWeight = (pipeWeightA + pipeWeightB) * dto.quantityValue;

    // Calculate weld weights
    // 1 tee/lateral weld per fitting + flange welds
    // For SABS719, typically 3 flanges (one on each outlet)
    const numberOfFlangesPerFitting = 3;
    const numberOfFlanges = numberOfFlangesPerFitting * dto.quantityValue;
    const numberOfFlangeWelds = numberOfFlanges;
    const numberOfTeeWelds = dto.quantityValue; // 1 tee weld per fitting

    // Calculate weld lengths
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * circumferenceM;
    const totalTeeWeldLength = numberOfTeeWelds * circumferenceM;

    // Estimate weld weight (typical: 2-3% of pipe weight for butt welds)
    const weldWeight = (totalPipeWeight * 0.025) + ((totalFlangeWeldLength + totalTeeWeldLength) * 0.5);

    // Calculate flange, bolt, and nut weights
    let totalFlangeWeight = 0;
    let totalBoltWeight = 0;
    let totalNutWeight = 0;

    if (dto.flangeStandardId && dto.flangePressureClassId) {
      try {
        const flangeDimension = await this.flangeDimensionRepository.findOne({
          where: {
            nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalDiameterMm },
            standard: { id: dto.flangeStandardId },
            pressureClass: { id: dto.flangePressureClassId }
          },
          relations: ['bolt', 'nominalOutsideDiameter']
        });

        if (flangeDimension) {
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);
            
            const boltMass = await this.boltMassRepository
              .createQueryBuilder('bm')
              .where('bm.bolt = :boltId', { boltId: flangeDimension.bolt.id })
              .andWhere('bm.length_mm >= :minLength', { minLength: estimatedBoltLengthMm })
              .orderBy('bm.length_mm', 'ASC')
              .getOne();

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            const nutMass = await this.nutMassRepository.findOne({
              where: { bolt: { id: flangeDimension.bolt.id } }
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

    const totalWeight = totalPipeWeight + fittingWeight + totalFlangeWeight + totalBoltWeight + totalNutWeight + weldWeight;

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

  private async calculateSabs62Fitting(dto: CalculateFittingDto): Promise<FittingCalculationResultDto> {
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
      throw new NotFoundException(`NB-NPS lookup not found for ${dto.nominalDiameterMm}NB`);
    }

    const outsideDiameterMm = nbNpsLookup.outside_diameter_mm;
    
    // For SABS62, we'll estimate wall thickness based on standard schedules
    // Typically these are Sch40 or STD
    const wallThicknessMm = this.estimateWallThickness(dto.nominalDiameterMm);

    // Calculate fitting body weight based on standard dimensions
    // Using a simplified formula based on fitting dimensions from the table
    // Mass estimation: use density and approximate volume
    const steelDensity = 7.85; // kg/dm³
    
    // Estimate fitting weight based on center-to-face and nominal diameter
    // This is a simplified calculation - in reality, exact volumes would be used
    const estimatedVolumeDm3 = (fittingDimensions.centreToFaceCMm / 1000) * 
                                Math.PI * Math.pow((outsideDiameterMm / 1000), 2) * 
                                0.5; // factor for tee/cross/lateral shape
    const fittingWeight = estimatedVolumeDm3 * steelDensity * dto.quantityValue;

    // For SABS62, typically 3 flanges for tees/crosses/laterals
    const numberOfFlangesPerFitting = 3;
    const numberOfFlanges = numberOfFlangesPerFitting * dto.quantityValue;
    const numberOfFlangeWelds = numberOfFlanges;
    const numberOfTeeWelds = 0; // SABS62 are standard fittings, no fabrication welds

    // Calculate weld lengths
    const circumferenceM = (Math.PI * outsideDiameterMm) / 1000;
    const totalFlangeWeldLength = numberOfFlangeWelds * circumferenceM;
    const totalTeeWeldLength = 0;

    // Estimate weld weight
    const weldWeight = totalFlangeWeldLength * 0.5;

    // Calculate tangent weights if specified
    let totalPipeWeight = 0;
    if (dto.pipeLengthAMm && dto.scheduleNumber && dto.steelSpecificationId) {
      // If tangents are specified, calculate their weight
      const normalizeScheduleNumber = (scheduleNumber: string): string => {
        if (!scheduleNumber) return scheduleNumber;
        const schMatch = scheduleNumber.match(/^[Ss]ch(\d+)$/);
        if (schMatch) {
          return schMatch[1];
        }
        return scheduleNumber;
      };

      const normalizedSchedule = normalizeScheduleNumber(dto.scheduleNumber);

      const steelSpec = await this.steelSpecRepository.findOne({
        where: { id: dto.steelSpecificationId },
      });

      const pipeDimension = await this.pipeDimensionRepository.findOne({
        where: {
          nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalDiameterMm },
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
          pipeWeightPerMeter = 
            Math.PI * pipeDimension.wall_thickness_mm * 
            (outsideDiameterMm - pipeDimension.wall_thickness_mm) * steelDensity / 1000;
        }

        const totalTangentLength = (dto.pipeLengthAMm || 0) + (dto.pipeLengthBMm || 0);
        totalPipeWeight = pipeWeightPerMeter * (totalTangentLength / 1000) * dto.quantityValue;
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
            nominalOutsideDiameter: { nominal_diameter_mm: dto.nominalDiameterMm },
            standard: { id: dto.flangeStandardId },
            pressureClass: { id: dto.flangePressureClassId }
          },
          relations: ['bolt', 'nominalOutsideDiameter']
        });

        if (flangeDimension) {
          totalFlangeWeight = numberOfFlanges * flangeDimension.mass_kg;

          if (flangeDimension.bolt) {
            const estimatedBoltLengthMm = Math.max(50, flangeDimension.b * 3);
            
            const boltMass = await this.boltMassRepository
              .createQueryBuilder('bm')
              .where('bm.bolt = :boltId', { boltId: flangeDimension.bolt.id })
              .andWhere('bm.length_mm >= :minLength', { minLength: estimatedBoltLengthMm })
              .orderBy('bm.length_mm', 'ASC')
              .getOne();

            if (boltMass) {
              const totalBolts = numberOfFlanges * flangeDimension.num_holes;
              totalBoltWeight = totalBolts * boltMass.mass_kg;
            }

            const nutMass = await this.nutMassRepository.findOne({
              where: { bolt: { id: flangeDimension.bolt.id } }
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

    const totalWeight = totalPipeWeight + fittingWeight + totalFlangeWeight + totalBoltWeight + totalNutWeight + weldWeight;

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
