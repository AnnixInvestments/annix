import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelAiModule } from "../ai/ai.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentRepository } from "./document.repository";
import { MongoAnnixSentinelDocumentRepository } from "./document.repository.mongo";
import { PostgresAnnixSentinelDocumentRepository } from "./document.repository.postgres";
import { AnnixSentinelDocumentsController } from "./documents.controller";
import { AnnixSentinelDocumentsService } from "./documents.service";
import { AnnixSentinelDocument } from "./entities/document.entity";
import { AnnixSentinelDocumentSchema } from "./schemas/document.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "AnnixSentinelDocument", schema: AnnixSentinelDocumentSchema },
          ]),
        ]
      : [TypeOrmModule.forFeature([AnnixSentinelDocument])]),
    forwardRef(() => AnnixSentinelAiModule),
    forwardRef(() => AnnixSentinelComplianceModule),
  ],
  controllers: [AnnixSentinelDocumentsController],
  providers: [
    AnnixSentinelDocumentsService,
    repositoryProvider(
      AnnixSentinelDocumentRepository,
      PostgresAnnixSentinelDocumentRepository,
      MongoAnnixSentinelDocumentRepository,
    ),
  ],
  exports: [AnnixSentinelDocumentsService, AnnixSentinelDocumentRepository],
})
export class AnnixSentinelDocumentsModule {}
