import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaComplianceModule } from "../compliance/compliance.module";
import { ComplySaDocumentsModule } from "../comply-documents/documents.module";
import { ComplySaApiKeysController } from "./api-keys.controller";
import { ComplySaApiKeysService } from "./api-keys.service";
import { ComplySaApiKey } from "./entities/api-key.entity";
import { ComplySaEnterpriseApiController } from "./enterprise-api.controller";
import { ComplySaApiKeyGuard } from "./guards/api-key.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplySaApiKey]),
    ComplySaComplianceModule,
    ComplySaDocumentsModule,
  ],
  controllers: [ComplySaApiKeysController, ComplySaEnterpriseApiController],
  providers: [ComplySaApiKeysService, ComplySaApiKeyGuard],
  exports: [ComplySaApiKeysService, ComplySaApiKeyGuard],
})
export class ComplySaApiKeysModule {}
