import { browserBaseUrl } from "@/lib/api-config";

const chatAuthHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("adminAccessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export interface ChatSession {
  sessionId: number;
  userId: number;
  rfqId?: number;
  isActive: boolean;
  userPreferences: {
    preferredMaterials?: string[];
    preferredSchedules?: string[];
    preferredStandards?: string[];
    commonFlangeRatings?: string[];
    unitPreference?: "metric" | "imperial";
    learningEnabled?: boolean;
  };
  lastInteractionAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    intent?: string;
    itemsCreated?: number;
    validationIssues?: any[];
    suggestionsProvided?: string[];
    tokensUsed?: number;
    processingTimeMs?: number;
    model?: string;
  };
  createdAt: string;
}

export interface StreamChunk {
  type: "content_delta" | "message_start" | "message_stop" | "error";
  delta?: string;
  error?: string;
  metadata?: {
    model?: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  };
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  field: string;
  message: string;
  suggestion?: string;
  itemIndex?: number;
}

export const nixChatApi = {
  async createSession(rfqId?: number): Promise<{ sessionId: number }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rfqId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create chat session: ${response.statusText}`);
    }

    return response.json();
  },

  async session(sessionId: number): Promise<ChatSession> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}`, {
      headers: chatAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  },

  async history(sessionId: number): Promise<{ sessionId: number; messages: ChatMessage[] }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}/history`, {
      headers: chatAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get chat history: ${response.statusText}`);
    }

    return response.json();
  },

  async sendMessage(
    sessionId: number,
    message: string,
    context?: {
      currentRfqItems?: any[];
      lastValidationIssues?: any[];
    },
  ): Promise<{
    sessionId: number;
    messageId: number;
    content: string;
    metadata?: any;
  }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}/message`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error || `Failed to send message: ${response.statusText}`;
      throw new Error(message);
    }

    return response.json();
  },

  async *streamMessage(
    sessionId: number,
    message: string,
    context?: {
      currentRfqItems?: any[];
      lastValidationIssues?: any[];
    },
  ): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}/stream`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      throw new Error(`Failed to stream message: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data) as StreamChunk;
            yield chunk;
          } catch (error) {
            console.warn("Failed to parse SSE chunk:", error);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async updatePreferences(
    sessionId: number,
    preferences: Partial<ChatSession["userPreferences"]>,
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}/preferences`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`Failed to update preferences: ${response.statusText}`);
    }

    return response.json();
  },

  async recordCorrection(
    sessionId: number,
    correction: {
      extractedValue: string;
      correctedValue: string;
      fieldType: string;
    },
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}/correction`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(correction),
    });

    if (!response.ok) {
      throw new Error(`Failed to record correction: ${response.statusText}`);
    }

    return response.json();
  },

  async endSession(sessionId: number): Promise<{ success: boolean }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/session/${sessionId}/end`, {
      method: "POST",
      headers: chatAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to end session: ${response.statusText}`);
    }

    return response.json();
  },

  async validateItem(
    item: any,
    context?: { allItems?: any[]; itemIndex?: number },
  ): Promise<{
    valid: boolean;
    issues: ValidationIssue[];
  }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/validate/item`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item, context }),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate item: ${response.statusText}`);
    }

    return response.json();
  },

  async validateRfq(items: any[]): Promise<{
    valid: boolean;
    issues: ValidationIssue[];
    summary: {
      errors: number;
      warnings: number;
      info: number;
    };
  }> {
    const response = await fetch(`${browserBaseUrl()}/nix/chat/validate/rfq`, {
      method: "POST",
      headers: {
        ...chatAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate RFQ: ${response.statusText}`);
    }

    return response.json();
  },
};
