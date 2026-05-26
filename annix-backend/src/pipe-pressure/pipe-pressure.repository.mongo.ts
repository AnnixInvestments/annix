import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CreatePipePressureDto } from "./dto/create-pipe-pressure.dto";
import { UpdatePipePressureDto } from "./dto/update-pipe-pressure.dto";
import { PipePressure } from "./entities/pipe-pressure.entity";
import { PipePressureRepository } from "./pipe-pressure.repository";

@Injectable()
export class MongoPipePressureRepository
  extends MongoCrudRepository<PipePressure>
  implements PipePressureRepository
{
  constructor(@InjectModel("PipePressure") model: Model<PipePressure>) {
    super(model);
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount ?? 0;
  }

  async findDuplicateForCreate(dto: CreatePipePressureDto): Promise<PipePressure | null> {
    const filter: Record<string, unknown> = {
      pipeDimensionId: dto.pipeDimensionId,
      allowable_stress_mpa: dto.allowable_stress_mpa,
    };
    if (dto.temperature_c !== undefined && dto.temperature_c !== null) {
      filter.temperature_c = dto.temperature_c;
    } else {
      filter.temperature_c = null;
    }
    if (dto.max_working_pressure_mpa !== undefined && dto.max_working_pressure_mpa !== null) {
      filter.max_working_pressure_mpa = dto.max_working_pressure_mpa;
    } else {
      filter.max_working_pressure_mpa = null;
    }
    return this.toDomain(await this.documents.findOne(filter).lean().exec());
  }

  async findDuplicateForUpdate(
    id: number,
    entity: PipePressure,
    dto: UpdatePipePressureDto,
  ): Promise<PipePressure | null> {
    const resolvedTemperature =
      dto.temperature_c !== undefined ? dto.temperature_c : entity.temperature_c;
    const resolvedMaxPressure =
      dto.max_working_pressure_mpa !== undefined
        ? dto.max_working_pressure_mpa
        : entity.max_working_pressure_mpa;
    const resolvedStress =
      dto.allowable_stress_mpa !== undefined
        ? dto.allowable_stress_mpa
        : entity.allowable_stress_mpa;
    const filter: Record<string, unknown> = {
      pipeDimensionId: entity.pipeDimension.id,
      allowable_stress_mpa: resolvedStress,
      temperature_c: resolvedTemperature !== undefined ? resolvedTemperature : null,
      max_working_pressure_mpa: resolvedMaxPressure !== undefined ? resolvedMaxPressure : null,
    };
    return this.toDomain(await this.documents.findOne(filter).lean().exec());
  }
}
