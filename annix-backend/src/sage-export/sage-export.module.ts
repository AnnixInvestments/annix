import { Module } from "@nestjs/common";
import { SageExportService } from "./sage-export.service";

@Module({
  providers: [SageExportService],
  exports: [SageExportService],
})
export class SageExportModule {}
