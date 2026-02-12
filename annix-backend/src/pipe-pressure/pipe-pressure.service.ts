import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PipePressure } from './entities/pipe-pressure.entity';
import { CreatePipePressureDto } from './dto/create-pipe-pressure.dto';
import { UpdatePipePressureDto } from './dto/update-pipe-pressure.dto';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';

@Injectable()
export class PipePressureService {
  constructor(
    @InjectRepository(PipePressure)
    private readonly pressureRepo: Repository<PipePressure>,
    @InjectRepository(PipeDimension)
    private readonly dimensionRepo: Repository<PipeDimension>,
  ) {}

  async create(pipeDimensionId: number, dto: CreatePipePressureDto): Promise<PipePressure> {
    const dimension = await this.dimensionRepo.findOne({
      where: { id: pipeDimensionId },
      relations: ['pressures'],
    });
    if (!dimension) {
      throw new NotFoundException(`PipeDimension #${pipeDimensionId} not found`);
    }

    const exists = await this.pressureRepo.findOne({
      where: {
        pipeDimension: { id: pipeDimensionId },
        temperature_c: dto.temperature_c ?? IsNull(),
        max_working_pressure_mpa: dto.max_working_pressure_mpa ?? IsNull(),
        allowable_stress_mpa: dto.allowable_stress_mpa,
      },
      relations: ['pipeDimension'],
    });

    if (exists) {
      throw new BadRequestException(
        `PipePressure with temperature ${dto.temperature_c ?? 'null'} °C, ` +
        `max working pressure ${dto.max_working_pressure_mpa ?? 'null'} MPa, ` +
        `and allowable stress ${dto.allowable_stress_mpa} MPa already exists for PipeDimension ID ${pipeDimensionId}`
      );
    }

    const entity = this.pressureRepo.create({
      temperature_c: dto.temperature_c ?? null,
      max_working_pressure_mpa: dto.max_working_pressure_mpa ?? null,
      allowable_stress_mpa: dto.allowable_stress_mpa,
      pipeDimension: dimension,
    });

    return this.pressureRepo.save(entity);
  }


  findAll(): Promise<PipePressure[]> {
    return this.pressureRepo.find({ relations: ['pipeDimension'] });
  }

  async findOne(id: number): Promise<PipePressure> {
    const entity = await this.pressureRepo.findOne({
      where: { id },
      relations: ['pipeDimension'],
    });
    if (!entity) throw new NotFoundException(`PipePressure #${id} not found`);
    return entity;
  }

  async update(id: number, dto: UpdatePipePressureDto): Promise<PipePressure> {
    const entity = await this.findOne(id);

    let dimension: PipeDimension = entity.pipeDimension;

    if (id) {
      const newDimension = await this.dimensionRepo.findOne({ where: { id: id } });
      if (!newDimension) throw new NotFoundException(`PipeDimension #${id} not found`);
      dimension = newDimension;
    }

    const exists = await this.pressureRepo.findOne({
      where: {
        pipeDimension: { id: dimension.id },
        temperature_c: dto.temperature_c ?? entity.temperature_c ?? IsNull(),
        max_working_pressure_mpa: dto.max_working_pressure_mpa ?? entity.max_working_pressure_mpa ?? IsNull(),
        allowable_stress_mpa: dto.allowable_stress_mpa ?? entity.allowable_stress_mpa,
      },
      relations: ['pipeDimension'],
    });

    if (exists && exists.id !== id) {
      throw new BadRequestException(
        `PipePressure with temperature ${dto.temperature_c ?? entity.temperature_c ?? 'null'} °C, ` +
        `max working pressure ${dto.max_working_pressure_mpa ?? entity.max_working_pressure_mpa ?? 'null'} MPa, ` +
        `and allowable stress ${dto.allowable_stress_mpa ?? entity.allowable_stress_mpa} MPa ` +
        `already exists for PipeDimension ID ${dimension.id}`
      );
    }

    Object.assign(entity, { ...dto, pipeDimension: dimension });

    return this.pressureRepo.save(entity);
  }

  async remove(id: number): Promise<void> {
    const result = await this.pressureRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`PipePressure #${id} not found`);
    }
  }
}
