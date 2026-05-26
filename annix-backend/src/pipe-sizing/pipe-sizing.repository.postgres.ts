import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeNpsOd, PipeScheduleWall } from "./entities/pipe-schedule-wall.entity";
import { PipeAllowableStress, PipeSteelGrade } from "./entities/steel-grade-stress.entity";
import { PipeSizingRepository } from "./pipe-sizing.repository";

@Injectable()
export class PostgresPipeSizingRepository
  extends TypeOrmCrudRepository<PipeSteelGrade>
  implements PipeSizingRepository
{
  constructor(
    @InjectRepository(PipeSteelGrade) repository: Repository<PipeSteelGrade>,
    @InjectRepository(PipeAllowableStress)
    private readonly stressRepo: Repository<PipeAllowableStress>,
    @InjectRepository(PipeScheduleWall)
    private readonly scheduleWallRepo: Repository<PipeScheduleWall>,
    @InjectRepository(PipeNpsOd)
    private readonly npsOdRepo: Repository<PipeNpsOd>,
  ) {
    super(repository);
  }

  findAllGradesOrdered(): Promise<PipeSteelGrade[]> {
    return this.repository.find({ order: { code: "ASC" } });
  }

  findGradeByCode(code: string): Promise<PipeSteelGrade | null> {
    return this.repository.findOne({ where: { code } });
  }

  findAllNpsOdOrdered(): Promise<PipeNpsOd[]> {
    return this.npsOdRepo.find({ order: { odInch: "ASC" } });
  }

  findNpsOdByNps(nps: string): Promise<PipeNpsOd | null> {
    return this.npsOdRepo.findOne({ where: { nps } });
  }

  findScheduleWallsByNps(nps: string): Promise<PipeScheduleWall[]> {
    return this.scheduleWallRepo.find({
      where: { nps },
      order: { wallThicknessInch: "ASC" },
    });
  }

  findScheduleWallByNpsAndDesignation(
    nps: string,
    schedule: string,
  ): Promise<PipeScheduleWall | null> {
    return this.scheduleWallRepo.findOne({ where: { nps, schedule } });
  }

  findStressesByGradeId(gradeId: number): Promise<PipeAllowableStress[]> {
    return this.stressRepo.find({
      where: { gradeId },
      order: { temperatureF: "ASC" },
    });
  }
}
