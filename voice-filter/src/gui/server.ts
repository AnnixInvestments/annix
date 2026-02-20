import "dotenv/config";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import open from "open";
import { type WebSocket, WebSocketServer } from "ws";
import {
  AudioCapture,
  findRealMicrophone,
  listInputDevices,
  listOutputDevices,
} from "../audio/capture.js";
import { findVBCableDevice } from "../audio/output.js";
import {
  calendarEventById,
  createUser,
  findOrCreateOAuthUser,
  findUserByEmail,
  findUserById,
  initDatabase,
  oauthTokens,
  verifyPassword,
} from "../auth/database.js";
import { extractTokenFromCookie, signToken, verifyToken } from "../auth/jwt.js";
import { calendarService, initCalendarService } from "../calendar/calendar-service.js";
import type { CalendarProvider } from "../calendar/types.js";
import { loadProfile, loadSettings, updateSettings } from "../config/settings.js";
import { VoiceFilter, type VoiceFilterStatus } from "../index.js";
import { MeetingSession } from "../meeting/MeetingSession.js";
import type { MeetingAttendee, MeetingExport, TranscriptEntry } from "../meeting/types.js";
import { EnrollmentSession } from "../verification/enrollment.js";
import type { VerificationResult } from "../verification/verify.js";

const PORT = 47823;
const OAUTH_REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["email", "profile"],
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    scopes: ["openid", "email", "profile", "User.Read"],
  },
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID ?? "",
    clientSecret: process.env.ZOOM_CLIENT_SECRET ?? "",
    authUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    userInfoUrl: "https://api.zoom.us/v2/users/me",
    scopes: ["user:read"],
  },
};

function oauthAuthUrl(configKey: string, state: string): string | null {
  const config = OAUTH_CONFIGS[configKey];
  if (!config || !config.clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: config.scopes.join(" "),
    state: state,
  });

  return `${config.authUrl}?${params.toString()}`;
}

async function exchangeOAuthCode(
  provider: string,
  code: string,
): Promise<{ accessToken: string; email: string; oauthId: string } | null> {
  const config = OAUTH_CONFIGS[provider];
  if (!config || !config.clientId || !config.clientSecret) {
    return null;
  }

  const tokenBody = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: OAUTH_REDIRECT_URI,
  });

  const tokenRes = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  if (!tokenRes.ok) {
    console.error("OAuth token exchange failed:", await tokenRes.text());
    return null;
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  const accessToken = tokenData.access_token;

  const userHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  const userRes = await fetch(config.userInfoUrl, { headers: userHeaders });
  if (!userRes.ok) {
    console.error("OAuth user info fetch failed:", await userRes.text());
    return null;
  }

  const userData = (await userRes.json()) as Record<string, unknown>;

  let email: string;
  let oauthId: string;

  if (provider === "google") {
    email = userData.email as string;
    oauthId = userData.id as string;
  } else if (provider === "microsoft") {
    email = (userData.mail ?? userData.userPrincipalName) as string;
    oauthId = userData.id as string;
  } else if (provider === "zoom") {
    email = userData.email as string;
    oauthId = userData.id as string;
  } else {
    return null;
  }

  return { accessToken, email, oauthId };
}

let audioCapture: AudioCapture | null = null;
let enrollmentSession: EnrollmentSession | null = null;
let voiceFilter: VoiceFilter | null = null;
let meetingSession: MeetingSession | null = null;
let detectedDevice: { id: number; name: string } | null = null;
let wsClient: WebSocket | null = null;

function serveHomeHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "home.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}

function serveFilterHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "index.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}

function serveMiniHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "mini.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}

function serveMeetingHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "meeting.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}

function serveLoginHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "login.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, {
    "Content-Type": "text/html",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(html);
}

function serveCalendarHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "calendar.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
}

function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf-8");
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function setTokenCookie(res: ServerResponse, token: string): void {
  res.setHeader(
    "Set-Cookie",
    `vf_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800`,
  );
}

