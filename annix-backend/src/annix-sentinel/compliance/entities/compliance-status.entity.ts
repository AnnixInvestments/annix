import { Company } from "../../../platform/entities/company.entity";
import { AnnixSentinelComplianceRequirement } from "./compliance-requirement.entity";

export class AnnixSentinelComplianceStatus {
  id!: number;

  companyId!: number;

  requirementId!: number;

  status!: string;

  lastCompletedDate!: Date | null;

  nextDueDate!: Date | null;

  notes!: string | null;

  completedByUserId!: number | null;

  updatedAt!: Date;

  company!: Company;

  requirement!: AnnixSentinelComplianceRequirement;
}
