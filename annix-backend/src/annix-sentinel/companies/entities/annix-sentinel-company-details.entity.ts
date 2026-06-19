import { Company } from "../../../platform/entities/company.entity";

export class AnnixSentinelCompanyDetails {
  id: number;

  company: Company;

  companyId: number;

  entityType: string;

  employeeCount: number;

  employeeCountRange: string | null;

  annualTurnover: number | null;

  financialYearEndMonth: number | null;

  municipality: string | null;

  sectorCode: string | null;

  complianceAreas: Record<string, unknown> | null;

  profileComplete: boolean;

  subscriptionTier: string;

  subscriptionStatus: string;

  importsExports: boolean;

  handlesPersonalData: boolean;

  hasPayroll: boolean;

  vatRegistered: boolean;

  vatSubmissionCycle: string | null;

  registrationDate: string | null;

  businessAddress: string | null;

  idNumber: string | null;

  passportNumber: string | null;

  passportCountry: string | null;

  sarsTaxReference: string | null;

  dateOfBirth: string | null;

  trustRegistrationNumber: string | null;

  mastersOffice: string | null;

  trusteeCount: number | null;

  createdAt: Date;

  updatedAt: Date;
}
