import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository";
import { MongoAnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository.mongo";
import { AnnixSentinelComplianceController } from "./compliance.controller";
import { AnnixSentinelComplianceService } from "./compliance.service";
import { AnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository";
import { MongoAnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository.mongo";
import { AnnixSentinelComplianceStatusRepository } from "./compliance-status.repository";
import { MongoAnnixSentinelComplianceStatusRepository } from "./compliance-status.repository.mongo";
import { AnnixSentinelChecklistProgressSchema } from "./schemas/checklist-progress.schema";
import { AnnixSentinelComplianceRequirementSchema } from "./schemas/compliance-requirement.schema";
import { AnnixSentinelComplianceStatusSchema } from "./schemas/compliance-status.schema";
import { AnnixSentinelDeadlineService } from "./services/deadline.service";
import { AnnixSentinelRuleEngineService } from "./services/rule-engine.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: "AnnixSentinelComplianceRequirement",
        schema: AnnixSentinelComplianceRequirementSchema,
      },
      {
        name: "AnnixSentinelComplianceStatus",
        schema: AnnixSentinelComplianceStatusSchema,
      },
      {
        name: "AnnixSentinelChecklistProgress",
        schema: AnnixSentinelChecklistProgressSchema,
      },
    ]),
    AnnixSentinelCompaniesModule,
    forwardRef(() => AnnixSentinelDocumentsModule),
  ],
  controllers: [AnnixSentinelComplianceController],
  providers: [
    AnnixSentinelComplianceService,
    AnnixSentinelRuleEngineService,
    AnnixSentinelDeadlineService,
    repositoryProvider(
      AnnixSentinelComplianceRequirementRepository,
      MongoAnnixSentinelComplianceRequirementRepository,
    ),
    repositoryProvider(
      AnnixSentinelComplianceStatusRepository,
      MongoAnnixSentinelComplianceStatusRepository,
    ),
    repositoryProvider(
      AnnixSentinelChecklistProgressRepository,
      MongoAnnixSentinelChecklistProgressRepository,
    ),
  ],
  exports: [
    AnnixSentinelComplianceService,
    AnnixSentinelComplianceRequirementRepository,
    AnnixSentinelComplianceStatusRepository,
    AnnixSentinelChecklistProgressRepository,
  ],
})
export class AnnixSentinelComplianceModule {}
