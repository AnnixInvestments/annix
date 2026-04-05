export interface NotificationRecipient {
  userId?: number | null;
  email?: string | null;
  phone?: string | null;
  pushSubscriptions?: PushSubscriptionData[] | null;
  displayName?: string | null;
  locale?: string | null;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationContent {
  subject: string;
  body: string;
  html?: string | null;
  actionUrl?: string | null;
  icon?: string | null;
  badge?: string | null;
  tag?: string | null;
  data?: Record<string, unknown> | null;
}

export interface DispatchResult {
  channel: string;
  success: boolean;
  recipientRef: string;
  error?: string | null;
  providerMessageId?: string | null;
}

export interface NotificationChannel {
  channelName(): string;
  isEnabled(): boolean;
  send(recipient: NotificationRecipient, content: NotificationContent): Promise<DispatchResult>;
}
