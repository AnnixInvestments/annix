import { findRealMicrophone } from "../audio/capture.js";
import { findVBCableDevice } from "../audio/output.js";
import { loadProfile, loadSettings } from "../config/settings.js";
import { VoiceFilter, type VoiceFilterStatus } from "../index.js";
import type { VerificationResult } from "../verification/verify.js";

let voiceFilter: VoiceFilter | null = null;

function hasProfile(): boolean {
  const settings = loadSettings();
  if (settings.speakerId) {
    const profile = loadProfile(settings.speakerId);
    return profile !== null;
  }
  return false;
}

async function startFilter(): Promise<boolean> {
  const settings = loadSettings();
  const vbCableId = findVBCableDevice();

  if (vbCableId === null) {
    console.error("ERROR: VB-Cable not found. Please install VB-Cable.");
    return false;
  }

  const realMic = findRealMicrophone();
  const inputDeviceId = settings.inputDeviceId ?? realMic?.id;

  console.log("=== Annix Voice Filter (Background Mode) ===");
  console.log("");
  console.log("Configuration:");
  console.log("  Input:", realMic?.name ?? "default");
  console.log("  Output: VB-Cable (ID:", vbCableId, ")");
  console.log("  Speaker:", settings.speakerId ?? "none (passthrough)");
  console.log("");

  voiceFilter = new VoiceFilter({
    inputDeviceId,
    outputDeviceId: vbCableId,
    speakerId: settings.speakerId ?? undefined,
    failOpen: false,
    verificationThreshold: 0.75,
    silenceTimeoutMs: 300,
    vadThreshold: 0.01,
  });

  voiceFilter.on("started", (_status: VoiceFilterStatus) => {
    console.log("Voice filter STARTED");
    console.log("");
    console.log("The filter is now running in the background.");
    console.log("Other apps should use 'VB-Cable' as their microphone input.");
    console.log("");
    console.log("Press Ctrl+C to stop.");
    console.log("");
  });

  voiceFilter.on("verification", (result: VerificationResult) => {
    const confidence = (result.confidence * 100).toFixed(1);
    if (result.decision === "authorized") {
      console.log(`[VERIFIED] Speaker authorized (${confidence}%)`);
    } else if (result.decision === "unauthorized") {
      console.log(`[BLOCKED] Unauthorized speaker (${confidence}%)`);
    }
  });

  voiceFilter.on("muted", () => {
    console.log("[MUTED] Audio muted - unauthorized speaker detected");
  });

  voiceFilter.on("unmuted", () => {
    console.log("[UNMUTED] Audio restored - speaker verified");
  });

  voiceFilter.on("error", (error: Error) => {
    console.error("[ERROR]", error.message);
  });

  try {
    await voiceFilter.start();
    return true;
  } catch (error) {
    console.error("Failed to start:", (error as Error).message);
    return false;
  }
}

export async function runBackground(): Promise<void> {
  if (!hasProfile()) {
    console.error("ERROR: No voice profile found.");
    console.error("Please run 'pnpm run enroll:gui' first to enroll your voice.");
    process.exit(1);
  }

  const success = await startFilter();
  if (!success) {
    process.exit(1);
  }

  process.on("SIGINT", () => {
    console.log("");
    console.log("Stopping voice filter...");
    if (voiceFilter) {
      voiceFilter.stop();
    }
    console.log("Voice filter stopped.");
    process.exit(0);
  });

  await new Promise(() => {});
}

runBackground();
