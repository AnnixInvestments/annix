import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BaseCrudService } from "../lib/base-crud.service";
import { PipeDimensionRepository } from "../pipe-dimension/pipe-dimension.repository";
import { CreatePipePressureDto } from "./dto/create-pipe-pressure.dto";
import { UpdatePipePressureDto } from "./dto/update-pipe-pressure.dto";
import { PipePressure } from "./entities/pipe-pressure.entity";
import { PipePressureRepository } from "./pipe-pressure.repository";

@Injectable()
export class PipePressureService extends BaseCrudService<
  PipePressure,
  CreatePipePressureDto,
  UpdatePipePressureDto
> {
  constructor(
    private readonly pressureRepository: PipePressureRepository,
    private readonly dimensionRepo: PipeDimensionRepository,
  ) {
    super(pressureRepository, {
      entityName: "PipePressure",
      defaultRelations: ["pipeDimension"],
    });
  }

  async create(dto: CreatePipePressureDto): Promise<PipePressure> {
    const dimension = await this.dimensionRepo.findById(dto.pipeDimensionId, ["pressures"]);
    if (!dimension) {
      throw new NotFoundException(`PipeDimension #${dto.pipeDimensionId} not found`);
    }

    const exists = await this.pressureRepository.findDuplicateForCreate(dto);
    if (exists) {
      throw new BadRequestException(
        `PipePressure with temperature ${dto.temperature_c ?? "null"} °C, ` +
          `max working pressure ${dto.max_working_pressure_mpa ?? "null"} MPa, ` +
          `and allowable stress ${dto.allowable_stress_mpa} MPa already exists for PipeDimension ID ${dto.pipeDimensionId}`,
      );
    }

    return this.repository.create({
      temperature_c: dto.temperature_c ?? null,
      max_working_pressure_mpa: dto.max_working_pressure_mpa ?? null,
      allowable_stress_mpa: dto.allowable_stress_mpa,
      pipeDimension: dimension,
    });
  }

  async update(id: number, dto: UpdatePipePressureDto): Promise<PipePressure> {
    const entity = await this.findOne(id);

    const exists = await this.pressureRepository.findDuplicateForUpdate(id, entity, dto);
    if (exists && exists.id !== id) {
      throw new BadRequestException(
        `PipePressure with temperature ${dto.temperature_c ?? entity.temperature_c ?? "null"} °C, ` +
          `max working pressure ${dto.max_working_pressure_mpa ?? entity.max_working_pressure_mpa ?? "null"} MPa, ` +
          `and allowable stress ${dto.allowable_stress_mpa ?? entity.allowable_stress_mpa} MPa ` +
          `already exists for PipeDimension ID ${entity.pipeDimension.id}`,
      );
    }

    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    const affected = await this.pressureRepository.deleteById(id);
    if (affected === 0) {
      throw new NotFoundException(`PipePressure #${id} not found`);
    }
  }
}
