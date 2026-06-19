import { AnnixOrbitCompany } from "./annix-orbit-company.entity";
import { AnnixOrbitUser } from "./annix-orbit-user.entity";

export class CvPushSubscription {
  id: number;

  user: AnnixOrbitUser;

  userId: number;

  company: AnnixOrbitCompany | null;

  companyId: number | null;

  endpoint: string;

  keyP256dh: string;

  keyAuth: string;

  createdAt: Date;
}
