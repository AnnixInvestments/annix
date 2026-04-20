import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SageConnection } from "./entities/sage-connection.entity";
import { SageAdapterRegistry } from "./sage-adapter-registry.service";
import { SageApiService } from "./sage-api.service";
import { SageConnectionService } from "./sage-connection.service";
import { SageExportController } from "./sage-export.controller";
import { SageExportService } from "./sage-export.service";

@Module({
  imports: [TypeOrmModule.forFeature([SageConnection])],
  controllers: [SageExportController],
  providers: [SageExportService, SageApiService, SageConnectionService, SageAdapterRegistry],
  exports: [SageExportService, SageApiService, SageConnectionService, SageAdapterRegistry],
})
export class SageExportModule {}
