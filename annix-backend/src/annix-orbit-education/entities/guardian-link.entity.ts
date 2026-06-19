/**
 * Links a minor's education profile to a guardian (D3: the student invites a
 * guardian by email; the guardian confirms consent before any processing).
 * `guardianUserId` is populated once the guardian accepts and has an account.
 */
export class GuardianLink {
  id: string;

  educationProfileId: string;

  guardianUserId: number | null;

  guardianEmail: string;

  status: string;

  invitedAt: Date;

  acceptedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
