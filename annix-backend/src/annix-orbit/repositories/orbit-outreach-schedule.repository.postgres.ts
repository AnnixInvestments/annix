import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { OrbitOutreachSchedule } from "../entities/orbit-outreach-schedule.entity";
import { OrbitOutreachScheduleRepository } from "./orbit-outreach-schedule.repository";

@Injectable()
export class PostgresOrbitOutreachScheduleRepository
  extends TypeOrmCrudRepository<OrbitOutreachSchedule>
  implements OrbitOutreachScheduleRepository
{
  constructor(
    @InjectRepository(OrbitOutreachSchedule) repository: Repository<OrbitOutreachSchedule>,
  ) {
    super(repository);
  }

  listNewestFirst(): Promise<OrbitOutreachSchedule[]> {
    return this.repository.find({ order: { scheduledAt: "DESC" } });
  }

  listDuePending(cutoff: Date): Promise<OrbitOutreachSchedule[]> {
    return this.repository.find({
      where: { status: "pending", scheduledAt: LessThanOrEqual(cutoff) },
      order: { scheduledAt: "ASC" },
    });
  }
}
