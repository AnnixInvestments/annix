import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { AiQuotaService } from "./ai-quota.service";
import { AiUsageLogRepository } from "./ai-usage.repository";
import { MongoAiUsageLogRepository } from "./ai-usage.repository.mongo";
import { AiUsageService } from "./ai-usage.service";
import { AiUsageLogSchema } from "./schemas/ai-usage-log.schema";

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: "AiUsageLog", schema: AiUsageLogSchema }])],
  providers: [
    AiUsageService,
    AiQuotaService,
    repositoryProvider(AiUsageLogRepository, MongoAiUsageLogRepository),
  ],
  exports: [AiUsageService, AiQuotaService],
})
export class AiUsageModule {}
