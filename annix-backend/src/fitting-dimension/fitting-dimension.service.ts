import { Injectable, NotFoundException } from "@nestjs/common";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { CreateFittingDimensionDto } from "./dto/create-fitting-dimension.dto";
import { UpdateFittingDimensionDto } from "./dto/update-fitting-dimension.dto";
import { FittingDimension } from "./entities/fitting-dimension.entity";
import { FittingDimensionRepository } from "./fitting-dimension.repository";

@Injectable()
export class FittingDimensionService {
  constructor(private readonly dimRepository: FittingDimensionRepository) {}

  async create(dto: CreateFittingDimensionDto): Promise<FittingDimension> {
    const variant = await this.dimRepository.findVariantById(dto.variantId);
    if (!variant) {
      throw new NotFoundException(
        `FittingVariant ${JSON.stringify({ id: dto.variantId })} not found`,
      );
    }

    let angleRange: AngleRange | null = null;
    if (dto.angleRangeId) {
      angleRange = await this.dimRepository.findAngleRangeById(dto.angleRangeId);
      if (!angleRange) {
        throw new NotFoundException(
          `AngleRange ${JSON.stringify({ id: dto.angleRangeId })} not found`,
        );
      }
    }

    return this.dimRepository.create({
      dimension_name: dto.dimensionName,
      dimension_value_mm: dto.dimensionValueMm,
      variant,
      angleRange,
    });
  }

  async findAll(): Promise<FittingDimension[]> {
    return this.dimRepository.findAllWithRelations();
  }

  async findOne(id: number): Promise<FittingDimension> {
    const dim = await this.dimRepository.findByIdWithRelations(id);
    if (!dim) {
      throw new NotFoundException("FittingDimension not found");
    }
    return dim;
  }

  async update(id: number, dto: UpdateFittingDimensionDto): Promise<FittingDimension> {
    const dim = await this.findOne(id);
    Object.assign(dim, dto);
    return this.dimRepository.save(dim);
  }

  async remove(id: number): Promise<void> {
    const dim = await this.findOne(id);
    await this.dimRepository.remove(dim);
  }
}
