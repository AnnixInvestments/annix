import type { ClientSession } from "mongoose";

export abstract class TransactionContext {}

export class MongoTransactionContext extends TransactionContext {
  constructor(readonly session: ClientSession) {
    super();
  }
}
