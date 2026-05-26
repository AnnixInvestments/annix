import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AiUsageLogRepository } from "./ai-usage.repository";
import { MongoAiUsageLogRepository } from "./ai-usage.repository.mongo";
import { PostgresAiUsageLogRepository } from "./ai-usage.repository.postgres";
import { AiUsageService } from "./ai-usage.service";
import { AiUsageLog } from "./entities/ai-usage-log.entity";
import { AiUsageLogSchema } from "./schemas/ai-usage-log.schema";

@Global()
@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "AiUsageLog", schema: AiUsageLogSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([AiUsageLog])]),
  ],
  providers: [
    AiUsageService,
    repositoryProvider(
      AiUsageLogRepository,
      PostgresAiUsageLogRepository,
      MongoAiUsageLogRepository,
    ),
  ],
  exports: [AiUsageService],
})
export class AiUsageModule {}
