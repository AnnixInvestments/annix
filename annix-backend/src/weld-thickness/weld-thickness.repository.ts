import { CrudRepository } from "../lib/persistence/crud-repository";
import { WeldThicknessFittingRecommendation } from "./entities/weld-thickness-fitting-recommendation.entity";
import { WeldThicknessPipeRecommendation } from "./entities/weld-thickness-pipe-recommendation.entity";

export abstract class WeldThicknessRepository extends CrudRepository<WeldThicknessFittingRecommendation> {
  abstract findFitting(
    nominalBoreMm: number,
    fittingClass: string,
    temperatureCelsius: number,
  ): Promise<WeldThicknessFittingRecommendation | null>;
  abstract findFittingsByDnAndTemp(
    nominalBoreMm: number,
    temperatureCelsius: number,
  ): Promise<WeldThicknessFittingRecommendation[]>;
  abstract findAllFittings(): Promise<WeldThicknessFittingRecommendation[]>;
  abstract findAvailableFittingDns(): Promise<number[]>;
  abstract findFittingTemperatureBreakpoints(): Promise<number[]>;
  abstract findPipe(
    nominalBoreMm: number,
    schedule: string,
    steelType: string,
    temperatureCelsius: number,
  ): Promise<WeldThicknessPipeRecommendation | null>;
  abstract findAllPipesBySteelType(steelType: string): Promise<WeldThicknessPipeRecommendation[]>;
  abstract findPipeTemperatureBreakpoints(): Promise<number[]>;
}
