export enum SalesRepStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export class SalesRep {
  id: number;

  companyId: number;

  name: string;

  email: string;

  phone: string;

  commissionPercent: number;

  status: SalesRepStatus;

  notes: string;

  createdAt: Date;

  updatedAt: Date;
}
