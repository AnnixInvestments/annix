export interface OutreachScheduleRecipient {
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  ageRange: string | null;
  device: string | null;
}

export class OrbitOutreachSchedule {
  id: string;

  subject: string;

  body: string;

  environment: string;

  recipients: OutreachScheduleRecipient[];

  includeDeviceGuide: boolean;

  includeFbwGuide: boolean;

  extraAssetIds: string[];

  trackEarlyAccess: boolean;

  provisionTier: string | null;

  scheduledAt: Date;

  status: string;

  sentCount: number;

  failedCount: number;

  failures: string[];

  sentAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
