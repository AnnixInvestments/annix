export class PendingSeekerTier {
  id: string;

  emailNormalized: string;

  tier: string;

  permanent: boolean;

  trialDays: number | null;

  trialGrantedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
