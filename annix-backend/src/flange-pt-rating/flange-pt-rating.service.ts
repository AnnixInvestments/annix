import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlangePtRating } from './entities/flange-pt-rating.entity';
import {
  CreateFlangePtRatingDto,
  BulkCreateFlangePtRatingDto,
} from './dto/create-flange-pt-rating.dto';

export interface PtValidationResult {
  isValid: boolean;
  maxPressureAtTemp: number | null;
  warningMessage: string | null;
}

export interface ValidPressureClassInfo {
  id: number;
  designation: string;
  maxPressureAtTemp: number;
  isAdequate: boolean;
}

export interface PtRecommendationResult {
  validation: PtValidationResult;
  recommendedPressureClassId: number | null;
  validPressureClasses: ValidPressureClassInfo[];
}

@Injectable()
export class FlangePtRatingService {
  private readonly logger = new Logger(FlangePtRatingService.name);

  constructor(
    @InjectRepository(FlangePtRating)
    private readonly ptRatingRepo: Repository<FlangePtRating>,
  ) {}

  async create(dto: CreateFlangePtRatingDto): Promise<FlangePtRating> {
    const entity = this.ptRatingRepo.create({
      pressureClassId: dto.pressureClassId,
      materialGroup: dto.materialGroup,
      temperatureCelsius: dto.temperatureCelsius,
      maxPressureBar: dto.maxPressureBar,
      maxPressurePsi: dto.maxPressurePsi,
    });
    return this.ptRatingRepo.save(entity);
  }

  async bulkCreate(
    dto: BulkCreateFlangePtRatingDto,
  ): Promise<FlangePtRating[]> {
    const entities = dto.ratings.map((rating) =>
      this.ptRatingRepo.create({
        pressureClassId: dto.pressureClassId,
        materialGroup: dto.materialGroup,
        temperatureCelsius: rating.temperatureCelsius,
        maxPressureBar: rating.maxPressureBar,
        maxPressurePsi: rating.maxPressurePsi,
      }),
    );
    return this.ptRatingRepo.save(entities);
  }

  async findAll(): Promise<FlangePtRating[]> {
    return this.ptRatingRepo.find({
      relations: ['pressureClass', 'pressureClass.standard'],
      order: { pressureClassId: 'ASC', temperatureCelsius: 'ASC' },
    });
  }

  async findByPressureClass(
    pressureClassId: number,
  ): Promise<FlangePtRating[]> {
    return this.ptRatingRepo.find({
      where: { pressureClassId },
      order: { temperatureCelsius: 'ASC' },
    });
  }

  /**
   * Get available material groups with P-T rating data
   */
  async getAvailableMaterialGroups(): Promise<
    { name: string; description: string }[]
  > {
    const distinctGroups = await this.ptRatingRepo
      .createQueryBuilder('rating')
      .select('DISTINCT rating.material_group', 'materialGroup')
      .getRawMany();

    // Map to user-friendly names with descriptions
    const materialGroupInfo: { [key: string]: string } = {
      'Carbon Steel A105 (Group 1.1)': 'General service carbon steel',
      'Stainless Steel 304 (Group 2.1)':
        'Austenitic SS - slightly higher ratings at elevated temps',
      'Stainless Steel 316 (Group 2.2)': 'Corrosion-resistant austenitic SS',
    };

    return distinctGroups.map((g) => ({
      name: g.materialGroup,
      description: materialGroupInfo[g.materialGroup] || g.materialGroup,
    }));
  }

  async findByStandardAndMaterial(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    return this.ptRatingRepo.find({
      where: {
        pressureClass: { standard: { id: standardId } },
        materialGroup,
      },
      relations: ['pressureClass', 'pressureClass.standard'],
      order: { pressureClassId: 'ASC', temperatureCelsius: 'ASC' },
    });
  }

  /**
   * Get the maximum allowable pressure for a given pressure class at a specific temperature.
   * Uses linear interpolation between temperature points.
   */
  async getMaxPressureAtTemperature(
    pressureClassId: number,
    temperatureCelsius: number,
    materialGroup: string = 'Carbon Steel A105',
  ): Promise<number | null> {
    const ratings = await this.ptRatingRepo.find({
      where: { pressureClassId, materialGroup },
      order: { temperatureCelsius: 'ASC' },
    });

    if (ratings.length === 0) return null;

    // Find surrounding temperature points for interpolation
    let lower = ratings[0];
    let upper = ratings[ratings.length - 1];

    for (let i = 0; i < ratings.length; i++) {
      if (ratings[i].temperatureCelsius <= temperatureCelsius) {
        lower = ratings[i];
      }
      if (ratings[i].temperatureCelsius >= temperatureCelsius) {
        upper = ratings[i];
        break;
      }
    }

    // If exact match or below minimum temperature
    if (lower.temperatureCelsius === temperatureCelsius || lower === upper) {
      return Number(lower.maxPressureBar);
    }

    // If above maximum temperature
    if (temperatureCelsius > Number(upper.temperatureCelsius)) {
      return Number(upper.maxPressureBar);
    }

    // Linear interpolation
    const tempRange =
      Number(upper.temperatureCelsius) - Number(lower.temperatureCelsius);
    const pressureRange =
      Number(upper.maxPressureBar) - Number(lower.maxPressureBar);
    const tempOffset = temperatureCelsius - Number(lower.temperatureCelsius);
    const interpolatedPressure =
      Number(lower.maxPressureBar) + (pressureRange * tempOffset) / tempRange;

    return Math.round(interpolatedPressure * 100) / 100;
  }

