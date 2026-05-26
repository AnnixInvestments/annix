import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MaterialAllowableStress } from "./entities/material-allowable-stress.entity";
import { PipeSchedule } from "./entities/pipe-schedule.entity";
import { PipeScheduleRepository } from "./pipe-schedule.repository";

@Injectable()
export class PostgresPipeScheduleRepository
  extends TypeOrmCrudRepository<PipeSchedule>
  implements PipeScheduleRepository
{
  constructor(
    @InjectRepository(PipeSchedule) repository: Repository<PipeSchedule>,
    @InjectRepository(MaterialAllowableStress)
    private readonly stressRepo: Repository<MaterialAllowableStress>,
  ) {
    super(repository);
  }

  findStressesByMaterialOrdered(materialCode: string): Promise<MaterialAllowableStress[]> {
    return this.stressRepo.find({
      where: { materialCode },
      order: { temperatureCelsius: "ASC" },
    });
  }

  findSchedulesByNps(nps: string): Promise<PipeSchedule[]> {
    return this.repository.find({
      where: { nps },
      order: { wallThicknessInch: "ASC" },
    });
  }

  findSchedulesByNbMm(nbMm: number): Promise<PipeSchedule[]> {
    return this.repository.find({
      where: { nbMm },
      order: { wallThicknessInch: "ASC" },
    });
  }

  findAllSchedulesOrdered(): Promise<PipeSchedule[]> {
    return this.repository.find({
      order: { nbMm: "ASC", wallThicknessInch: "ASC" },
    });
  }

  distinctMaterials(): Promise<{ materialCode: string; materialName: string }[]> {
    return this.stressRepo
      .createQueryBuilder("stress")
      .select("DISTINCT stress.material_code", "materialCode")
      .addSelect("stress.material_name", "materialName")
      .getRawMany();
  }

  distinctNpsSizes(): Promise<{ nps: string }[]> {
    return this.repository
      .createQueryBuilder("schedule")
      .select("DISTINCT schedule.nps", "nps")
      .orderBy("schedule.nps", "ASC")
      .getRawMany();
  }

  findScheduleByNpsAndDesignation(nps: string, schedule: string): Promise<PipeSchedule | null> {
    return this.repository.findOne({ where: { nps, schedule } });
  }
}
