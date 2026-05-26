import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CreatePipePressureDto } from "./dto/create-pipe-pressure.dto";
import { UpdatePipePressureDto } from "./dto/update-pipe-pressure.dto";
import { PipePressure } from "./entities/pipe-pressure.entity";
import { PipePressureRepository } from "./pipe-pressure.repository";

@Injectable()
export class PostgresPipePressureRepository
  extends TypeOrmCrudRepository<PipePressure>
  implements PipePressureRepository
{
  constructor(@InjectRepository(PipePressure) repository: Repository<PipePressure>) {
    super(repository);
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.repository.delete(id);
    return result.affected ?? 0;
  }

  findDuplicateForCreate(dto: CreatePipePressureDto): Promise<PipePressure | null> {
    return this.repository.findOne({
      where: {
        pipeDimension: { id: dto.pipeDimensionId },
        temperature_c: dto.temperature_c ?? IsNull(),
        max_working_pressure_mpa: dto.max_working_pressure_mpa ?? IsNull(),
        allowable_stress_mpa: dto.allowable_stress_mpa,
      },
      relations: ["pipeDimension"],
    });
  }

  findDuplicateForUpdate(
    id: number,
    entity: PipePressure,
    dto: UpdatePipePressureDto,
  ): Promise<PipePressure | null> {
    return this.repository.findOne({
      where: {
        pipeDimension: { id: entity.pipeDimension.id },
        temperature_c: dto.temperature_c ?? entity.temperature_c ?? IsNull(),
        max_working_pressure_mpa:
          dto.max_working_pressure_mpa ?? entity.max_working_pressure_mpa ?? IsNull(),
        allowable_stress_mpa: dto.allowable_stress_mpa ?? entity.allowable_stress_mpa,
      },
      relations: ["pipeDimension"],
    });
  }
}
