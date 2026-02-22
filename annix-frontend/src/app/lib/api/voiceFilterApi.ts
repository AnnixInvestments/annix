const VOICE_FILTER_API_URL = "http://localhost:47823";

export interface VoiceFilterUser {
  id: number;
  email: string;
  provider: string | null;
}

export interface VoiceFilterCalendarProvider {
  provider: string;
  connected: boolean;
  lastSync: string | null;
  status: string;
  error: string | null;
}

export interface VoiceFilterCalendarEvent {
  id: number;
  provider: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
  location: string | null;
}

async function fetchWithCredentials(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}

export const voiceFilterApi = {
  login: async (email: string, password: string): Promise<boolean> => {
    const response = await fetchWithCredentials(`${VOICE_FILTER_API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.ok;
  },

  register: async (email: string, password: string): Promise<boolean> => {
    const response = await fetchWithCredentials(`${VOICE_FILTER_API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.ok;
  },

  logout: async (): Promise<boolean> => {
    const response = await fetchWithCredentials(`${VOICE_FILTER_API_URL}/api/logout`, {
      method: "POST",
    });
    return response.ok;
  },

  user: async (): Promise<VoiceFilterUser | null> => {
    const response = await fetchWithCredentials(`${VOICE_FILTER_API_URL}/api/user`);
    if (!response.ok) return null;
    return response.json();
  },

  oauthUrl: (provider: string): string => {
    return `/api/auth/oauth/${provider}?returnUrl=/voice-filter`;
  },

  calendarProviders: async (): Promise<{ providers: VoiceFilterCalendarProvider[] }> => {
    const response = await fetchWithCredentials(`${VOICE_FILTER_API_URL}/api/calendar/providers`);
    if (!response.ok) throw new Error("Failed to fetch calendar providers");
    return response.json();
  },

  calendarEvents: async (params?: {
    provider?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<{ events: VoiceFilterCalendarEvent[] }> => {
    const url = new URL(`${VOICE_FILTER_API_URL}/api/calendar/events`);
    if (params?.provider) url.searchParams.set("provider", params.provider);
    if (params?.from) url.searchParams.set("from", params.from);
    if (params?.to) url.searchParams.set("to", params.to);
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());

    const response = await fetchWithCredentials(url.toString());
    if (!response.ok) throw new Error("Failed to fetch calendar events");
    return response.json();
  },

  calendarUpcoming: async (limit: number = 10): Promise<{ events: VoiceFilterCalendarEvent[] }> => {
    const response = await fetchWithCredentials(
      `${VOICE_FILTER_API_URL}/api/calendar/upcoming?limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch upcoming events");
    return response.json();
  },

  calendarSync: async (provider?: string, fullSync?: boolean): Promise<void> => {
    const response = await fetchWithCredentials(`${VOICE_FILTER_API_URL}/api/calendar/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, fullSync }),
    });
    if (!response.ok) throw new Error("Failed to sync calendar");
  },

  calendarDisconnect: async (provider: string): Promise<void> => {
    const response = await fetchWithCredentials(
      `${VOICE_FILTER_API_URL}/api/calendar/disconnect/${provider}`,
      { method: "POST" },
    );
    if (!response.ok) throw new Error("Failed to disconnect calendar");
  },

  calendarOauthUrl: (provider: string): string => {
    return `/api/auth/oauth/${provider}?returnUrl=/voice-filter/calendar&mode=connect`;
  },
};
