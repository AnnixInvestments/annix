import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NixModule } from "../../nix/nix.module";
import { Company } from "../../platform/entities/company.entity";
import { StorageModule } from "../../storage/storage.module";
import { AnnixSentinelCompanyDetails } from "../companies/entities/annix-sentinel-company-details.entity";
import { AnnixSentinelComplianceRequirement } from "../compliance/entities/compliance-requirement.entity";
import { AnnixSentinelComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { AnnixSentinelAiController } from "./ai.controller";
import { AnnixSentinelAiService } from "./ai.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      AnnixSentinelCompanyDetails,
      AnnixSentinelComplianceStatus,
      AnnixSentinelComplianceRequirement,
    ]),
    NixModule,
    StorageModule,
  ],
  controllers: [AnnixSentinelAiController],
  providers: [AnnixSentinelAiService],
  exports: [AnnixSentinelAiService],
})
export class AnnixSentinelAiModule {}
