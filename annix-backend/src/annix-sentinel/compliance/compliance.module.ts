import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../../lib/persistence/database-driver";
import { repositoryProvider } from "../../lib/persistence/repository-provider";
import { AnnixSentinelCompaniesModule } from "../companies/companies.module";
import { AnnixSentinelDocumentsModule } from "../sentinel-documents/documents.module";
import { AnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository";
import { MongoAnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository.mongo";
import { PostgresAnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository.postgres";
import { AnnixSentinelComplianceController } from "./compliance.controller";
import { AnnixSentinelComplianceService } from "./compliance.service";
import { AnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository";
import { MongoAnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository.mongo";
import { PostgresAnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository.postgres";
import { AnnixSentinelComplianceStatusRepository } from "./compliance-status.repository";
import { MongoAnnixSentinelComplianceStatusRepository } from "./compliance-status.repository.mongo";
import { PostgresAnnixSentinelComplianceStatusRepository } from "./compliance-status.repository.postgres";
import { AnnixSentinelChecklistProgress } from "./entities/checklist-progress.entity";
import { AnnixSentinelComplianceRequirement } from "./entities/compliance-requirement.entity";
import { AnnixSentinelComplianceStatus } from "./entities/compliance-status.entity";
import { AnnixSentinelChecklistProgressSchema } from "./schemas/checklist-progress.schema";
import { AnnixSentinelComplianceRequirementSchema } from "./schemas/compliance-requirement.schema";
import { AnnixSentinelComplianceStatusSchema } from "./schemas/compliance-status.schema";
import { AnnixSentinelDeadlineService } from "./services/deadline.service";
import { AnnixSentinelRuleEngineService } from "./services/rule-engine.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
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
        ]
      : [
          TypeOrmModule.forFeature([
            AnnixSentinelComplianceRequirement,
            AnnixSentinelComplianceStatus,
            AnnixSentinelChecklistProgress,
          ]),
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
      PostgresAnnixSentinelComplianceRequirementRepository,
      MongoAnnixSentinelComplianceRequirementRepository,
    ),
    repositoryProvider(
      AnnixSentinelComplianceStatusRepository,
      PostgresAnnixSentinelComplianceStatusRepository,
      MongoAnnixSentinelComplianceStatusRepository,
    ),
    repositoryProvider(
      AnnixSentinelChecklistProgressRepository,
      PostgresAnnixSentinelChecklistProgressRepository,
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
