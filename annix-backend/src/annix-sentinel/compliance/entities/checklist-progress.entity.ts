import { Company } from "../../../platform/entities/company.entity";
import { AnnixSentinelComplianceRequirement } from "./compliance-requirement.entity";

export class AnnixSentinelChecklistProgress {
  id!: number;

  companyId!: number;

  requirementId!: number;

  stepIndex!: number;

  stepLabel!: string;

  completed!: boolean;

  completedAt!: Date | null;

  completedByUserId!: number | null;

  notes!: string | null;

  company!: Company;

  requirement!: AnnixSentinelComplianceRequirement;
}
