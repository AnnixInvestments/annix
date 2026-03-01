"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

export enum ConversationType {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
  SUPPORT = "SUPPORT",
}

export enum RelatedEntityType {
  RFQ = "RFQ",
  BOQ = "BOQ",
  GENERAL = "GENERAL",
  FEEDBACK = "FEEDBACK",
}

export enum BroadcastTarget {
  ALL = "ALL",
  CUSTOMERS = "CUSTOMERS",
  SUPPLIERS = "SUPPLIERS",
  SPECIFIC = "SPECIFIC",
}

export enum BroadcastPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum ResponseRating {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  ACCEPTABLE = "ACCEPTABLE",
  POOR = "POOR",
  CRITICAL = "CRITICAL",
}

export interface ConversationSummary {
  id: number;
  subject: string;
  conversationType: ConversationType;
  relatedEntityType: RelatedEntityType;
  relatedEntityId: number | null;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  participantNames: string[];
  isArchived: boolean;
  createdAt: string;
}

export interface Participant {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastReadAt: string | null;
}

export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
}

export interface Message {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  messageType: string;
  parentMessageId: number | null;
  sentAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  attachments: Attachment[];
  readByUserIds: number[];
}

export interface ConversationDetail extends ConversationSummary {
  participants: Participant[];
  messages: Message[];
}

export interface BroadcastSummary {
  id: number;
  title: string;
  contentPreview: string;
  targetAudience: BroadcastTarget;
  priority: BroadcastPriority;
  expiresAt: string | null;
  isRead: boolean;
  createdAt: string;
  sentByName: string;
}

export interface BroadcastDetail extends BroadcastSummary {
  content: string;
  totalRecipients: number;
  readCount: number;
  emailSentCount: number;
}

export interface RatingBreakdown {
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
  critical: number;
}

export interface UserResponseStats {
  userId: number;
  userName: string;
  totalResponses: number;
  averageResponseTimeMinutes: number;
  slaCompliancePercent: number;
  ratingBreakdown: RatingBreakdown;
  overallRating: ResponseRating;
}

export interface ResponseMetricsSummary {
  totalMessagesRequiringResponse: number;
  totalResponses: number;
  averageResponseTimeMinutes: number;
  slaCompliancePercent: number;
  ratingBreakdown: RatingBreakdown;
  topPerformers: UserResponseStats[];
  usersNeedingAttention: UserResponseStats[];
}

export interface SlaConfig {
  id: number;
  responseTimeHours: number;
  excellentThresholdHours: number;
  goodThresholdHours: number;
  acceptableThresholdHours: number;
  poorThresholdHours: number;
  updatedAt: string;
}

export interface CreateConversationDto {
  subject: string;
  conversationType?: ConversationType;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: number;
  participantIds: number[];
  initialMessage?: string;
}

export interface SendMessageDto {
  content: string;
  parentMessageId?: number;
}

export interface CreateBroadcastDto {
  title: string;
  content: string;
  targetAudience?: BroadcastTarget;
  specificUserIds?: number[];
  priority?: BroadcastPriority;
  expiresAt?: string;
  sendEmail?: boolean;
}

export interface ConversationFilters {
  isArchived?: boolean;
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: number;
  page?: number;
  limit?: number;
}

export interface BroadcastFilters {
  includeExpired?: boolean;
  priority?: BroadcastPriority;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface MetricsFilters {
  startDate?: string;
  endDate?: string;
  userId?: number;
}

type PortalType = "customer" | "supplier" | "admin";

function getAuthHeaders(portalType: PortalType): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window === "undefined") {
    return headers;
  }

  const tokenKey =
    portalType === "admin"
      ? "adminAccessToken"
      : portalType === "supplier"
        ? "supplierAccessToken"
        : "customerAccessToken";

  const token = localStorage.getItem(tokenKey);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (portalType === "customer") {
    const fingerprint = localStorage.getItem("deviceFingerprint");
    if (fingerprint) {
      headers["x-device-fingerprint"] = fingerprint;
    }
  }

  return headers;
}

