import { Global, Module } from "@nestjs/common";
import { MongoTransactionRunner, TransactionRunner } from "./transaction-runner";

@Global()
@Module({
  providers: [
    {
      provide: TransactionRunner,
      useClass: MongoTransactionRunner,
    },
  ],
  exports: [TransactionRunner],
})
export class TransactionModule {}
