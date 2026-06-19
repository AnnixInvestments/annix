export class AnnixSentinelNotificationPreferences {
  id!: number;

  userId!: number;

  emailEnabled!: boolean;

  smsEnabled!: boolean;

  whatsappEnabled!: boolean;

  inAppEnabled!: boolean;

  weeklyDigest!: boolean;

  phone!: string | null;
}
