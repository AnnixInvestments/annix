// import { Injectable } from '@nestjs/common';
// import { CreateFittingVariantDto } from './dto/create-fitting-variant.dto';
// import { UpdateFittingVariantDto } from './dto/update-fitting-variant.dto';

// @Injectable()
// export class FittingVariantService {
//   create(createFittingVariantDto: CreateFittingVariantDto) {
//     return 'This action adds a new fittingVariant';
//   }

//   findAll() {
//     return `This action returns all fittingVariant`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} fittingVariant`;
//   }

//   update(id: number, updateFittingVariantDto: UpdateFittingVariantDto) {
//     return `This action updates a #${id} fittingVariant`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} fittingVariant`;
//   }
// }
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FittingVariant } from './entities/fitting-variant.entity';
import { CreateFittingVariantDto } from './dto/create-fitting-variant.dto';
import { UpdateFittingVariantDto } from './dto/update-fitting-variant.dto';
import { Fitting } from 'src/fitting/entities/fitting.entity';
import { FittingBore } from 'src/fitting-bore/entities/fitting-bore.entity';
import { FittingDimension } from 'src/fitting-dimension/entities/fitting-dimension.entity';

@Injectable()
export class FittingVariantService {
  constructor(
    @InjectRepository(FittingVariant)
    private readonly variantRepo: Repository<FittingVariant>,
    @InjectRepository(Fitting)
    private readonly fittingRepo: Repository<Fitting>,
    @InjectRepository(FittingBore)
    private readonly boreRepo: Repository<FittingBore>,
    @InjectRepository(FittingDimension)
    private readonly dimensionRepo: Repository<FittingDimension>,
  ) {}

  // async create(dto: CreateFittingVariantDto): Promise<FittingVariant> {
  //   const fitting = await this.fittingRepo.findOne({ where: { id: dto.fittingId } });
  //   if (!fitting) throw new NotFoundException(`Fitting ${dto.fittingId} not found`);

  //   const variant = this.variantRepo.create({ fitting, ...dto });
  //   return this.variantRepo.save(variant);
  // }

//   async create(dto: CreateFittingVariantDto): Promise<FittingVariant> {
//   // Find parent fitting
//   const fitting = await this.fittingRepo.findOne({ where: { id: dto.fittingId } });
//   if (!fitting) throw new NotFoundException(`Fitting ${dto.fittingId} not found`);

//   // Map nested DTOs to entities
//   const bores = dto.bores.map(b => this.boreRepo.create(b));
//   const dimensions = dto.dimensions?.map(d => this.dimensionRepo.create(d)) || [];

//   // Create variant entity
//   const variant = this.variantRepo.create({
//     fitting,
//     bores,
//     dimensions,
//   });

//   return this.variantRepo.save(variant);
// }

  async create(dto: CreateFittingVariantDto): Promise<FittingVariant> {
    const fitting = await this.fittingRepo.findOne({ where: { id: dto.fittingId } });
    if (!fitting) throw new NotFoundException(`Fitting ${dto.fittingId} not found`);

    const bores: FittingBore[] = dto.bores.map(b => 
      this.boreRepo.create({
        borePositionName: b.borePosition,
        nominalOutsideDiameter: { id: b.nominalId },
      }),
    );

    const dimensions: FittingDimension[] = dto.dimensions?.map(d =>
      this.dimensionRepo.create({
        dimension_name: d.dimensionName,
        dimension_value_mm: d.dimensionValueMm,
        angleRange: d.angleRangeId ? { id: d.angleRangeId } : null,
      }),
    ) || [];

    const variant = this.variantRepo.create({
      fitting,
      bores,
      dimensions,
    });

    return this.variantRepo.save(variant);
  }

  async findAll(): Promise<FittingVariant[]> {
    return this.variantRepo.find({ relations: ['fitting', 'bores', 'dimensions'] });
  }

  async findOne(id: number): Promise<FittingVariant> {
    const variant = await this.variantRepo.findOne({ 
      where: { id }, 
      relations: ['fitting', 'bores', 'dimensions'] 
    });
    if (!variant) throw new NotFoundException(`FittingVariant ${id} not found`);
    return variant;
  }

  async update(id: number, dto: UpdateFittingVariantDto): Promise<FittingVariant> {
    const variant = await this.findOne(id);
    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  async remove(id: number): Promise<void> {
    const variant = await this.findOne(id);
    await this.variantRepo.remove(variant);
  }
}
