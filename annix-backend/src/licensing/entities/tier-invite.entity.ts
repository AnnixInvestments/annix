export type TierInviteStatus = "pending" | "accepted" | "expired";

export class TierInvite {
  id: number;

  moduleKey: string;

  email: string;

  tierKey: string;

  freeDays: number;

  token: string;

  status: TierInviteStatus;

  invitedById: number | null;

  acceptedAt: Date | null;

  expiresAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