function clearTokenCookie(res: ServerResponse): void {
  res.setHeader("Set-Cookie", "vf_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0");
}

function redirectTo(res: ServerResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

function authenticatedUserId(req: IncomingMessage): number | null {
  const token = extractTokenFromCookie(req.headers.cookie);
  if (!token) {
    return null;
  }
  const payload = verifyToken(token);
  return payload ? payload.userId : null;
}

async function handleApiRegister(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      sendJson(res, 400, { error: "Email and password are required." });
      return;
    }

    if (password.length < 8) {
      sendJson(res, 400, { error: "Password must be at least 8 characters." });
      return;
    }

    const existing = findUserByEmail(email);
    if (existing) {
      sendJson(res, 409, { error: "An account with this email already exists." });
      return;
    }

    const user = await createUser(email, password);
    const token = signToken(user.id);
    setTokenCookie(res, token);
    sendJson(res, 201, { success: true });
  } catch {
    sendJson(res, 500, { error: "Registration failed. Please try again." });
  }
}

async function handleApiLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      sendJson(res, 400, { error: "Email and password are required." });
      return;
    }

    const user = findUserByEmail(email);
    if (!user || !user.password_hash) {
      sendJson(res, 401, { error: "Invalid email or password." });
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      sendJson(res, 401, { error: "Invalid email or password." });
      return;
    }

    const token = signToken(user.id);
    setTokenCookie(res, token);
    sendJson(res, 200, { success: true });
  } catch {
    sendJson(res, 500, { error: "Login failed. Please try again." });
  }
}

function handleApiLogout(_req: IncomingMessage, res: ServerResponse): void {
  clearTokenCookie(res);
  sendJson(res, 200, { success: true });
}

function handleApiCheckCredentials(req: IncomingMessage, res: ServerResponse): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const tokens = oauthTokens(userId);
  const services = ["google", "microsoft", "zoom"];
  const missing = services.filter((s) => !tokens[s]);
  sendJson(res, 200, { missing });
}

function handleApiUserInfo(req: IncomingMessage, res: ServerResponse): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const user = findUserById(userId);
  if (!user) {
    sendJson(res, 404, { error: "User not found." });
    return;
  }

  sendJson(res, 200, {
    id: user.id,
    email: user.email,
    provider: user.oauth_provider,
  });
}

function handleApiCalendarProviders(req: IncomingMessage, res: ServerResponse): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const service = calendarService();
  const available = service.availableProviders();
  const connected = service.connectedProviders(userId);
  const syncStatus = service.syncStatus(userId);

  const providers = available.map((p) => ({
    provider: p,
    connected: connected.includes(p),
    lastSync: syncStatus.get(p)?.lastSync ?? null,
    status: syncStatus.get(p)?.status ?? "idle",
    error: syncStatus.get(p)?.error ?? null,
  }));

  sendJson(res, 200, { providers });
}

function handleApiCalendarEvents(req: IncomingMessage, res: ServerResponse): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const provider = url.searchParams.get("provider") as CalendarProvider | null;
  const fromDate = url.searchParams.get("from") ?? undefined;
  const toDate = url.searchParams.get("to") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  const service = calendarService();

  let events;
  if (provider) {
    events = service.eventsByProvider(userId, provider, { fromDate, toDate });
  } else {
    events = service.allEvents(userId, { fromDate, toDate });
  }

  events = events.slice(0, limit);

  const mapped = events.map((e) => ({
    id: e.id,
    provider: e.provider,
    externalId: e.external_event_id,
    title: e.title,
    description: e.description,
    startTime: e.start_time,
    endTime: e.end_time,
    timezone: e.timezone,
    location: e.location,
    meetingUrl: e.meeting_url,
    attendees: e.attendees ? JSON.parse(e.attendees) : [],
    organizerEmail: e.organizer_email,
    isRecurring: !!e.is_recurring,
    status: e.status,
  }));

  sendJson(res, 200, { events: mapped });
}

