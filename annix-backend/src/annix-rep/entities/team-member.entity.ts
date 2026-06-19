import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";

export enum TeamRole {
  ADMIN = "admin",
  MANAGER = "manager",
  REP = "rep",
}

export enum TeamMemberStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export class TeamMember {
  id: number;

  organization: Organization;

  organizationId: number;

  user: User;

  userId: number;

  role: TeamRole;

  status: TeamMemberStatus;

  reportsTo: User | null;

  reportsToId: number | null;

  joinedAt: Date;

  createdAt: Date;

  updatedAt: Date;
}
