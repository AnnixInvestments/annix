// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { SteelSpecification } from './entities/steel-specification.entity';
// import { CreateSteelSpecificationDto } from './dto/create-steel-specification.dto';
// import { UpdateSteelSpecificationDto } from './dto/update-steel-specification.dto';

// @Injectable()
// export class SteelSpecificationService {
//   constructor(
//     @InjectRepository(SteelSpecification)
//     private readonly steelSpecificationRepository: Repository<SteelSpecification>,
//   ) {}

//   async create(createSteelSpecificationDto: CreateSteelSpecificationDto): Promise<SteelSpecification> {
//     const existing = await this.steelSpecificationRepository.findOneBy({
//       steelSpecName: createSteelSpecificationDto.steelSpecName,
//     });

//     if (existing) {
//       throw new BadRequestException(
//         `Steel specification with name "${createSteelSpecificationDto.steelSpecName}" already exists`
//       );
//     }

//     const steelSpecification = this.steelSpecificationRepository.create({
//       steelSpecName: createSteelSpecificationDto.steelSpecName,
//     });
//     return this.steelSpecificationRepository.save(steelSpecification);
//   }

//   async findAll(): Promise<SteelSpecification[]> {
//     return this.steelSpecificationRepository.find();
//   }

//   async findOne(id: number): Promise<SteelSpecification> {
//     const steelSpecification = await this.steelSpecificationRepository.findOneBy({ id });
//     if (!steelSpecification) {
//       throw new NotFoundException(`SteelSpecification #${id} not found`);
//     }
//     return steelSpecification;
//   }

//   async update(id: number, updateSteelSpecificationDto: UpdateSteelSpecificationDto): Promise<SteelSpecification> {
//     const steelSpecification = await this.findOne(id);

//     // Check for duplicates if steelSpecName is being updated
//     if (updateSteelSpecificationDto.steelSpecName) {
//       const existing = await this.steelSpecificationRepository.findOneBy({
//         steelSpecName: updateSteelSpecificationDto.steelSpecName,
//       });

//       if (existing && existing.id !== id) {
//         throw new BadRequestException(
//           `Steel specification with name "${updateSteelSpecificationDto.steelSpecName}" already exists`,
//         );
//       }
//     }

//     Object.assign(steelSpecification, updateSteelSpecificationDto);
//     return this.steelSpecificationRepository.save(steelSpecification);
//   }

//   async remove(id: number): Promise<void> {
//     const result = await this.steelSpecificationRepository.delete(id);
//     if (result.affected === 0) {
//       throw new NotFoundException(`SteelSpecification #${id} not found`);
//     }
//   }
// }

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SteelSpecification } from './entities/steel-specification.entity';
import { CreateSteelSpecificationDto } from './dto/create-steel-specification.dto';
import { UpdateSteelSpecificationDto } from './dto/update-steel-specification.dto';

@Injectable()
export class SteelSpecificationService {
  constructor(
    @InjectRepository(SteelSpecification)
    private readonly steelRepo: Repository<SteelSpecification>,
  ) {}

  async create(dto: CreateSteelSpecificationDto): Promise<SteelSpecification> {
    const existing = await this.steelRepo.findOne({ where: { steelSpecName: dto.steelSpecName } });
    if (existing) throw new BadRequestException(`SteelSpecification "${dto.steelSpecName}" already exists`);

    const spec = this.steelRepo.create(dto);
    return this.steelRepo.save(spec);
  }

  async findAll(): Promise<SteelSpecification[]> {
    return this.steelRepo.find({ relations: ['fittings', 'pipeDimensions'] });.0
  }

  async findOne(id: number): Promise<SteelSpecification> {
    const spec = await this.steelRepo.findOne({ where: { id }, relations: ['fittings', 'pipeDimensions'] });
    if (!spec) throw new NotFoundException(`SteelSpecification ${id} not found`);
    return spec;
  }

  async update(id: number, dto: UpdateSteelSpecificationDto): Promise<SteelSpecification> {
    const spec = await this.findOne(id);
    if (dto.steelSpecName && dto.steelSpecName !== spec.steelSpecName) {
      const duplicate = await this.steelRepo.findOne({ where: { steelSpecName: dto.steelSpecName } });
      if (duplicate) throw new BadRequestException(`SteelSpecification "${dto.steelSpecName}" already exists`);
      spec.steelSpecName = dto.steelSpecName;
    }
    return this.steelRepo.save(spec);
  }

  async remove(id: number): Promise<void> {
    const spec = await this.findOne(id);
    await this.steelRepo.remove(spec);
  }
}
