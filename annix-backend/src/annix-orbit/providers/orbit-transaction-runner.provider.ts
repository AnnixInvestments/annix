import { getConnectionToken } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import {
  MongoTransactionRunner,
  TransactionRunner,
} from "../../lib/persistence/transaction-runner";

export const orbitTransactionRunnerProvider = {
  provide: TransactionRunner,
  useFactory: (connection: Connection) => new MongoTransactionRunner(connection),
  inject: [getConnectionToken(ORBIT_CONNECTION)],
};
