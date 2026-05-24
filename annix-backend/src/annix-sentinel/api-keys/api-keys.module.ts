import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelApiKeysController } from "./api-keys.controller";
import { AnnixSentinelApiKeysService } from "./api-keys.service";
import { AnnixSentinelEnterpriseApiController } from "./enterprise-api.controller";
import { AnnixSentinelApiKey } from "./entities/api-key.entity";
import { AnnixSentinelApiKeyGuard } from "./guards/api-key.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([AnnixSentinelApiKey]),
    AnnixSentinelComplianceModule,
    AnnixSentinelDocumentsModule,
  ],
  controllers: [AnnixSentinelApiKeysController, AnnixSentinelEnterpriseApiController],
  providers: [AnnixSentinelApiKeysService, AnnixSentinelApiKeyGuard],
  exports: [AnnixSentinelApiKeysService, AnnixSentinelApiKeyGuard],
})
export class AnnixSentinelApiKeysModule {}
