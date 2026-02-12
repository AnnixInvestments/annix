import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BendCenterToFace } from './entities/bend-center-to-face.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';

@Injectable()
export class BendCenterToFaceService {
  constructor(
    @InjectRepository(BendCenterToFace)
    private bendCenterToFaceRepository: Repository<BendCenterToFace>,
    @InjectRepository(PipeDimension)
    private pipeDimensionRepository: Repository<PipeDimension>,
    @InjectRepository(FlangeDimension)
    private flangeDimensionRepository: Repository<FlangeDimension>,
  ) {}

  async findAll(): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceRepository.find({
      order: {
        bendType: 'ASC',
        nominalBoreMm: 'ASC',
        degrees: 'ASC'
      }
    });
  }

  async findByBendType(bendType: string): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceRepository.find({
      where: { bendType },
      order: {
        nominalBoreMm: 'ASC',
        degrees: 'ASC'
      }
    });
  }

  async findByNominalBore(nominalBoreMm: number): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceRepository.find({
      where: { nominalBoreMm },
      order: {
        bendType: 'ASC',
        degrees: 'ASC'
      }
    });
  }

  async findByCriteria(
    bendType: string,
    nominalBoreMm: number,
    degrees: number
  ): Promise<BendCenterToFace | null> {
    return this.bendCenterToFaceRepository.findOne({
      where: {
        bendType,
        nominalBoreMm,
        degrees
      }
    });
  }

  async findNearestBendDimension(
    bendType: string,
    nominalBoreMm: number,
    targetDegrees: number
  ): Promise<BendCenterToFace | null> {
    // Find the closest available degree for this bend type and nominal bore
    const availableBends = await this.bendCenterToFaceRepository.find({
      where: {
        bendType,
        nominalBoreMm
      },
      order: {
        degrees: 'ASC'
      }
    });

    if (availableBends.length === 0) return null;

    // Find the closest degree value
    let closest = availableBends[0];
    let minDiff = Math.abs(Number(closest.degrees) - targetDegrees);

    for (const bend of availableBends) {
      const diff = Math.abs(Number(bend.degrees) - targetDegrees);
      if (diff < minDiff) {
        minDiff = diff;
        closest = bend;
      }
    }

    return closest;
  }

  async getBendTypes(): Promise<string[]> {
    const result = await this.bendCenterToFaceRepository
      .createQueryBuilder('bend')
      .select('DISTINCT bend.bendType', 'bendType')
      .getRawMany();
    
    return result.map(r => r.bendType).sort();
  }

  async getNominalBoresForBendType(bendType: string): Promise<number[]> {
    const result = await this.bendCenterToFaceRepository
      .createQueryBuilder('bend')
      .select('DISTINCT bend.nominalBoreMm', 'nominalBoreMm')
      .where('bend.bendType = :bendType', { bendType })
      .orderBy('bend.nominalBoreMm', 'ASC')
      .getRawMany();
    
    return result.map(r => r.nominalBoreMm);
  }

  async getDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]> {
    const qb = this.bendCenterToFaceRepository
      .createQueryBuilder('bend')
      .select('DISTINCT bend.degrees', 'degrees')
      .where('bend.bendType = :bendType', { bendType });

    if (typeof nominalBoreMm === 'number') {
      qb.andWhere('bend.nominalBoreMm = :nominalBoreMm', { nominalBoreMm });
    }

    const result = await qb
      .orderBy('degrees', 'ASC')
      .getRawMany();

    return result.map(r => Number(r.degrees));
  }

  async getOptionsForBendType(bendType: string): Promise<{ nominalBores: number[]; degrees: number[] }> {
    const nominalBores = await this.getNominalBoresForBendType(bendType);
    const degrees = await this.getDegreesForBendType(bendType);

    return { nominalBores, degrees };
  }

  async calculateBendSpecifications(params: {
    nominalBoreMm: number;
    wallThicknessMm: number;
    scheduleNumber?: string;
    bendType: string;
    bendDegrees: number;
    numberOfTangents?: number;
    tangentLengths?: number[];
    quantity?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
  }) {
    const {
      nominalBoreMm,
      wallThicknessMm,
      bendType,
      bendDegrees,
      numberOfTangents = 0,
      tangentLengths = [],
      quantity = 1,
      flangeStandardId,
      flangePressureClassId
    } = params;

    // Get bend center-to-face dimension
    const bendData = await this.findNearestBendDimension(bendType, nominalBoreMm, bendDegrees);
    if (!bendData) {
      throw new NotFoundException(`No bend data found for ${bendType} ${nominalBoreMm}mm at ${bendDegrees}°`);
    }

    // Get pipe dimensions for weight calculation
    const pipeDimension = await this.pipeDimensionRepository.findOne({
      where: {
        nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
        wall_thickness_mm: wallThicknessMm
      },
      relations: ['nominalOutsideDiameter']
    });

    if (!pipeDimension) {
      throw new NotFoundException(`No pipe dimension found for ${nominalBoreMm}mm NB with ${wallThicknessMm}mm wall thickness`);
    }

    // Calculate weights
    const bendWeight = this.calculateBendWeight(bendData, pipeDimension);
    const tangentWeight = this.calculateTangentWeight(tangentLengths, pipeDimension);
    
    // Calculate flanges if specified
    let flangeWeight = 0;
    let numberOfFlanges = 0;
    let numberOfFlangeWelds = 0;
    let totalFlangeWeldLength = 0;

    if (flangeStandardId && flangePressureClassId) {
      // Calculate flanges based on tangent configuration
      numberOfFlanges = this.calculateFlangeCount(numberOfTangents);
      
      if (numberOfFlanges > 0) {
        const flangeDimension = await this.flangeDimensionRepository.findOne({
          where: {
            nominalOutsideDiameter: { nominal_diameter_mm: nominalBoreMm },
            standard: { id: flangeStandardId },
            pressureClass: { id: flangePressureClassId }
          },
          relations: ['nominalOutsideDiameter', 'standard', 'pressureClass']
        });

        if (flangeDimension) {
          flangeWeight = numberOfFlanges * (flangeDimension.mass_kg || 0);
          numberOfFlangeWelds = numberOfFlanges;
          
          // Calculate flange weld circumference (π × nominal bore in meters)
          const weldCircumference = Math.PI * (nominalBoreMm / 1000);
          totalFlangeWeldLength = numberOfFlangeWelds * weldCircumference;
        }
      }
    }

    // Calculate butt welds (between bend and tangents)
    const numberOfButtWelds = numberOfTangents > 0 ? numberOfTangents : 0;
    const weldCircumference = Math.PI * (nominalBoreMm / 1000);
    const totalButtWeldLength = numberOfButtWelds * weldCircumference;

    // Total system weight (multiply by quantity)
    const totalBendWeight = bendWeight * quantity;
    const totalTangentWeight = tangentWeight * quantity;
    const totalSystemWeight = (bendWeight + tangentWeight + flangeWeight) * quantity;

    return {
      centerToFaceDimension: Number(bendData.centerToFaceMm),
      bendRadius: Number(bendData.radiusMm),
      totalBendWeight,
      totalTangentWeight,
      totalSystemWeight,
      numberOfFlanges: numberOfFlanges * quantity,
      numberOfFlangeWelds: numberOfFlangeWelds * quantity,
      numberOfButtWelds: numberOfButtWelds * quantity,
      totalFlangeWeldLength: totalFlangeWeldLength * quantity,
      totalButtWeldLength: totalButtWeldLength * quantity
    };
  }

  private calculateBendWeight(bendData: BendCenterToFace, pipeDimension: PipeDimension): number {
    // Estimate bend weight based on radius and angle
    // This is a simplified calculation - you might want to use more sophisticated formulas
    const radius = Number(bendData.radiusMm);
    const angleRad = Number(bendData.radians);
    const arcLength = radius * angleRad;
    
    // Arc length in meters multiplied by pipe mass per meter
    const weightKg = (arcLength / 1000) * (pipeDimension.mass_kgm || 0);
    
    // Add some factor for bend formation (typically 10-15% heavier due to bending process)
    return weightKg * 1.12;
  }

  private calculateTangentWeight(tangentLengths: number[], pipeDimension: PipeDimension): number {
    if (!tangentLengths.length) return 0;
    
    const totalLengthMm = tangentLengths.reduce((sum, length) => sum + length, 0);
    const totalLengthM = totalLengthMm / 1000;
    
    return totalLengthM * (pipeDimension.mass_kgm || 0);
  }

  private calculateFlangeCount(numberOfTangents: number): number {
    // Basic logic: 
    // - If no tangents, bend might have flanges on both ends = 2 flanges
    // - If tangents, depends on configuration
    // - For now, assume 2 flanges per bend assembly (standard configuration)
    return numberOfTangents > 0 ? 2 : 2;
  }
}