function handleApiCalendarEventById(
  req: IncomingMessage,
  res: ServerResponse,
  eventId: number,
): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const event = calendarEventById(eventId);
  if (!event || event.user_id !== userId) {
    sendJson(res, 404, { error: "Event not found." });
    return;
  }

  sendJson(res, 200, {
    id: event.id,
    provider: event.provider,
    externalId: event.external_event_id,
    title: event.title,
    description: event.description,
    startTime: event.start_time,
    endTime: event.end_time,
    timezone: event.timezone,
    location: event.location,
    meetingUrl: event.meeting_url,
    attendees: event.attendees ? JSON.parse(event.attendees) : [],
    organizerEmail: event.organizer_email,
    isRecurring: !!event.is_recurring,
    status: event.status,
    rawData: event.raw_data ? JSON.parse(event.raw_data) : null,
  });
}

function handleApiCalendarUpcoming(req: IncomingMessage, res: ServerResponse): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

  const service = calendarService();
  const events = service.upcomingEvents(userId, limit);

  const mapped = events.map((e) => ({
    id: e.id,
    provider: e.provider,
    title: e.title,
    startTime: e.start_time,
    endTime: e.end_time,
    meetingUrl: e.meeting_url,
    location: e.location,
  }));

  sendJson(res, 200, { events: mapped });
}

async function handleApiCalendarSync(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const provider = body.provider as CalendarProvider | undefined;
    const fullSync = body.fullSync === true;

    const service = calendarService();

    if (provider) {
      if (!service.hasProvider(provider)) {
        sendJson(res, 400, { error: `Provider ${provider} not configured.` });
        return;
      }

      const result = await service.syncCalendar(userId, provider, { fullSync });
      sendJson(res, 200, {
        success: true,
        results: { [provider]: result },
      });
    } else {
      const results = await service.syncAllCalendars(userId);
      const resultsObj: Record<string, { added: number; updated: number; deleted: number }> = {};
      results.forEach((v, k) => {
        resultsObj[k] = v;
      });
      sendJson(res, 200, { success: true, results: resultsObj });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    sendJson(res, 500, { error: message });
  }
}

function handleApiCalendarSyncStatus(req: IncomingMessage, res: ServerResponse): void {
  const userId = authenticatedUserId(req);
  if (!userId) {
    sendJson(res, 401, { error: "Not authenticated." });
    return;
  }

  const service = calendarService();
  const status = service.syncStatus(userId);

  const statusObj: Record<
    string,
    { lastSync: string | null; status: string; error: string | null }
  > = {};
  status.forEach((v, k) => {
    statusObj[k] = v;
  });

  sendJson(res, 200, { status: statusObj });
}

function stopAudioCapture(): void {
  if (audioCapture) {
    audioCapture.stop();
    audioCapture = null;
  }
}

function sendMessage(type: string, data: unknown): void {
  if (wsClient && wsClient.readyState === wsClient.OPEN) {
    wsClient.send(JSON.stringify({ type, data }));
  }
}

function startMicTest(): void {
  try {
    const settings = loadSettings();

    let deviceId: number;
    if (settings.inputDeviceId !== null) {
      deviceId = settings.inputDeviceId;
      const devices = listInputDevices();
      const device = devices.find((d) => d.id === deviceId);
      detectedDevice = device ? { id: device.id, name: device.name } : null;
    } else {
      const realMic = findRealMicrophone();
      if (realMic) {
        deviceId = realMic.id;
        detectedDevice = { id: realMic.id, name: realMic.name };
      } else {
        deviceId = 0;
        detectedDevice = { id: 0, name: "Default Input Device" };
      }
    }

    console.log("Starting mic test with device:", detectedDevice);

    if (detectedDevice) {
      sendMessage("device-info", detectedDevice);
    }

    stopAudioCapture();

    audioCapture = new AudioCapture({ deviceId, sampleRate: 16000, channels: 1 });

    audioCapture.on("audio", (samples: Float32Array) => {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        sum += Math.abs(samples[i]);
      }
      const avg = sum / samples.length;
      const level = Math.min(1, avg * 10);
      sendMessage("volume-level", level);
    });

    audioCapture.on("error", (err: Error) => {
      console.error("Audio capture error:", err);
      sendMessage("enrollment-error", { message: err.message });
    });

    audioCapture.start();
  } catch (error) {
    console.error("Failed to start mic test:", error);
    sendMessage("enrollment-error", { message: (error as Error).message });
  }
}

