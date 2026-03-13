import { StockControlApiClient } from "./base";
import type {
  ChatConversationResponse,
  ChatMessageResponse,
  StockControlTeamMember,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    chatMessages(afterId: number | null, conversationId?: number | null): Promise<ChatMessageResponse[]>;
    sendChatMessage(text: string, imageUrl?: string | null, conversationId?: number | null): Promise<ChatMessageResponse>;
    editChatMessage(messageId: number, text: string): Promise<{ success: boolean }>;
    uploadChatImage(file: File): Promise<{ imageUrl: string }>;
    chatConversations(): Promise<ChatConversationResponse[]>;
    createChatConversation(participantUserIds: number[], name?: string | null): Promise<ChatConversationResponse>;
    markConversationRead(conversationId: number): Promise<{ success: boolean }>;
    chatUnreadCounts(): Promise<Record<string, number>>;
    chatTeamMembers(): Promise<StockControlTeamMember[]>;
  }
}

const proto = StockControlApiClient.prototype;

proto.chatMessages = async function (afterId, conversationId) {
  const params = new URLSearchParams();
  if (afterId !== null) params.set("afterId", String(afterId));
  if (conversationId !== null && conversationId !== undefined)
    params.set("conversationId", String(conversationId));
  const qs = params.toString();
  return this.request(`/stock-control/chat/messages${qs ? `?${qs}` : ""}`);
};

proto.sendChatMessage = async function (text, imageUrl, conversationId) {
  return this.request("/stock-control/chat/messages", {
    method: "POST",
    body: JSON.stringify({
      text,
      imageUrl: imageUrl ?? null,
      conversationId: conversationId ?? null,
    }),
  });
};

proto.editChatMessage = async function (messageId, text) {
  return this.request(`/stock-control/chat/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });
};

proto.uploadChatImage = async function (file) {
  return this.uploadFile("/stock-control/chat/upload", file);
};

proto.chatConversations = async function () {
  return this.request("/stock-control/chat/conversations");
};

proto.createChatConversation = async function (participantUserIds, name) {
  return this.request("/stock-control/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ participantUserIds, name: name ?? null }),
  });
};

proto.markConversationRead = async function (conversationId) {
  return this.request(`/stock-control/chat/conversations/${conversationId}/read`, { method: "POST" });
};

proto.chatUnreadCounts = async function () {
  return this.request("/stock-control/chat/unread");
};

proto.chatTeamMembers = async function () {
  return this.request("/stock-control/chat/team");
};
