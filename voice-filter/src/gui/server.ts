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
  createUser,
  findUserByEmail,
  initDatabase,
  oauthTokens,
  verifyPassword,
} from "../auth/database.js";
import { extractTokenFromCookie, signToken, verifyToken } from "../auth/jwt.js";
import { loadProfile, loadSettings, updateSettings } from "../config/settings.js";
import { VoiceFilter, type VoiceFilterStatus } from "../index.js";
import { MeetingSession } from "../meeting/MeetingSession.js";
import type { MeetingAttendee, MeetingExport, TranscriptEntry } from "../meeting/types.js";
import { EnrollmentSession } from "../verification/enrollment.js";
import type { VerificationResult } from "../verification/verify.js";

const PORT = 47823;

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
  res.setHeader("Set-Cookie", `vf_token=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800`);
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
    if (!user) {
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

    const userId = authenticatedUserId(req);
    if (!userId) {
      redirectTo(res, "/login");
      return;
    }

    if (url === "/api/check-credentials") {
      handleApiCheckCredentials(req, res);
    } else if (url === "/" || url === "/home") {
      serveHomeHtml(req, res);
    } else if (url === "/filter" || url === "/index.html") {
      serveFilterHtml(req, res);
    } else if (url === "/mini") {
      serveMiniHtml(req, res);
    } else if (url === "/meeting") {
      serveMeetingHtml(req, res);
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
