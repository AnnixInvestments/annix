export class OrbitEarlyAccessSignup {
  id: string;

  firstName: string;

  lastName: string;

  email: string;

  emailNormalized: string;

  mobileNumber: string;

  mobileNormalized: string;

  currentRole: string | null;

  industry: string | null;

  yearsExperience: string | null;

  ageRange: string | null;

  ethnicBackground: string | null;

  consentToContact: boolean;

  consentedAt: Date | null;

  source: string;

  campaign: string | null;

  platform: string | null;

  device: string | null;

  referralCode: string;

  referredBy: string | null;

  referralCount: number;

  welcomeSentAt: Date | null;

  day3SentAt: Date | null;

  day7SentAt: Date | null;

  launchSentAt: Date | null;

  adminEmailSentAt: Date | null;

  // Environment the admin invite directed this applicant to ("prod" | "test").
  // Applicants always live on prod; this drives which env monitors/registers
  // them. Null until an admin sends an invite with an env selected.
  invitedEnv: string | null;

  createdAt: Date;

  updatedAt: Date;
}
