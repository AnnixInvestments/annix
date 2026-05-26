import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CvPushSubscription } from "../entities/cv-push-subscription.entity";

export abstract class CvPushSubscriptionRepository extends CrudRepository<CvPushSubscription> {
  abstract findByEndpoint(endpoint: string): Promise<CvPushSubscription | null>;
  abstract findByUser(userId: number): Promise<CvPushSubscription[]>;
  abstract countForUser(userId: number): Promise<number>;
  abstract deleteByUserEndpoint(userId: number, endpoint: string): Promise<void>;
  abstract deleteByIds(ids: number[]): Promise<void>;
}
