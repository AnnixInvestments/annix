import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelAiModule } from "../ai/ai.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentRepository } from "./document.repository";
import { MongoAnnixSentinelDocumentRepository } from "./document.repository.mongo";
import { AnnixSentinelDocumentsController } from "./documents.controller";
import { AnnixSentinelDocumentsService } from "./documents.service";
import { AnnixSentinelDocumentSchema } from "./schemas/document.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "AnnixSentinelDocument", schema: AnnixSentinelDocumentSchema },
    ]),
    forwardRef(() => AnnixSentinelAiModule),
    forwardRef(() => AnnixSentinelComplianceModule),
  ],
  controllers: [AnnixSentinelDocumentsController],
  providers: [
    AnnixSentinelDocumentsService,
    repositoryProvider(AnnixSentinelDocumentRepository, MongoAnnixSentinelDocumentRepository),
  ],
  exports: [AnnixSentinelDocumentsService, AnnixSentinelDocumentRepository],
})
export class AnnixSentinelDocumentsModule {}
