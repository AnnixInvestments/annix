import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoltDto } from './dto/create-bolt.dto';
import { UpdateBoltDto } from './dto/update-bolt.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bolt } from './entities/bolt.entity';

@Injectable()
export class BoltService {
  constructor(
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {}

  async create(createBoltDto: CreateBoltDto): Promise<Bolt> {
    const exists = await this.boltRepo.findOne({ where: { designation: createBoltDto.designation } });
    if (exists) throw new BadRequestException(`Bolt ${createBoltDto.designation} already exists`);

    const bolt = this.boltRepo.create(createBoltDto);
    return this.boltRepo.save(bolt);
  }

  async findAll(): Promise<Bolt[]> {
    return this.boltRepo.find();
  }

  async findOne(id: number): Promise<Bolt> {
    const bolt = await this.boltRepo.findOne({ where: { id } });
    if (!bolt) throw new NotFoundException(`Bolt ${id} not found`);
    return bolt;
  }

  async update(id: number, dto: UpdateBoltDto): Promise<Bolt> {
    const bolt = await this.findOne(id);

    if (dto.designation) {
      const exists = await this.boltRepo.findOne({ where: { designation: dto.designation } });
      if (exists && exists.id !== id) throw new BadRequestException(`Bolt ${dto.designation} already exists`);
      bolt.designation = dto.designation;
    }

    return this.boltRepo.save(bolt);
  }

  async remove(id: number): Promise<void> {
    const bolt = await this.findOne(id);
    await this.boltRepo.remove(bolt);
  }
}
