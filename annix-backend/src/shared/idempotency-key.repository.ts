import { CrudRepository } from "../lib/persistence/crud-repository";
import { IdempotencyKey } from "./entities/idempotency-key.entity";

export abstract class IdempotencyKeyRepository extends CrudRepository<IdempotencyKey> {
  abstract deleteExpired(before: Date): Promise<number>;
}
