import type { ClientSession } from "mongoose";
import type { EntityManager } from "typeorm";

export abstract class TransactionContext {}

export class TypeOrmTransactionContext extends TransactionContext {
  constructor(readonly manager: EntityManager) {
    super();
  }
}

export class MongoTransactionContext extends TransactionContext {
  constructor(readonly session: ClientSession) {
    super();
  }
}
