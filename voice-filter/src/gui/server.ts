import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import open from "open";
import { type WebSocket, WebSocketServer } from "ws";
import { AudioCapture, findRealMicrophone, listInputDevices } from "../audio/capture.js";
import { loadSettings, updateSettings } from "../config/settings.js";
import { EnrollmentSession } from "../verification/enrollment.js";

const PORT = 47823;

let audioCapture: AudioCapture | null = null;
let enrollmentSession: EnrollmentSession | null = null;
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
    sendMessage("enrollment-error", { message: err.message });
  });

  audioCapture.start();
}

function startEnrollment(): void {
  if (!detectedDevice) {
    return;
  }

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

  enrollmentSession.on("completed", (result) => {
    updateSettings({
      speakerId: result.speakerId,
      inputDeviceId: detectedDevice!.id,
    });
    sendMessage("enrollment-complete", result);
  });

  enrollmentSession.on("error", (error: Error) => {
    sendMessage("enrollment-error", { message: error.message });
  });

  enrollmentSession.start();
}

function cancelEnrollment(): void {
  if (enrollmentSession) {
    enrollmentSession.cancel();
    enrollmentSession = null;
  }
  startMicTest();
}

function handleMessage(message: string): void {
  try {
    const { type } = JSON.parse(message);

    if (type === "ready") {
      startMicTest();
    } else if (type === "start-enrollment") {
      startEnrollment();
    } else if (type === "cancel-enrollment") {
      cancelEnrollment();
    } else if (type === "restart-mic-test") {
      startMicTest();
    } else if (type === "close-window") {
      stopAudioCapture();
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
