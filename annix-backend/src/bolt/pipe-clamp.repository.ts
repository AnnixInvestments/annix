import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";

export abstract class PipeClampRepository extends CrudRepository<PipeClampEntity> {
  abstract pipeClamps(clampType?: string, nbMm?: number): Promise<PipeClampEntity[]>;
  abstract pipeClamp(clampType: string, nbMm: number): Promise<PipeClampEntity | null>;
  abstract pipeClampTypes(): Promise<Array<{ clampType: string; clampDescription: string }>>;
}
