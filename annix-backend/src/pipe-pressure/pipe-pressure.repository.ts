import { CrudRepository } from "../lib/persistence/crud-repository";
import { CreatePipePressureDto } from "./dto/create-pipe-pressure.dto";
import { UpdatePipePressureDto } from "./dto/update-pipe-pressure.dto";
import { PipePressure } from "./entities/pipe-pressure.entity";

export abstract class PipePressureRepository extends CrudRepository<PipePressure> {
  abstract deleteById(id: number): Promise<number>;
  abstract findDuplicateForCreate(dto: CreatePipePressureDto): Promise<PipePressure | null>;
  abstract findDuplicateForUpdate(
    id: number,
    entity: PipePressure,
    dto: UpdatePipePressureDto,
  ): Promise<PipePressure | null>;
}
