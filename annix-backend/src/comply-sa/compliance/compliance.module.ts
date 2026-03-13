import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComplySaCompaniesModule } from "../companies/companies.module";
import { ComplySaDocument } from "../comply-documents/entities/document.entity";
import { ComplySaComplianceController } from "./compliance.controller";
import { ComplySaComplianceService } from "./compliance.service";
import { ComplySaAuditLog } from "./entities/audit-log.entity";
import { ComplySaChecklistProgress } from "./entities/checklist-progress.entity";
import { ComplySaComplianceRequirement } from "./entities/compliance-requirement.entity";
import { ComplySaComplianceStatus } from "./entities/compliance-status.entity";
import { ComplySaDeadlineService } from "./services/deadline.service";
import { ComplySaRuleEngineService } from "./services/rule-engine.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplySaComplianceRequirement,
      ComplySaComplianceStatus,
      ComplySaChecklistProgress,
      ComplySaAuditLog,
      ComplySaDocument,
    ]),
    ComplySaCompaniesModule,
  ],
  controllers: [ComplySaComplianceController],
  providers: [ComplySaComplianceService, ComplySaRuleEngineService, ComplySaDeadlineService],
  exports: [ComplySaComplianceService],
})
export class ComplySaComplianceModule {}
