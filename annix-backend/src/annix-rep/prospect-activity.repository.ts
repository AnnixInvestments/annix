import { CrudRepository } from "../lib/persistence/crud-repository";
import { ProspectActivity, ProspectActivityType } from "./entities/prospect-activity.entity";

export abstract class ProspectActivityRepository extends CrudRepository<ProspectActivity> {
  abstract findByProspect(prospectId: number, limit: number): Promise<ProspectActivity[]>;
  abstract findByProspectAndType(
    prospectId: number,
    activityType: ProspectActivityType,
  ): Promise<ProspectActivity[]>;
  abstract findStatusChangesInRange(
    userId: number,
    from: Date,
    to: Date,
  ): Promise<ProspectActivity[]>;
}
