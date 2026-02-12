// import { Injectable } from '@nestjs/common';
// import { CreateFittingTypeDto } from './dto/create-fitting-type.dto';
// import { UpdateFittingTypeDto } from './dto/update-fitting-type.dto';

// @Injectable()
// export class FittingTypeService {
//   create(createFittingTypeDto: CreateFittingTypeDto) {
//     return 'This action adds a new fittingType';
//   }

//   findAll() {
//     return `This action returns all fittingType`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} fittingType`;
//   }

//   update(id: number, updateFittingTypeDto: UpdateFittingTypeDto) {
//     return `This action updates a #${id} fittingType`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} fittingType`;
//   }
// }
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FittingType } from './entities/fitting-type.entity';
import { CreateFittingTypeDto } from './dto/create-fitting-type.dto';
import { UpdateFittingTypeDto } from './dto/update-fitting-type.dto';

@Injectable()
export class FittingTypeService {
  constructor(
    @InjectRepository(FittingType)
    private readonly fittingTypeRepo: Repository<FittingType>,
  ) {}

  async create(createDto: CreateFittingTypeDto): Promise<FittingType> {
    const existing = await this.fittingTypeRepo.findOne({ where: { name: createDto.name } });
    if (existing) {
      throw new BadRequestException(`FittingType with name "${createDto.name}" already exists`);
    }
    const type = this.fittingTypeRepo.create(createDto);
    return this.fittingTypeRepo.save(type);
  }

  async findAll(): Promise<FittingType[]> {
    return this.fittingTypeRepo.find({ relations: ['fittings'] });
  }

  async findOne(id: number): Promise<FittingType> {
    const type = await this.fittingTypeRepo.findOne({ where: { id }, relations: ['fittings'] });
    if (!type) {
      throw new NotFoundException(`FittingType with id ${id} not found`);
    }
    return type;
  }

  async update(id: number, updateDto: UpdateFittingTypeDto): Promise<FittingType> {
    const type = await this.findOne(id);

    if (updateDto.name && updateDto.name !== type.name) {
      const duplicate = await this.fittingTypeRepo.findOne({ where: { name: updateDto.name } });
      if (duplicate) {
        throw new BadRequestException(`FittingType with name "${updateDto.name}" already exists`);
      }
      type.name = updateDto.name;
    }

    return this.fittingTypeRepo.save(type);
  }

  async remove(id: number): Promise<void> {
    const type = await this.findOne(id);
    await this.fittingTypeRepo.remove(type);
  }
}
