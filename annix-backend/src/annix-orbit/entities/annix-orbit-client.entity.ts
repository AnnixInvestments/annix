export const ORBIT_CLIENT_STATUSES = ["prospect", "active", "on_hold", "inactive"] as const;
export type AnnixOrbitClientStatus = (typeof ORBIT_CLIENT_STATUSES)[number];

export class AnnixOrbitClient {
  id: number;

  companyId: number;

  name: string;

  industry: string | null;

  province: string | null;

  city: string | null;

  contactName: string | null;

  contactEmail: string | null;

  contactPhone: string | null;

  feePercentage: number | null;

  paymentTerms: string | null;

  status: AnnixOrbitClientStatus;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
