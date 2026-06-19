import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { MongoTransactionContext, TransactionContext } from "./transaction-context";

export abstract class TransactionRunner {
  abstract run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}

@Injectable()
export class MongoTransactionRunner extends TransactionRunner {
  constructor(@InjectConnection() private readonly connection: Connection) {
    super();
  }

  async run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    const session = await this.connection.startSession();
    let result: T | null = null;
    try {
      await session.withTransaction(async () => {
        result = await work(new MongoTransactionContext(session));
      });
      return result as T;
    } finally {
      await session.endSession();
    }
  }
}
