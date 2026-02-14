import { createInterface } from "node:readline";
import ora from "ora";
import { type AudioDevice, listInputDevices } from "../audio/capture.js";
import { loadSettings, updateSettings } from "../config/settings.js";
import { type EnrollmentResult, EnrollmentSession } from "../verification/enrollment.js";

interface EnrollOptions {
  deviceId?: number;
  speakerId?: string;
  duration?: number;
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

export async function enrollCommand(options: EnrollOptions): Promise<void> {
  console.log("\n=== Voice Enrollment ===\n");
  console.log("This will record your voice to create a speaker profile.");
  console.log("You need to speak for at least 10 seconds of actual speech.\n");

  const settings = loadSettings();
  const deviceId = options.deviceId ?? settings.inputDeviceId ?? (await selectInputDevice());
  const speakerId =
    (options.speakerId ?? (await prompt("Enter speaker ID [default]: "))) || "default";
  const duration = options.duration ?? 10000;

  console.log(`\nUsing device ID: ${deviceId}`);
  console.log(`Speaker ID: ${speakerId}`);
  console.log(`Required speech duration: ${duration / 1000} seconds\n`);

  const confirmAnswer = await prompt("Ready to start recording? [Y/n]: ");
  if (confirmAnswer.toLowerCase() === "n") {
    console.log("Enrollment cancelled.");
    return;
  }

  console.log("\n--- Recording ---");
  console.log("Speak clearly and continuously. Read a book, describe your day, or count numbers.");
  console.log("Progress will be shown as you speak.\n");

  const domainId = settings.awsVoiceIdDomainId ?? "local";

  const session = new EnrollmentSession({
    speakerId,
    domainId,
    minSpeechDuration: duration,
    inputDeviceId: deviceId,
    sampleRate: 16000,
  });

  const spinner = ora("Waiting for speech...").start();

  let lastProgress = 0;

  session.on(
    "progress",
    (progress: {
      speechDurationMs: number;
      requiredMs: number;
      percentComplete: number;
      isSpeech: boolean;
    }) => {
      const percent = Math.floor(progress.percentComplete);
      if (percent > lastProgress) {
        lastProgress = percent;
        const progressBar =
          "█".repeat(Math.floor(percent / 5)) + "░".repeat(20 - Math.floor(percent / 5));
        spinner.text = `Recording: [${progressBar}] ${percent}% (${(progress.speechDurationMs / 1000).toFixed(1)}s / ${(progress.requiredMs / 1000).toFixed(1)}s)`;

        if (progress.isSpeech) {
          spinner.color = "green";
        } else {
          spinner.color = "yellow";
        }
      }
    },
  );

  session.on("completed", (result: EnrollmentResult) => {
    spinner.succeed("Enrollment complete!");
    console.log("\nSpeaker profile created:");
    console.log(`  Speaker ID: ${result.speakerId}`);
    console.log(`  Audio file: ${result.audioFilePath}`);
    console.log(`  Speech duration: ${(result.speechDurationMs / 1000).toFixed(1)} seconds`);
    console.log(`  Profile stored at: ${result.profile.enrolledAt}`);

    updateSettings({
      speakerId: result.speakerId,
      inputDeviceId: deviceId,
    });

    console.log("\nEnrollment saved. You can now run 'voice-filter start' to begin filtering.\n");
  });

  session.on("error", (error: Error) => {
    spinner.fail(`Enrollment failed: ${error.message}`);
    console.error(error);
  });

  process.on("SIGINT", () => {
    session.cancel();
    spinner.warn("Enrollment cancelled by user");
    process.exit(0);
  });

  try {
    await session.start();
  } catch (error) {
    spinner.fail(`Failed to start enrollment: ${(error as Error).message}`);
    console.error(error);
  }
}