  /**
   * Get the recommended pressure class for a given working pressure and temperature
   */
  async getRecommendedPressureClass(
    standardId: number,
    workingPressureBar: number,
    temperatureCelsius: number,
    materialGroup: string = 'Carbon Steel A105',
  ): Promise<number | null> {
    const ratings = await this.ptRatingRepo.find({
      where: {
        pressureClass: { standard: { id: standardId } },
        materialGroup,
      },
      relations: ['pressureClass'],
      order: { pressureClassId: 'ASC', temperatureCelsius: 'ASC' },
    });

    if (ratings.length === 0) return null;

    // Group ratings by pressure class
    const ratingsByClass = new Map<number, FlangePtRating[]>();
    for (const rating of ratings) {
      const classId = rating.pressureClassId;
      if (!ratingsByClass.has(classId)) {
        ratingsByClass.set(classId, []);
      }
      ratingsByClass.get(classId)!.push(rating);
    }

    // Get all class IDs and their max pressures at the given temperature
    const classCapacities: Array<{
      classId: number;
      maxPressure: number;
      designation: string;
    }> = [];
    for (const [classId, classRatings] of ratingsByClass) {
      const maxPressure = await this.getMaxPressureAtTemperature(
        classId,
        temperatureCelsius,
        materialGroup,
      );
      if (maxPressure !== null) {
        const designation = classRatings[0]?.pressureClass?.designation || '';
        classCapacities.push({ classId, maxPressure, designation });
      }
    }

    // Sort by max pressure ascending (lowest first)
    classCapacities.sort((a, b) => a.maxPressure - b.maxPressure);

    // Find the lowest pressure class that can handle the working pressure
    for (const { classId, maxPressure, designation } of classCapacities) {
      if (maxPressure >= workingPressureBar) {
        this.logger.log(
          `P/T Rating: Selected ${designation} (${maxPressure.toFixed(1)} bar at ${temperatureCelsius}°C) for ${workingPressureBar} bar`,
        );
        return classId;
      }
    }

    // Return the highest class if none can handle it
    const highest = classCapacities[classCapacities.length - 1];
    if (highest) {
      this.logger.log(
        `P/T Rating: Using highest class ${highest.designation} (${highest.maxPressure.toFixed(1)} bar) for ${workingPressureBar} bar`,
      );
      return highest.classId;
    }

    return null;
  }

  async getPtRecommendations(
    standardId: number,
    workingPressureBar: number,
    temperatureCelsius: number,
    materialGroup: string = 'Carbon Steel A105 (Group 1.1)',
    currentPressureClassId?: number,
  ): Promise<PtRecommendationResult> {
    const ratings = await this.ptRatingRepo.find({
      where: {
        pressureClass: { standard: { id: standardId } },
        materialGroup,
      },
      relations: ['pressureClass', 'pressureClass.standard'],
      order: { pressureClassId: 'ASC', temperatureCelsius: 'ASC' },
    });

    const ratingsByClass = new Map<number, FlangePtRating[]>();
    for (const rating of ratings) {
      const classId = rating.pressureClassId;
      if (!ratingsByClass.has(classId)) {
        ratingsByClass.set(classId, []);
      }
      ratingsByClass.get(classId)!.push(rating);
    }

    const validPressureClasses: ValidPressureClassInfo[] = [];
    let recommendedClassId: number | null = null;
    let lowestAdequateMaxPressure = Infinity;

    for (const [classId, classRatings] of ratingsByClass) {
      const maxPressure = await this.getMaxPressureAtTemperature(
        classId,
        temperatureCelsius,
        materialGroup,
      );

      if (maxPressure !== null) {
        const designation = classRatings[0]?.pressureClass?.designation || '';
        const isAdequate = maxPressure >= workingPressureBar;

        validPressureClasses.push({
          id: classId,
          designation,
          maxPressureAtTemp: maxPressure,
          isAdequate,
        });

        if (isAdequate && maxPressure < lowestAdequateMaxPressure) {
          lowestAdequateMaxPressure = maxPressure;
          recommendedClassId = classId;
        }
      }
    }

    validPressureClasses.sort(
      (a, b) => a.maxPressureAtTemp - b.maxPressureAtTemp,
    );

    const validation: PtValidationResult = {
      isValid: true,
      maxPressureAtTemp: null,
      warningMessage: null,
    };

    if (currentPressureClassId) {
      const currentMaxPressure = await this.getMaxPressureAtTemperature(
        currentPressureClassId,
        temperatureCelsius,
        materialGroup,
      );

      validation.maxPressureAtTemp = currentMaxPressure;

      if (
        currentMaxPressure !== null &&
        currentMaxPressure < workingPressureBar
      ) {
        const currentClass = validPressureClasses.find(
          (c) => c.id === currentPressureClassId,
        );
        const designation = currentClass?.designation || 'Selected';

        validation.isValid = false;
        validation.warningMessage =
          `${designation} has max rating of ${currentMaxPressure.toFixed(1)} bar at ${temperatureCelsius}°C, ` +
          `but working pressure is ${workingPressureBar} bar`;
      }
    }

    return {
      validation,
      recommendedPressureClassId: recommendedClassId,
      validPressureClasses,
    };
  }
}
