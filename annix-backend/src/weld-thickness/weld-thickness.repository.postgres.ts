import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { WeldThicknessFittingRecommendation } from "./entities/weld-thickness-fitting-recommendation.entity";
import { WeldThicknessPipeRecommendation } from "./entities/weld-thickness-pipe-recommendation.entity";
import { WeldThicknessRepository } from "./weld-thickness.repository";

@Injectable()
export class PostgresWeldThicknessRepository
  extends TypeOrmCrudRepository<WeldThicknessFittingRecommendation>
  implements WeldThicknessRepository
{
  constructor(
    @InjectRepository(WeldThicknessFittingRecommendation)
    repository: Repository<WeldThicknessFittingRecommendation>,
    @InjectRepository(WeldThicknessPipeRecommendation)
    private readonly pipeRepository: Repository<WeldThicknessPipeRecommendation>,
  ) {
    super(repository);
  }

  findFitting(
    nominalBoreMm: number,
    fittingClass: string,
    temperatureCelsius: number,
  ): Promise<WeldThicknessFittingRecommendation | null> {
    return this.repository.findOne({
      where: {
        nominal_bore_mm: nominalBoreMm,
        fitting_class: fittingClass,
        temperature_celsius: temperatureCelsius,
      },
    });
  }

  findFittingsByDnAndTemp(
    nominalBoreMm: number,
    temperatureCelsius: number,
  ): Promise<WeldThicknessFittingRecommendation[]> {
    return this.repository.find({
      where: {
        nominal_bore_mm: nominalBoreMm,
        temperature_celsius: temperatureCelsius,
      },
    });
  }

  findAllFittings(): Promise<WeldThicknessFittingRecommendation[]> {
    return this.repository.find();
  }

  async findAvailableFittingDns(): Promise<number[]> {
    const result = await this.repository
      .createQueryBuilder("fitting")
      .select("DISTINCT fitting.nominal_bore_mm", "dn")
      .orderBy("fitting.nominal_bore_mm", "ASC")
      .getRawMany();

    return result.map((r) => r.dn);
  }

  async findFittingTemperatureBreakpoints(): Promise<number[]> {
    const result = await this.repository
      .createQueryBuilder("fitting")
      .select("DISTINCT fitting.temperature_celsius", "temp")
      .orderBy("fitting.temperature_celsius", "ASC")
      .getRawMany();

    return result.map((t) => t.temp);
  }

  findPipe(
    nominalBoreMm: number,
    schedule: string,
    steelType: string,
    temperatureCelsius: number,
  ): Promise<WeldThicknessPipeRecommendation | null> {
    return this.pipeRepository.findOne({
      where: {
        nominal_bore_mm: nominalBoreMm,
        schedule,
        steel_type: steelType,
        temperature_celsius: temperatureCelsius,
      },
    });
  }

  findAllPipesBySteelType(steelType: string): Promise<WeldThicknessPipeRecommendation[]> {
    return this.pipeRepository.find({
      where: { steel_type: steelType },
    });
  }

  async findPipeTemperatureBreakpoints(): Promise<number[]> {
    const result = await this.pipeRepository
      .createQueryBuilder("pipe")
      .select("DISTINCT pipe.temperature_celsius", "temp")
      .orderBy("pipe.temperature_celsius", "ASC")
      .getRawMany();

    return result.map((t) => t.temp);
  }
}
