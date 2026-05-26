import { CrudRepository } from "../lib/persistence/crud-repository";
import { MaterialAllowableStress } from "./entities/material-allowable-stress.entity";
import { PipeSchedule } from "./entities/pipe-schedule.entity";

export abstract class PipeScheduleRepository extends CrudRepository<PipeSchedule> {
  abstract findStressesByMaterialOrdered(materialCode: string): Promise<MaterialAllowableStress[]>;
  abstract findSchedulesByNps(nps: string): Promise<PipeSchedule[]>;
  abstract findSchedulesByNbMm(nbMm: number): Promise<PipeSchedule[]>;
  abstract findAllSchedulesOrdered(): Promise<PipeSchedule[]>;
  abstract distinctMaterials(): Promise<{ materialCode: string; materialName: string }[]>;
  abstract distinctNpsSizes(): Promise<{ nps: string }[]>;
  abstract findScheduleByNpsAndDesignation(
    nps: string,
    schedule: string,
  ): Promise<PipeSchedule | null>;
}
