import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { Company } from "../../platform/entities/company.entity";
import { StorageModule } from "../../storage/storage.module";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelComplianceModule } from "../compliance/compliance.module";
import { AnnixSentinelAiController } from "./ai.controller";
import { AnnixSentinelAiService } from "./ai.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    AnnixSentinelCompaniesModule,
    AnnixSentinelComplianceModule,
    NixModule,
    StorageModule,
  ],
  controllers: [AnnixSentinelAiController],
  providers: [AnnixSentinelAiService],
  exports: [AnnixSentinelAiService],
})
export class AnnixSentinelAiModule {}
