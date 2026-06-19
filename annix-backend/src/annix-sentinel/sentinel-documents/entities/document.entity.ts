import { Company } from "../../../platform/entities/company.entity";
import { AnnixSentinelComplianceRequirement } from "../../compliance/entities/compliance-requirement.entity";

export class AnnixSentinelDocument {
  id!: number;

  companyId!: number;

  requirementId!: number | null;

  name!: string;

  filePath!: string;

  mimeType!: string | null;

  sizeBytes!: number | null;

  uploadedByUserId!: number | null;

  expiryDate!: Date | null;

  createdAt!: Date;

  company!: Company;

  requirement!: AnnixSentinelComplianceRequirement | null;
}
