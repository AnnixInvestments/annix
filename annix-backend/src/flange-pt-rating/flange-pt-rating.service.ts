import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlangePtRating } from './entities/flange-pt-rating.entity';
import { CreateFlangePtRatingDto, BulkCreateFlangePtRatingDto } from './dto/create-flange-pt-rating.dto';

@Injectable()
export class FlangePtRatingService {
  constructor(
    @InjectRepository(FlangePtRating)
    private readonly ptRatingRepository: Repository<FlangePtRating>,
  ) {}

  async create(dto: CreateFlangePtRatingDto): Promise<FlangePtRating> {
    const entity = this.ptRatingRepository.create({
      pressureClassId: dto.pressureClassId,
      materialGroup: dto.materialGroup,
      temperatureCelsius: dto.temperatureCelsius,
      maxPressureBar: dto.maxPressureBar,
      maxPressurePsi: dto.maxPressurePsi,
    });
    return this.ptRatingRepository.save(entity);
  }

  async bulkCreate(dto: BulkCreateFlangePtRatingDto): Promise<FlangePtRating[]> {
    const entities = dto.ratings.map(rating =>
      this.ptRatingRepository.create({
        pressureClassId: dto.pressureClassId,
        materialGroup: dto.materialGroup,
        temperatureCelsius: rating.temperatureCelsius,
        maxPressureBar: rating.maxPressureBar,
        maxPressurePsi: rating.maxPressurePsi,
      })
    );
    return this.ptRatingRepository.save(entities);
  }

  async findAll(): Promise<FlangePtRating[]> {
    return this.ptRatingRepository.find({
      relations: ['pressureClass', 'pressureClass.standard'],
      order: { pressureClassId: 'ASC', temperatureCelsius: 'ASC' },
    });
  }

  async findByPressureClass(pressureClassId: number): Promise<FlangePtRating[]> {
    return this.ptRatingRepository.find({
      where: { pressureClassId },
      order: { temperatureCelsius: 'ASC' },
    });
  }

  /**
   * Get available material groups with P-T rating data
   */
  async getAvailableMaterialGroups(): Promise<{ name: string; description: string }[]> {
    const distinctGroups = await this.ptRatingRepository
      .createQueryBuilder('rating')
      .select('DISTINCT rating.material_group', 'materialGroup')
      .getRawMany();

    // Map to user-friendly names with descriptions
    const materialGroupInfo: { [key: string]: string } = {
      'Carbon Steel A105 (Group 1.1)': 'General service carbon steel',
      'Stainless Steel 304 (Group 2.1)': 'Austenitic SS - slightly higher ratings at elevated temps',
      'Stainless Steel 316 (Group 2.2)': 'Corrosion-resistant austenitic SS',
    };

    return distinctGroups.map(g => ({
      name: g.materialGroup,
      description: materialGroupInfo[g.materialGroup] || g.materialGroup,
    }));
  }

  async findByStandardAndMaterial(standardId: number, materialGroup: string): Promise<FlangePtRating[]> {
    return this.ptRatingRepository.find({
      where: {
        pressureClass: { standard: { id: standardId } },
        materialGroup
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
    const ratings = await this.ptRatingRepository.find({
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
    const tempRange = Number(upper.temperatureCelsius) - Number(lower.temperatureCelsius);
    const pressureRange = Number(upper.maxPressureBar) - Number(lower.maxPressureBar);
    const tempOffset = temperatureCelsius - Number(lower.temperatureCelsius);
    const interpolatedPressure = Number(lower.maxPressureBar) + (pressureRange * tempOffset / tempRange);

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
    const ratings = await this.ptRatingRepository.find({
      where: {
        pressureClass: { standard: { id: standardId } },
        materialGroup
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

    // Find the lowest pressure class that can handle the working pressure at the given temperature
    for (const [classId, classRatings] of ratingsByClass) {
      const maxPressure = await this.getMaxPressureAtTemperature(classId, temperatureCelsius, materialGroup);
      if (maxPressure !== null && maxPressure >= workingPressureBar) {
        return classId;
      }
    }

    // Return the highest class if none can handle it
    return Array.from(ratingsByClass.keys()).pop() || null;
  }
}
