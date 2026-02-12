// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { CreateNominalOutsideDiameterMmDto } from './dto/create-nominal-outside-diameter-mm.dto';
// import { UpdateNominalOutsideDiameterMmDto } from './dto/update-nominal-outside-diameter-mm.dto';
// import { InjectRepository } from '@nestjs/typeorm';
// import { NominalOutsideDiameterMm } from './entities/nominal-outside-diameter-mm.entity';
// import { Repository } from 'typeorm';

// @Injectable()
// export class NominalOutsideDiameterMmService {
//   constructor(
//     @InjectRepository(NominalOutsideDiameterMm)
//     private readonly repository: Repository<NominalOutsideDiameterMm>,
//   ) {}

//   async create(createNominalOutsideDiameterMmDto: CreateNominalOutsideDiameterMmDto) {
//     const exists = await this.repository.findOneBy({
//       nominal_diameter_mm: createNominalOutsideDiameterMmDto.nominal_diameter_mm,
//       outside_diameter_mm: createNominalOutsideDiameterMmDto.outside_diameter_mm,
//     });

//     if (exists) {
//       throw new BadRequestException(
//         `Nominal diameter ${createNominalOutsideDiameterMmDto.nominal_diameter_mm} mm with outside diameter ${createNominalOutsideDiameterMmDto.outside_diameter_mm} mm already exists`,
//       );
//     }

//     const entity = this.repository.create(createNominalOutsideDiameterMmDto);
//     return this.repository.save(entity);
//   }

//   findAll() {
//     // return this.repository.find();
//     return this.repository.find({ relations: ['pipeDimensions'] });
//   }

//   async findOne(id: number) {
//     const entity = await this.repository.findOneBy({ id });
//     if (!entity) throw new NotFoundException(`NominalOutsideDiameter #${id} not found`);
//     return entity;
//   }

//   async update(id: number, updateNominalOutsideDiameterMmDto: UpdateNominalOutsideDiameterMmDto) {
//     const entity = await this.findOne(id);

//     if (updateNominalOutsideDiameterMmDto.nominal_diameter_mm && updateNominalOutsideDiameterMmDto.outside_diameter_mm) {
//       const exists = await this.repository.findOneBy({
//         nominal_diameter_mm: updateNominalOutsideDiameterMmDto.nominal_diameter_mm,
//         outside_diameter_mm: updateNominalOutsideDiameterMmDto.outside_diameter_mm,
//       });

//       if (exists && exists.id !== id) {
//         throw new BadRequestException(
//           `Nominal diameter ${updateNominalOutsideDiameterMmDto.nominal_diameter_mm} mm with outside diameter ${updateNominalOutsideDiameterMmDto.outside_diameter_mm} mm already exists`,
//         );
//       }
//     }

//     Object.assign(entity, updateNominalOutsideDiameterMmDto);
//     return this.repository.save(entity);
//   }

//   async remove(id: number) {
//     const result = await this.repository.delete(id);
//     if (result.affected === 0) 
//       throw new NotFoundException(`NominalOutsideDiameter #${id} not found`);
//   }

//   // nominal-outside-diameter-mm.service.ts
//   // async findAllWithDimensionsAndPressures(): Promise<NominalOutsideDiameterMm[]> {
//   //   const entity = await this.repository.find({
//   //     relations: ['pipeDimensions', 'pipeDimensions.pressures'],
//   //   });

//   //   return entity;
//   // }

//   // async findOneWithDimensionsAndPressures(id: number): Promise<NominalOutsideDiameterMm> {
//   //   const entity = await this.repository.findOne({
//   //     where: { id },
//   //     relations: ['pipeDimensions', 'pipeDimensions.pressures'],
//   //   });

//   //   if (!entity) {
//   //     throw new NotFoundException(`NominalOutsideDiameterMm #${id} not found`);
//   //   }

//   //   return entity;
//   // }

// }

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NominalOutsideDiameterMm } from './entities/nominal-outside-diameter-mm.entity';
import { CreateNominalOutsideDiameterMmDto } from './dto/create-nominal-outside-diameter-mm.dto';
import { UpdateNominalOutsideDiameterMmDto } from './dto/update-nominal-outside-diameter-mm.dto';

@Injectable()
export class NominalOutsideDiameterMmService {
  constructor(
    @InjectRepository(NominalOutsideDiameterMm)
    private readonly nominalRepo: Repository<NominalOutsideDiameterMm>,
  ) {}

  async create(dto: CreateNominalOutsideDiameterMmDto): Promise<NominalOutsideDiameterMm> {
    const existing = await this.nominalRepo.findOne({ where: { nominal_diameter_mm: dto.nominal_diameter_mm, outside_diameter_mm: dto.outside_diameter_mm } });
    if (existing) throw new BadRequestException('This nominal + outside diameter combination already exists');
    const nominal = this.nominalRepo.create(dto);
    return this.nominalRepo.save(nominal);
  }

  async findAll(): Promise<NominalOutsideDiameterMm[]> {
    return this.nominalRepo.find({ relations: ['pipeDimensions', 'fittingBores'] });
  }

  async findOne(id: number): Promise<NominalOutsideDiameterMm> {
    const nominal = await this.nominalRepo.findOne({ where: { id }, relations: ['pipeDimensions', 'fittingBores'] });
    if (!nominal) throw new NotFoundException(`NominalOutsideDiameterMm ${id} not found`);
    return nominal;
  }

  async update(id: number, dto: UpdateNominalOutsideDiameterMmDto): Promise<NominalOutsideDiameterMm> {
    const nominal = await this.findOne(id);
    Object.assign(nominal, dto);
    return this.nominalRepo.save(nominal);
  }

  async remove(id: number): Promise<void> {
    const nominal = await this.findOne(id);
    await this.nominalRepo.remove(nominal);
  }
}
