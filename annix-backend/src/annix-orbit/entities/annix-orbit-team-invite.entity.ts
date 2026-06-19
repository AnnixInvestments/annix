import type { AnnixOrbitRecruiterRole } from "./annix-orbit-profile.entity";

export const ORBIT_TEAM_INVITE_STATUSES = ["pending", "accepted", "cancelled"] as const;
export type AnnixOrbitTeamInviteStatus = (typeof ORBIT_TEAM_INVITE_STATUSES)[number];

export class AnnixOrbitTeamInvite {
  id: number;

  companyId: number;

  email: string;

  recruiterRole: AnnixOrbitRecruiterRole;

  token: string;

  invitedByUserId: number;

  status: AnnixOrbitTeamInviteStatus;

  expiresAt: string | null;

  createdAt: Date;

  updatedAt: Date;
}
