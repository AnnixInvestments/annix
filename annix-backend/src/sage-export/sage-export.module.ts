import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { SageConnection } from "./entities/sage-connection.entity";
import { SageAdapterRegistry } from "./sage-adapter-registry.service";
import { SageApiService } from "./sage-api.service";
import { SageConnectionRepository } from "./sage-connection.repository";
import { MongoSageConnectionRepository } from "./sage-connection.repository.mongo";
import { PostgresSageConnectionRepository } from "./sage-connection.repository.postgres";
import { SageConnectionService } from "./sage-connection.service";
import { SageExportController } from "./sage-export.controller";
import { SageExportService } from "./sage-export.service";
import { SageConnectionSchema } from "./schemas/sage-connection.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [MongooseModule.forFeature([{ name: "SageConnection", schema: SageConnectionSchema }])]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([SageConnection])]),
  ],
  controllers: [SageExportController],
  providers: [
    SageExportService,
    SageApiService,
    SageConnectionService,
    SageAdapterRegistry,
    repositoryProvider(
      SageConnectionRepository,
      PostgresSageConnectionRepository,
      MongoSageConnectionRepository,
    ),
  ],
  exports: [SageExportService, SageApiService, SageConnectionService, SageAdapterRegistry],
})
export class SageExportModule {}
