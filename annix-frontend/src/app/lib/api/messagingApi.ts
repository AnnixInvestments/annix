"use client";

import { toPairs as entries } from "es-toolkit/compat";
import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import {
  adminTokenStore,
  customerTokenStore,
  supplierTokenStore,
} from "@/app/lib/api/portalTokenStores";
import { browserBaseUrl } from "@/lib/api-config";

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

const baseUrl = browserBaseUrl();

const portalClients: Record<PortalType, ApiClient> = {
  customer: createApiClient({
    baseURL: `${baseUrl}/customer/messaging`,
    tokenStore: customerTokenStore,
    refreshUrl: `${baseUrl}/customer/auth/refresh`,
  }),
  supplier: createApiClient({
    baseURL: `${baseUrl}/supplier/messaging`,
    tokenStore: supplierTokenStore,
    refreshUrl: `${baseUrl}/supplier/auth/refresh`,
  }),
  admin: createApiClient({
    baseURL: `${baseUrl}/admin/messaging`,
    tokenStore: adminTokenStore,
    refreshUrl: `${baseUrl}/admin/auth/refresh`,
  }),
};

function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();
  entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function createMessagingApi(portalType: PortalType) {
  const client = portalClients[portalType];
  return {
    async conversations(
      filters: ConversationFilters = {},
    ): Promise<{ conversations: ConversationSummary[]; total: number }> {
      return client.get(`/conversations${buildQueryString(filters)}`);
    },

    async createConversation(dto: CreateConversationDto): Promise<ConversationDetail> {
      return client.post("/conversations", dto);
    },

    async conversation(conversationId: number): Promise<ConversationDetail> {
      return client.get(`/conversations/${conversationId}`);
    },

    async messages(
      conversationId: number,
      pagination: { page?: number; limit?: number; beforeId?: number } = {},
    ): Promise<{ messages: Message[]; hasMore: boolean }> {
      return client.get(`/conversations/${conversationId}/messages${buildQueryString(pagination)}`);
    },

    async sendMessage(conversationId: number, dto: SendMessageDto): Promise<Message> {
      return client.post(`/conversations/${conversationId}/messages`, dto);
    },

    async markAsRead(conversationId: number): Promise<{ success: boolean }> {
      return client.post(`/conversations/${conversationId}/read`);
    },

    async archiveConversation(conversationId: number): Promise<{ success: boolean }> {
      return client.post(`/conversations/${conversationId}/archive`);
    },

    async broadcasts(
      filters: BroadcastFilters = {},
    ): Promise<{ broadcasts: BroadcastSummary[]; total: number }> {
      return client.get(`/broadcasts${buildQueryString(filters)}`);
    },

    async markBroadcastRead(broadcastId: number): Promise<{ success: boolean }> {
      return client.post(`/broadcasts/${broadcastId}/read`);
    },

    async unreadCount(): Promise<{ messages: number; broadcasts: number }> {
      return client.get("/unread-count");
    },

    async responseStats(): Promise<UserResponseStats> {
      return client.get("/response-stats");
    },
  };
}

function createAdminMessagingApi() {
  const baseApi = createMessagingApi("admin");
  const client = portalClients.admin;

  return {
    ...baseApi,

    async broadcastsAdmin(
      filters: BroadcastFilters = {},
    ): Promise<{ broadcasts: BroadcastDetail[]; total: number }> {
      return client.get(`/broadcasts${buildQueryString(filters)}`);
    },

    async createBroadcast(dto: CreateBroadcastDto): Promise<BroadcastDetail> {
      return client.post("/broadcasts", dto);
    },

    async broadcast(broadcastId: number): Promise<BroadcastDetail> {
      return client.get(`/broadcasts/${broadcastId}`);
    },

    async responseMetrics(filters: MetricsFilters = {}): Promise<ResponseMetricsSummary> {
      return client.get(`/response-metrics${buildQueryString(filters)}`);
    },

    async userResponseMetrics(
      userId: number,
      filters: MetricsFilters = {},
    ): Promise<UserResponseStats> {
      return client.get(`/response-metrics/user/${userId}${buildQueryString(filters)}`);
    },

    async slaConfig(): Promise<SlaConfig> {
      return client.get("/sla-config");
    },

    async updateSlaConfig(dto: Partial<Omit<SlaConfig, "id" | "updatedAt">>): Promise<SlaConfig> {
      return client.put("/sla-config", dto);
    },
  };
}

export const customerMessagingApi = createMessagingApi("customer");
export const supplierMessagingApi = createMessagingApi("supplier");
export const adminMessagingApi = createAdminMessagingApi();
