import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerBillingEvent } from "../entities/seeker-billing-event.entity";

export abstract class SeekerBillingEventRepository extends CrudRepository<SeekerBillingEvent> {
  abstract existsByPaystackEventId(paystackEventId: string): Promise<boolean>;
  abstract recentForUser(userId: number, limit: number): Promise<SeekerBillingEvent[]>;
  abstract insertIfNew(event: Partial<SeekerBillingEvent>): Promise<boolean>;
  abstract deleteForUser(userId: number): Promise<number>;
}
