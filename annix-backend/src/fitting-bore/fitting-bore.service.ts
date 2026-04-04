// import { Injectable } from '@nestjs/common';
// import { CreateFittingBoreDto } from './dto/create-fitting-bore.dto';
// import { UpdateFittingBoreDto } from './dto/update-fitting-bore.dto';

// @Injectable()
// export class FittingBoreService {
//   create(createFittingBoreDto: CreateFittingBoreDto) {
//     return 'This action adds a new fittingBore';
//   }

//   findAll() {
//     return `This action returns all fittingBore`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} fittingBore`;
//   }

//   update(id: number, updateFittingBoreDto: UpdateFittingBoreDto) {
//     return `This action updates a #${id} fittingBore`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} fittingBore`;
//   }
// }
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FittingVariant } from "src/fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { Repository } from "typeorm";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateFittingBoreDto } from "./dto/create-fitting-bore.dto";
import { UpdateFittingBoreDto } from "./dto/update-fitting-bore.dto";
import { FittingBore } from "./entities/fitting-bore.entity";

@Injectable()
export class FittingBoreService {
  constructor(
    @InjectRepository(FittingBore)
    private readonly boreRepo: Repository<FittingBore>,
    @InjectRepository(FittingVariant)
    private readonly variantRepo: Repository<FittingVariant>,
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
  ) {}

  async create(dto: CreateFittingBoreDto): Promise<FittingBore> {
    const variant = await findOneOrFail(
      this.variantRepo,
      { where: { id: dto.variantId } },
      "FittingVariant",
    );

    const nominal = await findOneOrFail(
      this.nominalRepo,
      { where: { id: dto.nominalId } },
      "NominalOutsideDiameter",
    );

    // Duplicate check: same borePosition in same variant
    const existing = await this.boreRepo.findOne({
      where: {
        variant: { id: dto.variantId },
        borePositionName: dto.borePosition,
      },
    });
    if (existing)
      throw new BadRequestException(
        `Bore position "${dto.borePosition}" already exists for this variant`,
      );

    const bore = this.boreRepo.create({
      variant,
      nominalOutsideDiameter: nominal,
      borePositionName: dto.borePosition,
    });
    return this.boreRepo.save(bore);
  }

  async findAll(): Promise<FittingBore[]> {
    return this.boreRepo.find({
      relations: ["variant", "nominalOutsideDiameter"],
    });
  }

  async findOne(id: number): Promise<FittingBore> {
    return findOneOrFail(
      this.boreRepo,
      { where: { id }, relations: ["variant", "nominalOutsideDiameter"] },
      "FittingBore",
    );
  }

  async update(id: number, dto: UpdateFittingBoreDto): Promise<FittingBore> {
    const bore = await this.findOne(id);
    Object.assign(bore, dto);
    return this.boreRepo.save(bore);
  }

  async remove(id: number): Promise<void> {
    const bore = await this.findOne(id);
    await this.boreRepo.remove(bore);
  }
}
