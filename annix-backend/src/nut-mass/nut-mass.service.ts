import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateNutMassDto } from './dto/create-nut-mass.dto';
import { UpdateNutMassDto } from './dto/update-nut-mass.dto';
import { NutMass } from './entities/nut-mass.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Bolt } from 'src/bolt/entities/bolt.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NutMassService {
  constructor(
    @InjectRepository(NutMass) private readonly nutMassRepo: Repository<NutMass>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {}

 async create(dto: CreateNutMassDto): Promise<NutMass> {
    const bolt = await this.boltRepo.findOne({ where: { id: dto.boltId } });
    if (!bolt) throw new NotFoundException(`Bolt ${dto.boltId} not found`);

    const exists = await this.nutMassRepo.findOne({ where: { bolt: { id: dto.boltId }, mass_kg: dto.mass_kg } });
    if (exists) throw new BadRequestException('Nut mass already exists for this bolt');

    const nut = this.nutMassRepo.create({ bolt, mass_kg: dto.mass_kg });
    return this.nutMassRepo.save(nut);
  }

  async findAll(): Promise<NutMass[]> {
    return this.nutMassRepo.find({ relations: ['bolt'] });
  }

  async findOne(id: number): Promise<NutMass> {
    const nut = await this.nutMassRepo.findOne({ where: { id }, relations: ['bolt'] });
    if (!nut) throw new NotFoundException(`Nut mass ${id} not found`);
    return nut;
  }

  async update(id: number, dto: UpdateNutMassDto): Promise<NutMass> {
    const nut = await this.findOne(id);
    if (dto.mass_kg) nut.mass_kg = dto.mass_kg;
    return this.nutMassRepo.save(nut);
  }

  async remove(id: number): Promise<void> {
    const nut = await this.findOne(id);
    await this.nutMassRepo.remove(nut);
  }
}