async function startEnrollment(): Promise<void> {
  if (!detectedDevice) {
    console.log("No detected device, cannot start enrollment");
    return;
  }

  console.log("Starting enrollment...");
  stopAudioCapture();

  const settings = loadSettings();
  const domainId = settings.awsVoiceIdDomainId ?? "local";
  const speakerId = "default";

  enrollmentSession = new EnrollmentSession({
    speakerId,
    domainId,
    minSpeechDuration: 10000,
    inputDeviceId: detectedDevice.id,
    sampleRate: 16000,
  });

  enrollmentSession.on("audio", (samples: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    const avg = sum / samples.length;
    const level = Math.min(1, avg * 10);
    sendMessage("volume-level", level);
  });

  enrollmentSession.on(
    "progress",
    (progress: {
      speechDurationMs: number;
      requiredMs: number;
      percentComplete: number;
      isSpeech: boolean;
    }) => {
      sendMessage("enrollment-progress", progress);
    },
  );

  enrollmentSession.on("started", () => {
    console.log("Enrollment session started, listening for audio...");
  });

  enrollmentSession.on("completed", (result) => {
    console.log("Enrollment completed:", result.speakerId);
    updateSettings({
      speakerId: result.speakerId,
      inputDeviceId: detectedDevice!.id,
    });
    sendMessage("enrollment-complete", result);
  });

  enrollmentSession.on("cancelled", () => {
    console.log("Enrollment cancelled");
  });

  enrollmentSession.on("error", (error: Error) => {
    console.error("Enrollment error:", error);
    sendMessage("enrollment-error", { message: error.message });
  });

  try {
    console.log("Calling enrollmentSession.start()...");
    await enrollmentSession.start();
    console.log("enrollmentSession.start() returned");
  } catch (error) {
    console.error("Failed to start enrollment:", error);
    sendMessage("enrollment-error", { message: (error as Error).message });
  }
}

function cancelEnrollment(): void {
  console.log("cancelEnrollment called");
  if (enrollmentSession) {
    enrollmentSession.cancel();
    enrollmentSession = null;
  }
  startMicTest();
}

async function startVoiceFilter(): Promise<void> {
  if (voiceFilter?.isRunning()) {
    console.log("Voice filter already running");
    return;
  }

  stopAudioCapture();

  const settings = loadSettings();
  const vbCableId = findVBCableDevice();

  if (vbCableId === null) {
    console.error("VB-Cable not found");
    sendMessage("filter-error", {
      message: "VB-Cable not found. Please install VB-Cable to use the voice filter.",
    });
    return;
  }

  console.log("Starting voice filter...");
  console.log("  Input device:", detectedDevice?.name ?? "default");
  console.log("  Output device: VB-Cable (ID:", vbCableId, ")");
  console.log("  Speaker ID:", settings.speakerId ?? "none");

  voiceFilter = new VoiceFilter({
    inputDeviceId: detectedDevice?.id,
    outputDeviceId: vbCableId,
    speakerId: settings.speakerId ?? undefined,
    failOpen: settings.failOpen,
    verificationThreshold: settings.verificationThreshold,
    vadThreshold: settings.vadThreshold,
  });

  voiceFilter.on("started", (status: VoiceFilterStatus) => {
    console.log("Voice filter started");
    sendMessage("filter-started", status);
  });

  voiceFilter.on("verification", (result: VerificationResult) => {
    sendMessage("filter-verification", result);
  });

  voiceFilter.on("muted", () => {
    sendMessage("filter-muted", true);
  });

  voiceFilter.on("unmuted", () => {
    sendMessage("filter-unmuted", true);
  });

  voiceFilter.on("error", (error: Error) => {
    console.error("Voice filter error:", error);
    sendMessage("filter-error", { message: error.message });
  });

  voiceFilter.on(
    "audio",
    (data: { samples: Float32Array; probability: number; isSpeech: boolean; muted: boolean }) => {
      let sum = 0;
      for (let i = 0; i < data.samples.length; i++) {
        sum += Math.abs(data.samples[i]);
      }
      const avg = sum / data.samples.length;
      const level = Math.min(1, avg * 10);
      sendMessage("volume-level", level);
      sendMessage("vad-level", data.probability);
    },
  );

  try {
    await voiceFilter.start();
  } catch (error) {
    console.error("Failed to start voice filter:", error);
    sendMessage("filter-error", { message: (error as Error).message });
    voiceFilter = null;
  }
}

