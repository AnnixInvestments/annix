import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixSentinelAiModule } from "../ai/ai.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentsController } from "./documents.controller";
import { AnnixSentinelDocumentsService } from "./documents.service";
import { AnnixSentinelDocument } from "./entities/document.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([AnnixSentinelDocument]),
    AnnixSentinelAiModule,
    AnnixSentinelComplianceModule,
  ],
  controllers: [AnnixSentinelDocumentsController],
  providers: [AnnixSentinelDocumentsService],
  exports: [AnnixSentinelDocumentsService],
})
export class AnnixSentinelDocumentsModule {}
