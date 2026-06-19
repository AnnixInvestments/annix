export class SeekerEmploymentRecord {
  id: number;

  candidateId: number;

  applyClickId: number | null;

  externalJobId: number | null;

  employerName: string;

  companyWebsiteUrl: string | null;

  roleTitle: string;

  roleOutline: string | null;

  startDate: Date | null;

  endDate: Date | null;

  status: string;

  researchStatus: string;

  researchedAt: Date | null;

  appliedToCvAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
