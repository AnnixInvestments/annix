import { AnnixOrbitCompany } from "./annix-orbit-company.entity";

export class CvPushSubscription {
  id: number;

  userId: number;

  company: AnnixOrbitCompany | null;

  companyId: number | null;

  endpoint: string;

  keyP256dh: string;

  keyAuth: string;

  createdAt: Date;
}
