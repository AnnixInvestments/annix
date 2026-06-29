export enum AffiliateStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export class Affiliate {
  id: number;

  companyId: number;

  name: string;

  contactName: string;

  email: string;

  phone: string;

  commissionPercent: number;

  status: AffiliateStatus;

  notes: string;

  createdAt: Date;

  updatedAt: Date;
}