function stopVoiceFilter(): void {
  if (voiceFilter) {
    console.log("Stopping voice filter...");
    voiceFilter.stop();
    voiceFilter = null;
    sendMessage("filter-stopped", true);
  }
}

function checkExistingProfile(): { exists: boolean; speakerId: string | null } {
  const settings = loadSettings();
  if (settings.speakerId) {
    const profile = loadProfile(settings.speakerId);
    return { exists: profile !== null, speakerId: settings.speakerId };
  }
  return { exists: false, speakerId: null };
}

function sendDeviceList(): void {
  const inputs = listInputDevices().map((d) => ({ id: d.id, name: d.name }));
  const outputs = listOutputDevices().map((d) => ({ id: d.id, name: d.name }));
  sendMessage("devices", { inputs, outputs });
}

function sendCurrentSettings(): void {
  const settings = loadSettings();
  sendMessage("settings", {
    verificationThreshold: settings.verificationThreshold,
    vadThreshold: settings.vadThreshold,
    failOpen: settings.failOpen,
    inputDeviceId: settings.inputDeviceId,
    outputDeviceId: settings.outputDeviceId,
  });
}

function handleMeetingCreate(data: { title: string; attendeeCount: number }): void {
  const settings = loadSettings();

  meetingSession = new MeetingSession({
    title: data.title,
    attendeeCount: data.attendeeCount,
    inputDeviceId: detectedDevice?.id,
    openaiApiKey: settings.openaiApiKey ?? undefined,
  });

  meetingSession.on("attendee-added", (attendee: MeetingAttendee) => {
    sendMessage("meeting-attendee-added", { attendee });
  });

  meetingSession.on("attendee-removed", (attendee: MeetingAttendee) => {
    sendMessage("meeting-attendee-removed", { attendee });
  });

  meetingSession.on("enrollment-audio", (samples: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    const avg = sum / samples.length;
    const level = Math.min(1, avg * 10);
    sendMessage("volume-level", level);
  });

  meetingSession.on("enrollment-progress", (progress) => {
    sendMessage("meeting-enrollment-progress", progress);
  });

  meetingSession.on("enrollment-complete", (attendee: MeetingAttendee) => {
    sendMessage("meeting-enrollment-complete", { attendee });
  });

  meetingSession.on("enrollment-error", (error: Error) => {
    sendMessage("meeting-enrollment-error", { message: error.message });
  });

  meetingSession.on("enrollment-cancelled", () => {
    sendMessage("meeting-enrollment-cancelled", {});
  });

  meetingSession.on("all-enrolled", () => {
    sendMessage("meeting-ready", { session: meetingSession!.data() });
  });

  meetingSession.on("meeting-started", () => {
    sendMessage("meeting-active", { session: meetingSession!.data() });
  });

  meetingSession.on("speaker-identified", (speaker) => {
    sendMessage("meeting-speaker-identified", speaker);
  });

  meetingSession.on("speaker-changed", (speaker) => {
    sendMessage("meeting-speaker-changed", speaker);
  });

  meetingSession.on("transcript-entry", (entry: TranscriptEntry) => {
    sendMessage("meeting-transcript-entry", entry);
  });

  meetingSession.on("volume-level", (level: number) => {
    sendMessage("volume-level", level);
  });

  meetingSession.on("meeting-paused", () => {
    sendMessage("meeting-paused", {});
  });

  meetingSession.on("meeting-resumed", () => {
    sendMessage("meeting-resumed", {});
  });

  meetingSession.on("meeting-ended", (exportData: MeetingExport) => {
    sendMessage("meeting-ended", exportData);
  });

  meetingSession.on("error", (error: Error) => {
    sendMessage("meeting-error", { message: error.message });
  });

  console.log("Meeting created:", meetingSession.sessionId_());
  sendMessage("meeting-created", { sessionId: meetingSession.sessionId_() });
}

