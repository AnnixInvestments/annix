import { User } from "../../user/entities/user.entity";
import { Organization } from "./organization.entity";
import { TeamRole } from "./team-member.entity";
import { Territory } from "./territory.entity";

export enum TeamInvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  DECLINED = "declined",
}

export class TeamInvitation {
  id: number;

  organization: Organization;

  organizationId: number;

  invitedBy: User;

  invitedById: number;

  email: string;

  inviteeName: string | null;

  token: string;

  role: TeamRole;

  territory: Territory | null;

  territoryId: number | null;

  status: TeamInvitationStatus;

  message: string | null;

  expiresAt: Date;

  acceptedAt: Date | null;

  createdAt: Date;
}
