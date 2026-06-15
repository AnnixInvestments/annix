import { CrudRepository } from "../../lib/persistence/crud-repository";
import { OrbitOutreachSchedule } from "../entities/orbit-outreach-schedule.entity";

export abstract class OrbitOutreachScheduleRepository extends CrudRepository<OrbitOutreachSchedule> {
  abstract listNewestFirst(): Promise<OrbitOutreachSchedule[]>;
  abstract listDuePending(cutoff: Date): Promise<OrbitOutreachSchedule[]>;
}