function handleMeetingAddAttendee(data: { name: string; title: string }): void {
  if (!meetingSession) {
    sendMessage("meeting-error", { message: "No active meeting session" });
    return;
  }

  const attendee = meetingSession.addAttendee(data.name, data.title);
  console.log("Attendee added:", attendee.name);
}

function handleMeetingRemoveAttendee(data: { attendeeId: string }): void {
  if (!meetingSession) {
    sendMessage("meeting-error", { message: "No active meeting session" });
    return;
  }

  meetingSession.removeAttendee(data.attendeeId);
}

async function handleMeetingStartEnrollment(data: { attendeeIndex: number }): Promise<void> {
  if (!meetingSession) {
    sendMessage("meeting-error", { message: "No active meeting session" });
    return;
  }

  try {
    await meetingSession.startEnrollment(data.attendeeIndex);
  } catch (error) {
    sendMessage("meeting-enrollment-error", { message: (error as Error).message });
  }
}

function handleMeetingCancelEnrollment(): void {
  if (meetingSession) {
    meetingSession.cancelEnrollment();
  }
}

async function handleMeetingStart(): Promise<void> {
  if (!meetingSession) {
    sendMessage("meeting-error", { message: "No active meeting session" });
    return;
  }

  try {
    stopAudioCapture();
    stopVoiceFilter();
    await meetingSession.startMeeting();
  } catch (error) {
    sendMessage("meeting-error", { message: (error as Error).message });
  }
}

function handleMeetingPause(): void {
  if (meetingSession) {
    meetingSession.pauseMeeting();
  }
}

function handleMeetingResume(): void {
  if (meetingSession) {
    meetingSession.resumeMeeting();
  }
}

function handleMeetingEnd(): void {
  if (meetingSession) {
    meetingSession.endMeeting();
    meetingSession = null;
  }
}

function handleMeetingExport(data: { format: "txt" | "json" }): void {
  if (!meetingSession) {
    sendMessage("meeting-error", { message: "No active meeting session" });
    return;
  }

  const content = meetingSession.exportTranscript(data.format);
  sendMessage("meeting-export-ready", { format: data.format, content });
}

function handleMeetingStatus(): void {
  if (meetingSession) {
    sendMessage("meeting-status", { session: meetingSession.data() });
  } else {
    sendMessage("meeting-status", { session: null });
  }
}

