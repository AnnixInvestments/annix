// import { Injectable } from '@nestjs/common';
// import { CreateFittingDimensionDto } from './dto/create-fitting-dimension.dto';
// import { UpdateFittingDimensionDto } from './dto/update-fitting-dimension.dto';

// @Injectable()
// export class FittingDimensionService {
//   create(createFittingDimensionDto: CreateFittingDimensionDto) {
//     return 'This action adds a new fittingDimension';
//   }

//   findAll() {
//     return `This action returns all fittingDimension`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} fittingDimension`;
//   }

//   update(id: number, updateFittingDimensionDto: UpdateFittingDimensionDto) {
//     return `This action updates a #${id} fittingDimension`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} fittingDimension`;
//   }
// }
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FittingDimension } from './entities/fitting-dimension.entity';
import { CreateFittingDimensionDto } from './dto/create-fitting-dimension.dto';
import { UpdateFittingDimensionDto } from './dto/update-fitting-dimension.dto';
import { FittingVariant } from 'src/fitting-variant/entities/fitting-variant.entity';
import { AngleRange } from 'src/angle-range/entities/angle-range.entity';

@Injectable()
export class FittingDimensionService {
  constructor(
    @InjectRepository(FittingDimension)
    private readonly dimRepo: Repository<FittingDimension>,
    @InjectRepository(FittingVariant)
    private readonly variantRepo: Repository<FittingVariant>,
    @InjectRepository(AngleRange)
    private readonly angleRangeRepo: Repository<AngleRange>,
  ) {}

  async create(dto: CreateFittingDimensionDto): Promise<FittingDimension> {
    const variant = await this.variantRepo.findOne({ where: { id: dto.variantId } });
    if (!variant) throw new NotFoundException(`FittingVariant ${dto.variantId} not found`);

    let angleRange: AngleRange | null = null;
    if (dto.angleRangeId) {
      angleRange = await this.angleRangeRepo.findOne({ where: { id: dto.angleRangeId } });
      if (!angleRange) throw new NotFoundException(`AngleRange ${dto.angleRangeId} not found`);
    }

    // const dim = this.dimRepo.create({ variant, angleRange, ...dto });
    // return this.dimRepo.save(dim);
    const dim = this.dimRepo.create({
      dimension_name: dto.dimensionName,
      dimension_value_mm: dto.dimensionValueMm,
      variant,                   // entity
      angleRange,                // entity or null
    });
    return this.dimRepo.save(dim);
  }

  async findAll(): Promise<FittingDimension[]> {
    return this.dimRepo.find({ relations: ['variant', 'angleRange'] });
  }

  async findOne(id: number): Promise<FittingDimension> {
    const dim = await this.dimRepo.findOne({ where: { id }, relations: ['variant', 'angleRange'] });
    if (!dim) throw new NotFoundException(`FittingDimension ${id} not found`);
    return dim;
  }

  async update(id: number, dto: UpdateFittingDimensionDto): Promise<FittingDimension> {
    const dim = await this.findOne(id);
    Object.assign(dim, dto);
    return this.dimRepo.save(dim);
  }

  async remove(id: number): Promise<void> {
    const dim = await this.findOne(id);
    await this.dimRepo.remove(dim);
  }
}
