import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelGovernmentDocumentRepository } from "./government-document.repository";
import { MongoAnnixSentinelGovernmentDocumentRepository } from "./government-document.repository.mongo";
import { AnnixSentinelGovernmentDocumentsController } from "./government-documents.controller";
import { AnnixSentinelGovernmentDocumentsService } from "./government-documents.service";
import { AnnixSentinelGovernmentDocumentSchema } from "./schemas/government-document.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "AnnixSentinelGovernmentDocument",
        schema: AnnixSentinelGovernmentDocumentSchema,
      },
    ]),
  ],
  controllers: [AnnixSentinelGovernmentDocumentsController],
  providers: [
    AnnixSentinelGovernmentDocumentsService,
    repositoryProvider(
      AnnixSentinelGovernmentDocumentRepository,
      MongoAnnixSentinelGovernmentDocumentRepository,
    ),
  ],
  exports: [AnnixSentinelGovernmentDocumentsService],
})
export class AnnixSentinelGovernmentDocumentsModule {}