function handleMessage(message: string): void {
  try {
    const { type, data } = JSON.parse(message);

    if (type === "ready") {
      const profileInfo = checkExistingProfile();
      if (profileInfo.exists) {
        sendMessage("has-profile", { speakerId: profileInfo.speakerId });
      }
      sendDeviceList();
      sendCurrentSettings();
      startMicTest();
    } else if (type === "start-enrollment") {
      startEnrollment();
    } else if (type === "cancel-enrollment") {
      cancelEnrollment();
    } else if (type === "restart-mic-test") {
      startMicTest();
    } else if (type === "start-filter") {
      startVoiceFilter();
    } else if (type === "stop-filter") {
      stopVoiceFilter();
    } else if (type === "update-settings") {
      if (data) {
        const updates: Record<string, unknown> = {};
        if (data.verificationThreshold !== undefined) {
          updates.verificationThreshold = data.verificationThreshold;
        }
        if (data.vadThreshold !== undefined) {
          updates.vadThreshold = data.vadThreshold;
        }
        if (data.failOpen !== undefined) {
          updates.failOpen = data.failOpen;
        }
        if (data.inputDeviceId !== undefined) {
          updates.inputDeviceId = data.inputDeviceId;
          const devices = listInputDevices();
          const device = devices.find((d) => d.id === data.inputDeviceId);
          if (device) {
            detectedDevice = { id: device.id, name: device.name };
          }
        }
        if (data.outputDeviceId !== undefined) {
          updates.outputDeviceId = data.outputDeviceId;
        }
        updateSettings(updates);
        console.log("Settings updated:", updates);
      }
    } else if (type === "meeting-create") {
      handleMeetingCreate(data);
    } else if (type === "meeting-add-attendee") {
      handleMeetingAddAttendee(data);
    } else if (type === "meeting-remove-attendee") {
      handleMeetingRemoveAttendee(data);
    } else if (type === "meeting-start-enrollment") {
      handleMeetingStartEnrollment(data);
    } else if (type === "meeting-cancel-enrollment") {
      handleMeetingCancelEnrollment();
    } else if (type === "meeting-start") {
      handleMeetingStart();
    } else if (type === "meeting-pause") {
      handleMeetingPause();
    } else if (type === "meeting-resume") {
      handleMeetingResume();
    } else if (type === "meeting-end") {
      handleMeetingEnd();
    } else if (type === "meeting-export") {
      handleMeetingExport(data);
    } else if (type === "meeting-status") {
      handleMeetingStatus();
    } else if (type === "meeting-check-credentials") {
      if (data && typeof data.userId === "number") {
        const tokens = oauthTokens(data.userId);
        const services = ["google", "microsoft", "zoom"];
        const missing = services.filter((s) => !tokens[s]);
        sendMessage("meeting-credentials-status", { missing });
      }
    } else if (type === "close-window") {
      stopAudioCapture();
      stopVoiceFilter();
      process.exit(0);
    }
  } catch {
    console.error("Invalid message");
  }
}

