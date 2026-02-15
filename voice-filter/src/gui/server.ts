import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import open from "open";
import { type WebSocket, WebSocketServer } from "ws";
import { AudioCapture, findRealMicrophone, listInputDevices } from "../audio/capture.js";
import { findVBCableDevice } from "../audio/output.js";
import { loadProfile, loadSettings, updateSettings } from "../config/settings.js";
import { VoiceFilter, type VoiceFilterStatus } from "../index.js";
import { EnrollmentSession } from "../verification/enrollment.js";
import type { VerificationResult } from "../verification/verify.js";

const PORT = 47823;

let audioCapture: AudioCapture | null = null;
let enrollmentSession: EnrollmentSession | null = null;
let voiceFilter: VoiceFilter | null = null;
let detectedDevice: { id: number; name: string } | null = null;
let wsClient: WebSocket | null = null;

function serveHtml(_req: IncomingMessage, res: ServerResponse): void {
  const htmlPath = join(import.meta.dirname, "index.html");
  const html = readFileSync(htmlPath, "utf-8");
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
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
    failOpen: true,
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

function checkExistingProfile(): boolean {
  const settings = loadSettings();
  if (settings.speakerId) {
    const profile = loadProfile(settings.speakerId);
    return profile !== null;
  }
  return false;
}

function handleMessage(message: string): void {
  try {
    const { type } = JSON.parse(message);

    if (type === "ready") {
      if (checkExistingProfile()) {
        sendMessage("has-profile", true);
      }
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
    } else if (type === "start-meeting") {
      console.log("Starting meeting mode...");
      sendMessage("meeting-started", true);
    } else if (type === "start-recording") {
      console.log("Starting recording...");
      sendMessage("recording-started", true);
    } else if (type === "close-window") {
      stopAudioCapture();
      stopVoiceFilter();
      process.exit(0);
    }
  } catch {
    console.error("Invalid message");
  }
}

export async function startGuiServer(): Promise<void> {
  const server = createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
      serveHtml(req, res);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
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
    console.log("Opening browser...");
    open(`http://localhost:${PORT}`);
  });

  process.on("SIGINT", () => {
    stopAudioCapture();
    server.close();
    process.exit(0);
  });
}
