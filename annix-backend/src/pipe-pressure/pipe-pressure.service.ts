import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { BaseCrudService } from "../lib/base-crud.service";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { CreatePipePressureDto } from "./dto/create-pipe-pressure.dto";
import { UpdatePipePressureDto } from "./dto/update-pipe-pressure.dto";
import { PipePressure } from "./entities/pipe-pressure.entity";

@Injectable()
export class PipePressureService extends BaseCrudService<
  PipePressure,
  CreatePipePressureDto,
  UpdatePipePressureDto
> {
  constructor(
    @InjectRepository(PipePressure)
    pressureRepo: Repository<PipePressure>,
    @InjectRepository(PipeDimension)
    private readonly dimensionRepo: Repository<PipeDimension>,
  ) {
    super(pressureRepo, {
      entityName: "PipePressure",
      defaultRelations: ["pipeDimension"],
    });
  }

  async create(dto: CreatePipePressureDto): Promise<PipePressure> {
    const dimension = await this.dimensionRepo.findOne({
      where: { id: dto.pipeDimensionId },
      relations: ["pressures"],
    });
    if (!dimension) {
      throw new NotFoundException(`PipeDimension #${dto.pipeDimensionId} not found`);
    }

    const exists = await this.repo.findOne({
      where: {
        pipeDimension: { id: dto.pipeDimensionId },
        temperature_c: dto.temperature_c ?? IsNull(),
        max_working_pressure_mpa: dto.max_working_pressure_mpa ?? IsNull(),
        allowable_stress_mpa: dto.allowable_stress_mpa,
      },
      relations: ["pipeDimension"],
    });

    if (exists) {
      throw new BadRequestException(
        `PipePressure with temperature ${dto.temperature_c ?? "null"} °C, ` +
          `max working pressure ${dto.max_working_pressure_mpa ?? "null"} MPa, ` +
          `and allowable stress ${dto.allowable_stress_mpa} MPa already exists for PipeDimension ID ${dto.pipeDimensionId}`,
      );
    }

    const entity = this.repo.create({
      temperature_c: dto.temperature_c ?? null,
      max_working_pressure_mpa: dto.max_working_pressure_mpa ?? null,
      allowable_stress_mpa: dto.allowable_stress_mpa,
      pipeDimension: dimension,
    });

    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdatePipePressureDto): Promise<PipePressure> {
    const entity = await this.findOne(id);

    const exists = await this.repo.findOne({
      where: {
        pipeDimension: { id: entity.pipeDimension.id },
        temperature_c: dto.temperature_c ?? entity.temperature_c ?? IsNull(),
        max_working_pressure_mpa:
          dto.max_working_pressure_mpa ?? entity.max_working_pressure_mpa ?? IsNull(),
        allowable_stress_mpa: dto.allowable_stress_mpa ?? entity.allowable_stress_mpa,
      },
      relations: ["pipeDimension"],
    });

    if (exists && exists.id !== id) {
      throw new BadRequestException(
        `PipePressure with temperature ${dto.temperature_c ?? entity.temperature_c ?? "null"} °C, ` +
          `max working pressure ${dto.max_working_pressure_mpa ?? entity.max_working_pressure_mpa ?? "null"} MPa, ` +
          `and allowable stress ${dto.allowable_stress_mpa ?? entity.allowable_stress_mpa} MPa ` +
          `already exists for PipeDimension ID ${entity.pipeDimension.id}`,
      );
    }

    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`PipePressure #${id} not found`);
    }
  }
}