export async function startGuiServer(openBrowser: boolean = true): Promise<void> {
  initDatabase();
  initCalendarService();

  const server = createServer((req, res) => {
    const url = req.url ?? "/";

    if (url === "/login") {
      serveLoginHtml(req, res);
      return;
    }

    if (url === "/api/register" && req.method === "POST") {
      handleApiRegister(req, res);
      return;
    }

    if (url === "/api/login" && req.method === "POST") {
      handleApiLogin(req, res);
      return;
    }

    if (url === "/api/logout" && req.method === "POST") {
      handleApiLogout(req, res);
      return;
    }

    if (url.startsWith("/oauth/") && !url.includes("/callback")) {
      const provider = url.replace("/oauth/", "");
      console.log("OAuth request for provider:", provider);
      if (["google", "microsoft", "teams", "zoom"].includes(provider)) {
        const configKey = provider === "teams" ? "microsoft" : provider;
        const config = OAUTH_CONFIGS[configKey];
        console.log("OAuth config clientId exists:", !!config.clientId);
        if (!config.clientId) {
          const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
          console.log("Showing error page - not configured");
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`<!DOCTYPE html>
<html><head><title>OAuth Not Configured</title>
<style>
body { font-family: sans-serif; background: #0f1419; color: #e7e9ea; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
.card { background: #16181c; border: 1px solid #f4212e; border-radius: 16px; padding: 32px; max-width: 400px; text-align: center; }
h1 { color: #f4212e; margin-bottom: 16px; }
p { color: #71767b; line-height: 1.6; }
a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #1d9bf0; color: white; text-decoration: none; border-radius: 9999px; }
a:hover { background: #1a8cd8; }
code { background: #2f3336; padding: 2px 6px; border-radius: 4px; }
</style></head>
<body><div class="card">
<h1>${providerName} Not Configured</h1>
<p>To enable ${providerName} sign-in, add your OAuth credentials to the <code>.env</code> file in the voice-filter folder.</p>
<p>You need: <code>${configKey.toUpperCase()}_CLIENT_ID</code> and <code>${configKey.toUpperCase()}_CLIENT_SECRET</code></p>
<a href="/login">Back to Login</a>
</div></body></html>`);
          return;
        }
        const state = Math.random().toString(36).substring(2, 15);
        const authUrl = oauthAuthUrl(configKey, `${provider}:${state}`);
        if (authUrl) {
          redirectTo(res, authUrl);
        } else {
          sendJson(res, 500, { error: "Failed to generate OAuth URL" });
        }
        return;
      }
    }

    if (url.startsWith("/oauth/callback")) {
      const urlObj = new URL(url, `http://localhost:${PORT}`);
      const code = urlObj.searchParams.get("code");
      const state = urlObj.searchParams.get("state");
      const error = urlObj.searchParams.get("error");

      if (error) {
        redirectTo(res, `/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code || !state) {
        redirectTo(res, "/login?error=missing_code");
        return;
      }

      const [provider] = state.split(":");
      if (!["google", "microsoft", "teams", "zoom"].includes(provider)) {
        redirectTo(res, "/login?error=invalid_provider");
        return;
      }

      const configKey = provider === "teams" ? "microsoft" : provider;
      exchangeOAuthCode(configKey, code)
        .then((result) => {
          if (!result) {
            redirectTo(res, "/login?error=oauth_failed");
            return;
          }

          const user = findOrCreateOAuthUser(
            result.email,
            provider,
            result.oauthId,
            result.accessToken,
          );
          const token = signToken(user.id);
          setTokenCookie(res, token);
          redirectTo(res, "/home");
        })
        .catch((err) => {
          console.error("OAuth callback error:", err);
          redirectTo(res, "/login?error=oauth_error");
        });
      return;
    }

    const userId = authenticatedUserId(req);
    if (!userId) {
      redirectTo(res, "/login");
      return;
    }

    if (url === "/api/check-credentials") {
      handleApiCheckCredentials(req, res);
    } else if (url === "/api/user") {
      handleApiUserInfo(req, res);
    } else if (url === "/api/calendar/providers") {
      handleApiCalendarProviders(req, res);
    } else if (url.startsWith("/api/calendar/events/") && req.method === "GET") {
      const eventId = parseInt(url.replace("/api/calendar/events/", ""), 10);
      if (Number.isNaN(eventId)) {
        sendJson(res, 400, { error: "Invalid event ID." });
      } else {
        handleApiCalendarEventById(req, res, eventId);
      }
    } else if (url.startsWith("/api/calendar/events") && req.method === "GET") {
      handleApiCalendarEvents(req, res);
    } else if (url === "/api/calendar/upcoming" && req.method === "GET") {
      handleApiCalendarUpcoming(req, res);
    } else if (url === "/api/calendar/sync" && req.method === "POST") {
      handleApiCalendarSync(req, res);
    } else if (url === "/api/calendar/sync-status" && req.method === "GET") {
      handleApiCalendarSyncStatus(req, res);
    } else if (url === "/" || url === "/home") {
      serveHomeHtml(req, res);
    } else if (url === "/filter" || url === "/index.html") {
      serveFilterHtml(req, res);
    } else if (url === "/mini") {
      serveMiniHtml(req, res);
    } else if (url === "/meeting") {
      serveMeetingHtml(req, res);
    } else if (url === "/calendar") {
      serveCalendarHtml(req, res);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const userId = authenticatedUserId(req);
    if (!userId) {
      ws.close(4401, "Unauthorized");
      return;
    }

    wsClient = ws;

    ws.on("message", (data) => {
      handleMessage(data.toString());
    });

    ws.on("close", () => {
      console.log("WebSocket closed");
      stopAudioCapture();
      wsClient = null;
    });
  });

  server.listen(PORT, () => {
    console.log(`Voice Filter UI running at http://localhost:${PORT}`);
    if (openBrowser) {
      console.log("Opening browser...");
      open(`http://localhost:${PORT}`);
    }
  });

  process.on("SIGINT", () => {
    stopAudioCapture();
    server.close();
    process.exit(0);
  });
}
