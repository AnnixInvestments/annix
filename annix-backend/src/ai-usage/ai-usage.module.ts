import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiUsageService } from "./ai-usage.service";
import { AiUsageLog } from "./entities/ai-usage-log.entity";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AiUsageLog])],
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
