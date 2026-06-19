import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SageAdapterRegistry } from "./sage-adapter-registry.service";
import { SageApiService } from "./sage-api.service";
import { SageConnectionRepository } from "./sage-connection.repository";
import { MongoSageConnectionRepository } from "./sage-connection.repository.mongo";
import { SageConnectionService } from "./sage-connection.service";
import { SageExportController } from "./sage-export.controller";
import { SageExportService } from "./sage-export.service";
import { SageConnectionSchema } from "./schemas/sage-connection.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "SageConnection", schema: SageConnectionSchema }])],
  controllers: [SageExportController],
  providers: [
    SageExportService,
    SageApiService,
    SageConnectionService,
    SageAdapterRegistry,
    repositoryProvider(SageConnectionRepository, MongoSageConnectionRepository),
  ],
  exports: [SageExportService, SageApiService, SageConnectionService, SageAdapterRegistry],
})
export class SageExportModule {}
