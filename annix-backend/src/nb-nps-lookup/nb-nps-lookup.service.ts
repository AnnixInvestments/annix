import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateNbNpsLookupDto } from './dto/create-nb-nps-lookup.dto';
import { UpdateNbNpsLookupDto } from './dto/update-nb-nps-lookup.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NbNpsLookup } from './entities/nb-nps-lookup.entity';

@Injectable()
export class NbNpsLookupService {
  constructor(
    @InjectRepository(NbNpsLookup)
    private readonly repo: Repository<NbNpsLookup>,
  ) {}

  async create(dto: CreateNbNpsLookupDto): Promise<NbNpsLookup> {
    const exists = await this.repo.findOne({
      where: {
        nb_mm: dto.nb_mm,
        nps_inch: dto.nps_inch,
        outside_diameter_mm: dto.outside_diameter_mm,
      },
    });

    if (exists) {
      throw new BadRequestException(
        `NbNpsLookup already exists for NB ${dto.nb_mm} mm / NPS ${dto.nps_inch}" / OD ${dto.outside_diameter_mm} mm`,
      );
    }

    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async findAll(): Promise<NbNpsLookup[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<NbNpsLookup> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`NbNpsLookup #${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: UpdateNbNpsLookupDto): Promise<NbNpsLookup> {
    const entity = await this.findOne(id);

    if (dto.nb_mm && dto.nps_inch && dto.outside_diameter_mm) {
      const exists = await this.repo.findOne({
        where: {
          nb_mm: dto.nb_mm,
          nps_inch: dto.nps_inch,
          outside_diameter_mm: dto.outside_diameter_mm,
        },
      });

      if (exists && exists.id !== id) {
        throw new BadRequestException(
          `Another NbNpsLookup already exists with NB ${dto.nb_mm} mm / NPS ${dto.nps_inch}" / OD ${dto.outside_diameter_mm} mm`,
        );
      }
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