async function request<T>(
  portalType: PortalType,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}/${portalType}/messaging${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(portalType),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function createMessagingApi(portalType: PortalType) {
  return {
    async conversations(
      filters: ConversationFilters = {},
    ): Promise<{ conversations: ConversationSummary[]; total: number }> {
      return request(portalType, `/conversations${buildQueryString(filters)}`);
    },

    async createConversation(dto: CreateConversationDto): Promise<ConversationDetail> {
      return request(portalType, "/conversations", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    async conversation(conversationId: number): Promise<ConversationDetail> {
      return request(portalType, `/conversations/${conversationId}`);
    },

    async messages(
      conversationId: number,
      pagination: { page?: number; limit?: number; beforeId?: number } = {},
    ): Promise<{ messages: Message[]; hasMore: boolean }> {
      return request(
        portalType,
        `/conversations/${conversationId}/messages${buildQueryString(pagination)}`,
      );
    },

    async sendMessage(conversationId: number, dto: SendMessageDto): Promise<Message> {
      return request(portalType, `/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    async markAsRead(conversationId: number): Promise<{ success: boolean }> {
      return request(portalType, `/conversations/${conversationId}/read`, {
        method: "POST",
      });
    },

    async archiveConversation(conversationId: number): Promise<{ success: boolean }> {
      return request(portalType, `/conversations/${conversationId}/archive`, {
        method: "POST",
      });
    },

    async broadcasts(
      filters: BroadcastFilters = {},
    ): Promise<{ broadcasts: BroadcastSummary[]; total: number }> {
      return request(portalType, `/broadcasts${buildQueryString(filters)}`);
    },

    async markBroadcastRead(broadcastId: number): Promise<{ success: boolean }> {
      return request(portalType, `/broadcasts/${broadcastId}/read`, {
        method: "POST",
      });
    },

    async unreadCount(): Promise<{ messages: number; broadcasts: number }> {
      return request(portalType, "/unread-count");
    },

    async responseStats(): Promise<UserResponseStats> {
      return request(portalType, "/response-stats");
    },
  };
}

function createAdminMessagingApi() {
  const baseApi = createMessagingApi("admin");
  const portalType: PortalType = "admin";

  return {
    ...baseApi,

    async broadcastsAdmin(
      filters: BroadcastFilters = {},
    ): Promise<{ broadcasts: BroadcastDetail[]; total: number }> {
      return request(portalType, `/broadcasts${buildQueryString(filters)}`);
    },

    async createBroadcast(dto: CreateBroadcastDto): Promise<BroadcastDetail> {
      return request(portalType, "/broadcasts", {
        method: "POST",
        body: JSON.stringify(dto),
      });
    },

    async broadcast(broadcastId: number): Promise<BroadcastDetail> {
      return request(portalType, `/broadcasts/${broadcastId}`);
    },

    async responseMetrics(filters: MetricsFilters = {}): Promise<ResponseMetricsSummary> {
      return request(portalType, `/response-metrics${buildQueryString(filters)}`);
    },

    async userResponseMetrics(
      userId: number,
      filters: MetricsFilters = {},
    ): Promise<UserResponseStats> {
      return request(portalType, `/response-metrics/user/${userId}${buildQueryString(filters)}`);
    },

    async slaConfig(): Promise<SlaConfig> {
      return request(portalType, "/sla-config");
    },

    async updateSlaConfig(dto: Partial<Omit<SlaConfig, "id" | "updatedAt">>): Promise<SlaConfig> {
      return request(portalType, "/sla-config", {
        method: "PUT",
        body: JSON.stringify(dto),
      });
    },
  };
}

export const customerMessagingApi = createMessagingApi("customer");
export const supplierMessagingApi = createMessagingApi("supplier");
export const adminMessagingApi = createAdminMessagingApi();
