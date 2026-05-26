import { Global, Module } from "@nestjs/common";
import { isMongoDriver } from "./database-driver";
import {
  MongoTransactionRunner,
  TransactionRunner,
  TypeOrmTransactionRunner,
} from "./transaction-runner";

@Global()
@Module({
  providers: [
    {
      provide: TransactionRunner,
      useClass: isMongoDriver() ? MongoTransactionRunner : TypeOrmTransactionRunner,
    },
  ],
  exports: [TransactionRunner],
})
export class TransactionModule {}
