import { annixRepAuthHeaders } from "@/lib/api-config";

const DEFAULT_AGENT_URL = "http://localhost:47823";
const AGENT_URL_STORAGE_KEY = "voiceAgentUrl";

export interface VoiceAgentHealth {
  status: "ok";
  version: string | null;
  enrolled: boolean;
}

export interface VoiceAgentDevice {
  id: string;
  name: string;
  isVirtual: boolean;
}

export interface VoiceAgentDevices {
  inputs: VoiceAgentDevice[];
  outputs: VoiceAgentDevice[];
}

export interface VoiceFilterRunStatus {
  running: boolean;
  muted: boolean;
  level: number;
  verifiedCount: number;
  blockedCount: number;
}

export interface VoiceEnrollmentStatus {
  state: "idle" | "recording" | "processing" | "complete" | "error";
  progress: number;
  message: string | null;
}

export interface StartFilterConfig {
  inputDeviceId: string | null;
  outputDeviceId: string | null;
}

export function voiceAgentBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_VOICE_AGENT_URL;
  if (fromEnv) {
    return fromEnv;
  }
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window !== "undefined") {
    const override = localStorage.getItem(AGENT_URL_STORAGE_KEY);
    if (override) {
      return override;
    }
  }
  return DEFAULT_AGENT_URL;
}

export function setVoiceAgentBaseUrl(url: string): void {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard
  if (typeof window === "undefined") {
    return;
  }
  if (url) {
    localStorage.setItem(AGENT_URL_STORAGE_KEY, url);
  } else {
    localStorage.removeItem(AGENT_URL_STORAGE_KEY);
  }
}

async function agentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const extraHeaders = init.headers;
  const headers = {
    "Content-Type": "application/json",
    ...annixRepAuthHeaders(),
    ...(extraHeaders ?? {}),
  };
  const response = await fetch(`${voiceAgentBaseUrl()}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(`Voice agent request failed: ${response.status}`);
  }
  return response.json();
}

export const voiceAgentApi = {
  health: (): Promise<VoiceAgentHealth> => agentRequest<VoiceAgentHealth>("/api/health"),

  devices: (): Promise<VoiceAgentDevices> => agentRequest<VoiceAgentDevices>("/api/devices"),

  filterStatus: (): Promise<VoiceFilterRunStatus> =>
    agentRequest<VoiceFilterRunStatus>("/api/filter/status"),

  startFilter: (config: StartFilterConfig): Promise<VoiceFilterRunStatus> =>
    agentRequest<VoiceFilterRunStatus>("/api/filter/start", {
      method: "POST",
      body: JSON.stringify(config),
    }),

  stopFilter: (): Promise<VoiceFilterRunStatus> =>
    agentRequest<VoiceFilterRunStatus>("/api/filter/stop", { method: "POST" }),

  startEnrollment: (): Promise<VoiceEnrollmentStatus> =>
    agentRequest<VoiceEnrollmentStatus>("/api/enrollment/start", { method: "POST" }),

  enrollmentStatus: (): Promise<VoiceEnrollmentStatus> =>
    agentRequest<VoiceEnrollmentStatus>("/api/enrollment/status"),

  meetingStart: (name: string): Promise<{ meetingId: string }> =>
    agentRequest<{ meetingId: string }>("/api/meeting/start", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  meetingStop: (): Promise<{ meetingId: string | null }> =>
    agentRequest<{ meetingId: string | null }>("/api/meeting/stop", { method: "POST" }),

  transcriptStreamUrl: (): string => {
    const base = voiceAgentBaseUrl().replace(/^http/, "ws");
    return `${base}/ws`;
  },
};
