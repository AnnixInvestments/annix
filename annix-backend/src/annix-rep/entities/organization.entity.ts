import { User } from "../../user/entities/user.entity";

export enum OrganizationPlan {
  FREE = "free",
  TEAM = "team",
  ENTERPRISE = "enterprise",
}

export class Organization {
  id: number;

  name: string;

  slug: string;

  owner: User;

  ownerId: number;

  plan: OrganizationPlan;

  maxMembers: number;

  industry: string | null;

  logoUrl: string | null;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
