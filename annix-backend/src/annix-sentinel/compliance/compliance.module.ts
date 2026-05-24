import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelCompanyDetails } from "../companies/entities/annix-sentinel-company-details.entity";
import { AnnixSentinelDocument } from "../sentinel-documents/entities/document.entity";
import { AnnixSentinelComplianceController } from "./compliance.controller";
import { AnnixSentinelComplianceService } from "./compliance.service";
import { AnnixSentinelChecklistProgress } from "./entities/checklist-progress.entity";
import { AnnixSentinelComplianceRequirement } from "./entities/compliance-requirement.entity";
import { AnnixSentinelComplianceStatus } from "./entities/compliance-status.entity";
import { AnnixSentinelDeadlineService } from "./services/deadline.service";
import { AnnixSentinelRuleEngineService } from "./services/rule-engine.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnnixSentinelComplianceRequirement,
      AnnixSentinelComplianceStatus,
      AnnixSentinelChecklistProgress,
      Company,
      AnnixSentinelCompanyDetails,
      AnnixSentinelDocument,
    ]),
    AnnixSentinelCompaniesModule,
  ],
  controllers: [AnnixSentinelComplianceController],
  providers: [
    AnnixSentinelComplianceService,
    AnnixSentinelRuleEngineService,
    AnnixSentinelDeadlineService,
  ],
  exports: [AnnixSentinelComplianceService],
})
export class AnnixSentinelComplianceModule {}
