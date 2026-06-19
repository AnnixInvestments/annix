import { AnnixOrbitCompany } from "./annix-orbit-company.entity";

export enum CvEmailTemplateKind {
  REJECTION = "rejection",
  SHORTLIST = "shortlist",
  ACCEPTANCE = "acceptance",
  REFERENCE_REQUEST = "reference_request",
  ACKNOWLEDGEMENT = "acknowledgement",
  INTERVIEW_INVITE = "interview_invite",
  EE_DISCLOSURE_INVITE = "ee_disclosure_invite",
}

export class AnnixOrbitEmailTemplate {
  id: number;

  company: AnnixOrbitCompany;

  companyId: number;

  kind: CvEmailTemplateKind;

  subject: string;

  bodyHtml: string;

  bodyText: string;

  createdAt: Date;

  updatedAt: Date;
}
