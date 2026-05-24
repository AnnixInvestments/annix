import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixSentinelGovernmentDocument } from "./entities/government-document.entity";
import { AnnixSentinelGovernmentDocumentsController } from "./government-documents.controller";
import { AnnixSentinelGovernmentDocumentsService } from "./government-documents.service";

@Module({
  imports: [TypeOrmModule.forFeature([AnnixSentinelGovernmentDocument])],
  controllers: [AnnixSentinelGovernmentDocumentsController],
  providers: [AnnixSentinelGovernmentDocumentsService],
  exports: [AnnixSentinelGovernmentDocumentsService],
})
export class AnnixSentinelGovernmentDocumentsModule {}
