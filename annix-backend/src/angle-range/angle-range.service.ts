// import { Injectable } from '@nestjs/common';
// import { CreateAngleRangeDto } from './dto/create-angle-range.dto';
// import { UpdateAngleRangeDto } from './dto/update-angle-range.dto';

// @Injectable()
// export class AngleRangeService {
//   create(createAngleRangeDto: CreateAngleRangeDto) {
//     return 'This action adds a new angleRange';
//   }

//   findAll() {
//     return `This action returns all angleRange`;
//   }

//   findOne(id: number) {
//     return `This action returns a #${id} angleRange`;
//   }

//   update(id: number, updateAngleRangeDto: UpdateAngleRangeDto) {
//     return `This action updates a #${id} angleRange`;
//   }

//   remove(id: number) {
//     return `This action removes a #${id} angleRange`;
//   }
// }
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AngleRange } from './entities/angle-range.entity';
import { CreateAngleRangeDto } from './dto/create-angle-range.dto';
import { UpdateAngleRangeDto } from './dto/update-angle-range.dto';

@Injectable()
export class AngleRangeService {
  constructor(
    @InjectRepository(AngleRange)
    private readonly rangeRepo: Repository<AngleRange>,
  ) {}

  async create(dto: CreateAngleRangeDto): Promise<AngleRange> {
    const exists = await this.rangeRepo.findOne({ where: { angle_min: dto.angle_min, angle_max: dto.angle_max } });
    if (exists) {
      throw new BadRequestException(
        `AngleRange with min ${dto.angle_min}° and max ${dto.angle_max}° already exists`,
      );
    }

    const entity = this.rangeRepo.create(dto);
    return this.rangeRepo.save(entity);
  }

  async findAll(): Promise<AngleRange[]> {
    return this.rangeRepo.find({ relations: ['fittingDimensions'] });
  }

  async findOne(id: number): Promise<AngleRange> {
    const range = await this.rangeRepo.findOne({ where: { id }, relations: ['fittingDimensions'] });
    if (!range) throw new NotFoundException(`AngleRange ${id} not found`);
    return range;
  }

  async update(id: number, dto: UpdateAngleRangeDto): Promise<AngleRange> {
    const range = await this.findOne(id);
    Object.assign(range, dto);
    return this.rangeRepo.save(range);
  }

  async remove(id: number): Promise<void> {
    const range = await this.findOne(id);
    await this.rangeRepo.remove(range);
  }
}
