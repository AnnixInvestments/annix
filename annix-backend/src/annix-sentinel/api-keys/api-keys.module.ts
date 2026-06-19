import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelApiKeyRepository } from "./api-key.repository";
import { MongoAnnixSentinelApiKeyRepository } from "./api-key.repository.mongo";
import { AnnixSentinelApiKeysController } from "./api-keys.controller";
import { AnnixSentinelApiKeysService } from "./api-keys.service";
import { AnnixSentinelEnterpriseApiController } from "./enterprise-api.controller";
import { AnnixSentinelApiKeyGuard } from "./guards/api-key.guard";
import { AnnixSentinelApiKeySchema } from "./schemas/api-key.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "AnnixSentinelApiKey", schema: AnnixSentinelApiKeySchema }]),
    AnnixSentinelComplianceModule,
    AnnixSentinelDocumentsModule,
  ],
  controllers: [AnnixSentinelApiKeysController, AnnixSentinelEnterpriseApiController],
  providers: [
    AnnixSentinelApiKeysService,
    AnnixSentinelApiKeyGuard,
    repositoryProvider(AnnixSentinelApiKeyRepository, MongoAnnixSentinelApiKeyRepository),
  ],
  exports: [AnnixSentinelApiKeysService, AnnixSentinelApiKeyGuard, AnnixSentinelApiKeyRepository],
})
export class AnnixSentinelApiKeysModule {}
