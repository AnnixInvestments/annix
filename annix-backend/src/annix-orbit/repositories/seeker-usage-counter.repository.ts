import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerUsageCounter } from "../entities/seeker-usage-counter.entity";

export abstract class SeekerUsageCounterRepository extends CrudRepository<SeekerUsageCounter> {
  abstract getCount(subjectId: string, operation: string, monthKey: string): Promise<number>;
  abstract increment(subjectId: string, operation: string, monthKey: string): Promise<void>;
}
