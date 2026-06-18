import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelGovernmentDocument } from "./entities/government-document.entity";
import { AnnixSentinelGovernmentDocumentRepository } from "./government-document.repository";
import { MongoAnnixSentinelGovernmentDocumentRepository } from "./government-document.repository.mongo";
import { PostgresAnnixSentinelGovernmentDocumentRepository } from "./government-document.repository.postgres";
import { AnnixSentinelGovernmentDocumentsController } from "./government-documents.controller";
import { AnnixSentinelGovernmentDocumentsService } from "./government-documents.service";
import { AnnixSentinelGovernmentDocumentSchema } from "./schemas/government-document.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            {
              name: "AnnixSentinelGovernmentDocument",
              schema: AnnixSentinelGovernmentDocumentSchema,
            },
          ]),
        ]
      : [TypeOrmModule.forFeature([AnnixSentinelGovernmentDocument])]),
  ],
  controllers: [AnnixSentinelGovernmentDocumentsController],
  providers: [
    AnnixSentinelGovernmentDocumentsService,
    repositoryProvider(
      AnnixSentinelGovernmentDocumentRepository,
      PostgresAnnixSentinelGovernmentDocumentRepository,
      MongoAnnixSentinelGovernmentDocumentRepository,
    ),
  ],
  exports: [AnnixSentinelGovernmentDocumentsService],
})
export class AnnixSentinelGovernmentDocumentsModule {}
