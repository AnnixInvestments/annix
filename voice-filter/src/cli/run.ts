import ora from "ora";
import { listInputDevices, listOutputDevices } from "../audio/capture.js";
import { findVBCableDevice } from "../audio/output.js";
import type { SpeechState } from "../audio/vad.js";
import { loadSettings, updateSettings } from "../config/settings.js";
import { VoiceFilter, type VoiceFilterStatus } from "../index.js";
import type { VerificationDecision, VerificationResult } from "../verification/verify.js";

interface RunOptions {
  inputDevice?: number;
  outputDevice?: number;
  speakerId?: string;
  failOpen?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
  console.log("\n=== Voice Filter ===\n");

  const settings = loadSettings();
  const inputDeviceId = options.inputDevice ?? settings.inputDeviceId ?? undefined;
  const outputDeviceId =
    options.outputDevice ?? settings.outputDeviceId ?? findVBCableDevice() ?? undefined;
  const speakerId = options.speakerId ?? settings.speakerId ?? undefined;
  const failOpen = options.failOpen ?? settings.failOpen;

  if (outputDeviceId === undefined) {
    console.log("ERROR: No output device configured and VB-Cable not detected.");
    console.log("Please install VB-Cable from https://vb-audio.com/Cable/");
    console.log("Or specify an output device with --output-device <id>");
    console.log("\nRun 'voice-filter devices' to see available devices.\n");
    return;
  }

  const inputDevices = listInputDevices();
  const outputDevices = listOutputDevices();

  const inputDevice = inputDevices.find((d) => d.id === inputDeviceId);
  const outputDevice = outputDevices.find((d) => d.id === outputDeviceId);

  console.log("Configuration:");
  console.log(
    `  Input:  ${inputDevice ? `[${inputDevice.id}] ${inputDevice.name}` : "[Default microphone]"}`,
  );
  console.log(
    `  Output: ${outputDevice ? `[${outputDevice.id}] ${outputDevice.name}` : `[${outputDeviceId}] Unknown`}`,
  );
  console.log(`  Speaker: ${speakerId ?? "None (passthrough mode)"}`);
  console.log(
    `  Fail mode: ${failOpen ? "Open (pass audio when unverified)" : "Closed (mute when unverified)"}`,
  );
  console.log("");

  const filter = new VoiceFilter({
    inputDeviceId,
    outputDeviceId,
    speakerId,
    failOpen,
  });

  const spinner = ora("Starting voice filter...").start();

  const currentStatus: {
    speechState: SpeechState;
    verificationDecision: VerificationDecision;
    muted: boolean;
  } = {
    speechState: "silence",
    verificationDecision: "pending",
    muted: false,
  };

  function updateSpinner(): void {
    const speechIndicator = currentStatus.speechState === "speech" ? "🗣️" : "🤫";
    const verificationIndicator =
      currentStatus.verificationDecision === "authorized"
        ? "✓"
        : currentStatus.verificationDecision === "unauthorized"
          ? "✗"
          : "?";
    const muteIndicator = currentStatus.muted ? "[MUTED]" : "[LIVE]";

    spinner.text = `${speechIndicator} ${muteIndicator} Speaker: ${verificationIndicator} ${currentStatus.verificationDecision}`;

    if (currentStatus.muted) {
      spinner.color = "red";
    } else if (currentStatus.verificationDecision === "authorized") {
      spinner.color = "green";
    } else {
      spinner.color = "yellow";
    }
  }

  filter.on("started", (status: VoiceFilterStatus) => {
    spinner.succeed("Voice filter started");
    console.log("\nFilter is running. Press Ctrl+C to stop.\n");
    spinner.start("Listening...");
  });

  filter.on("speechStateChange", (state: SpeechState) => {
    currentStatus.speechState = state;
    updateSpinner();
  });

  filter.on("verification", (result: VerificationResult) => {
    currentStatus.verificationDecision = result.decision;
    updateSpinner();

    if (result.decision === "authorized") {
      console.log(`\n  ✓ Speaker verified (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    }
  });

  filter.on("unauthorized", (confidence: number) => {
    console.log(
      `\n  ✗ Unauthorized speaker detected (confidence: ${(confidence * 100).toFixed(1)}%)`,
    );
  });

  filter.on("muted", () => {
    currentStatus.muted = true;
    updateSpinner();
  });

  filter.on("unmuted", () => {
    currentStatus.muted = false;
    updateSpinner();
  });

  filter.on("sessionExpired", () => {
    currentStatus.verificationDecision = "pending";
    updateSpinner();
    console.log("\n  Session expired, re-verification required");
  });

  filter.on("warning", (message: string) => {
    console.log(`\n  ⚠ Warning: ${message}`);
  });

  filter.on("error", (error: Error) => {
    spinner.fail(`Error: ${error.message}`);
    console.error(error);
  });

  process.on("SIGINT", () => {
    spinner.stop();
    console.log("\n\nStopping voice filter...");
    filter.stop();
    console.log("Voice filter stopped.\n");
    process.exit(0);
  });

  try {
    await filter.start();

    updateSettings({
      inputDeviceId,
      outputDeviceId,
      speakerId,
      failOpen,
    });

    await new Promise(() => {});
  } catch (error) {
    spinner.fail(`Failed to start: ${(error as Error).message}`);
    console.error(error);
  }
}
