import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SageConnection } from "./entities/sage-connection.entity";
import { SageApiService } from "./sage-api.service";
import { SageConnectionService } from "./sage-connection.service";
import { SageExportService } from "./sage-export.service";

@Module({
  imports: [TypeOrmModule.forFeature([SageConnection])],
  providers: [SageExportService, SageApiService, SageConnectionService],
  exports: [SageExportService, SageApiService, SageConnectionService],
})
export class SageExportModule {}
