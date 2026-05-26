import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeNpsOd, PipeScheduleWall } from "./entities/pipe-schedule-wall.entity";
import { PipeAllowableStress, PipeSteelGrade } from "./entities/steel-grade-stress.entity";

export abstract class PipeSizingRepository extends CrudRepository<PipeSteelGrade> {
  abstract findAllGradesOrdered(): Promise<PipeSteelGrade[]>;
  abstract findGradeByCode(code: string): Promise<PipeSteelGrade | null>;
  abstract findAllNpsOdOrdered(): Promise<PipeNpsOd[]>;
  abstract findNpsOdByNps(nps: string): Promise<PipeNpsOd | null>;
  abstract findScheduleWallsByNps(nps: string): Promise<PipeScheduleWall[]>;
  abstract findScheduleWallByNpsAndDesignation(
    nps: string,
    schedule: string,
  ): Promise<PipeScheduleWall | null>;
  abstract findStressesByGradeId(gradeId: number): Promise<PipeAllowableStress[]>;
}
