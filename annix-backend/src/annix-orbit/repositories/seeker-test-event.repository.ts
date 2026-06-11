import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerTestEvent } from "../entities/seeker-test-event.entity";

export abstract class SeekerTestEventRepository extends CrudRepository<SeekerTestEvent> {
  abstract recentFailures(limit: number): Promise<SeekerTestEvent[]>;
  abstract eventsSince(since: Date): Promise<SeekerTestEvent[]>;
  abstract countByEventNameSince(eventName: string, since: Date): Promise<number>;
}
