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
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AngleRange } from "src/angle-range/entities/angle-range.entity";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { Repository } from "typeorm";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateFittingDimensionDto } from "./dto/create-fitting-dimension.dto";
import { UpdateFittingDimensionDto } from "./dto/update-fitting-dimension.dto";
import { FittingDimension } from "./entities/fitting-dimension.entity";

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
    const variant = await findOneOrFail(
      this.variantRepo,
      { where: { id: dto.variantId } },
      "FittingVariant",
    );

    let angleRange: AngleRange | null = null;
    if (dto.angleRangeId) {
      angleRange = await findOneOrFail(
        this.angleRangeRepo,
        { where: { id: dto.angleRangeId } },
        "AngleRange",
      );
    }

    // const dim = this.dimRepo.create({ variant, angleRange, ...dto });
    // return this.dimRepo.save(dim);
    const dim = this.dimRepo.create({
      dimension_name: dto.dimensionName,
      dimension_value_mm: dto.dimensionValueMm,
      variant, // entity
      angleRange, // entity or null
    });
    return this.dimRepo.save(dim);
  }

  async findAll(): Promise<FittingDimension[]> {
    return this.dimRepo.find({ relations: ["variant", "angleRange"] });
  }

  async findOne(id: number): Promise<FittingDimension> {
    return findOneOrFail(
      this.dimRepo,
      { where: { id }, relations: ["variant", "angleRange"] },
      "FittingDimension",
    );
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
