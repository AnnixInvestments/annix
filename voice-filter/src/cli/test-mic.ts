import { createInterface } from "node:readline";
import {
  AudioCapture,
  type AudioDevice,
  findRealMicrophone,
  listInputDevices,
} from "../audio/capture.js";
import { loadSettings } from "../config/settings.js";

interface TestMicOptions {
  deviceId?: number;
  auto?: boolean;
}

function renderVolumeBar(level: number): string {
  const barWidth = 30;
  const filled = Math.round(level * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const percentage = Math.round(level * 100);
  return `[${bar}] ${percentage.toString().padStart(3)}%`;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function selectInputDevice(): Promise<number> {
  const devices = listInputDevices();

  console.log("\nAvailable input devices:");
  devices.forEach((device: AudioDevice) => {
    console.log(`  [${device.id}] ${device.name}`);
  });

  const answer = await prompt("\nSelect input device ID [0]: ");
  const deviceId = answer === "" ? 0 : parseInt(answer, 10);

  if (Number.isNaN(deviceId) || !devices.some((d) => d.id === deviceId)) {
    console.log("Invalid device ID, using default (0)");
    return 0;
  }

  return deviceId;
}

export async function testMicCommand(options: TestMicOptions): Promise<void> {
  console.log("\n=== Microphone Test ===\n");

  const settings = loadSettings();
  const autoMode = options.auto === true;

  let deviceId: number;
  if (options.deviceId !== undefined) {
    deviceId = options.deviceId;
  } else if (settings.inputDeviceId !== null) {
    deviceId = settings.inputDeviceId;
  } else if (autoMode) {
    const realMic = findRealMicrophone();
    if (realMic) {
      deviceId = realMic.id;
      console.log(`Auto-detected microphone: [${realMic.id}] ${realMic.name}`);
    } else {
      console.log("No microphone detected. Please connect a microphone and try again.");
      return;
    }
  } else {
    deviceId = await selectInputDevice();
  }

  console.log(`\nUsing device ID: ${deviceId}`);
  console.log("\nSpeak into your microphone. You should see the bar move.");
  console.log("Press Enter to stop the test.\n");

  const capture = new AudioCapture({ deviceId, sampleRate: 16000, channels: 1 });

  let maxLevel = 0;

  capture.on("audio", (samples: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    const avg = sum / samples.length;
    const currentLevel = Math.min(1, avg * 10);
    maxLevel = Math.max(maxLevel, currentLevel);

    process.stdout.write(`\r  Volume: ${renderVolumeBar(currentLevel)}  `);
  });

  capture.on("error", (err: Error) => {
    console.error(`\nError: ${err.message}`);
  });

  capture.start();

  await new Promise<void>((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", () => {
      capture.stop();
      rl.close();
      resolve();
    });

    process.on("SIGINT", () => {
      capture.stop();
      rl.close();
      resolve();
    });
  });

  console.log("\n");

  if (maxLevel < 0.05) {
    console.log("Result: Very low audio levels detected.");
    console.log("Please check:");
    console.log("  - Microphone is connected and not muted");
    console.log("  - Correct device is selected");
    console.log("  - System volume/gain settings\n");
  } else if (maxLevel < 0.2) {
    console.log("Result: Low audio levels. Consider increasing microphone gain.\n");
  } else {
    console.log("Result: Microphone is working properly.\n");
  }
}
