import { Company } from "../../../platform/entities/company.entity";
import { User } from "../../../user/entities/user.entity";
import { AnnixSentinelComplianceRequirement } from "../../compliance/entities/compliance-requirement.entity";

export class AnnixSentinelNotification {
  id!: number;

  companyId!: number;

  userId!: number | null;

  requirementId!: number | null;

  channel!: string;

  type!: string;

  message!: string;

  sentAt!: Date;

  readAt!: Date | null;

  company!: Company;

  user!: User | null;

  requirement!: AnnixSentinelComplianceRequirement | null;
}
