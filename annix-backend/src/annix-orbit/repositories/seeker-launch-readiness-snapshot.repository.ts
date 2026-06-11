import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerLaunchReadinessSnapshot } from "../entities/seeker-launch-readiness-snapshot.entity";

export abstract class SeekerLaunchReadinessSnapshotRepository extends CrudRepository<SeekerLaunchReadinessSnapshot> {
  abstract listNewestFirst(limit: number): Promise<SeekerLaunchReadinessSnapshot[]>;
  abstract latest(): Promise<SeekerLaunchReadinessSnapshot | null>;
  abstract findByDate(snapshotDate: string): Promise<SeekerLaunchReadinessSnapshot | null>;
}
