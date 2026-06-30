import { getConnectionToken } from "@nestjs/mongoose";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import { TransactionRunner } from "../lib/persistence/transaction-runner";
import { orbitTransactionRunnerProvider } from "./providers/orbit-transaction-runner.provider";

describe("orbitTransactionRunnerProvider", () => {
  it("binds transactions to the Orbit Mongo connection", () => {
    expect(orbitTransactionRunnerProvider).toMatchObject({
      provide: TransactionRunner,
      inject: [getConnectionToken(ORBIT_CONNECTION)],
    });
  });
});
