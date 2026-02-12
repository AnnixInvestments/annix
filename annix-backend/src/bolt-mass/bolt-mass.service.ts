import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBoltMassDto } from './dto/create-bolt-mass.dto';
import { UpdateBoltMassDto } from './dto/update-bolt-mass.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoltMass } from './entities/bolt-mass.entity';
import { Bolt } from 'src/bolt/entities/bolt.entity';

@Injectable()
export class BoltMassService {
  constructor(
    @InjectRepository(BoltMass) private readonly boltMassRepo: Repository<BoltMass>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {}

  async create(dto: CreateBoltMassDto): Promise<BoltMass> {
    const bolt = await this.boltRepo.findOne({ where: { id: dto.boltId } });
    if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);

    const exists = await this.boltMassRepo.findOne({ 
      where: { bolt: { id: dto.boltId }, length_mm: dto.length_mm } 
    });
    if (exists) throw new BadRequestException(`BoltMass already exists`);

    const mass = this.boltMassRepo.create({ bolt, ...dto });
    return this.boltMassRepo.save(mass);
  }

  async findAll(): Promise<BoltMass[]> {
    return this.boltMassRepo.find({ relations: ['bolt'] });
  }

  async findOne(id: number): Promise<BoltMass> {
    const mass = await this.boltMassRepo.findOne({ where: { id }, relations: ['bolt'] });
    if (!mass) throw new NotFoundException(`BoltMass ${id} not found`);
    return mass;
  }

  async update(id: number, dto: UpdateBoltMassDto): Promise<BoltMass> {
    const mass = await this.findOne(id);

    if (dto.length_mm) mass.length_mm = dto.length_mm;
    if (dto.mass_kg) mass.mass_kg = dto.mass_kg;

    return this.boltMassRepo.save(mass);
  }

  async remove(id: number): Promise<void> {
    const mass = await this.findOne(id);
    await this.boltMassRepo.remove(mass);
  }
}
