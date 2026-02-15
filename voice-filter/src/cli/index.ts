#!/usr/bin/env node

import { Command } from "commander";
import { devicesCommand } from "./devices.js";
import { enrollCommand } from "./enroll.js";
import { runCommand } from "./run.js";
import { testMicCommand } from "./test-mic.js";

const program = new Command();

program
  .name("voice-filter")
  .description("Voice recognition filter using speaker verification")
  .version("1.0.0");

program
  .command("devices")
  .description("List available audio input and output devices")
  .action(devicesCommand);

program
  .command("test-mic")
  .description("Test your microphone with a live volume meter")
  .option("-d, --device-id <id>", "Input device ID", parseInt)
  .option("-a, --auto", "Auto-detect microphone")
  .action(testMicCommand);

program
  .command("enroll")
  .description("Enroll your voice for speaker verification")
  .option("-d, --device-id <id>", "Input device ID", parseInt)
  .option("-s, --speaker-id <id>", "Speaker identifier")
  .option("-t, --duration <ms>", "Required speech duration in milliseconds", parseInt)
  .option("-a, --auto", "Auto-detect microphone and use defaults (no prompts)")
  .action(enrollCommand);

program
  .command("start")
  .description("Start the voice filter")
  .option("-i, --input-device <id>", "Input device ID", parseInt)
  .option("-o, --output-device <id>", "Output device ID (VB-Cable)", parseInt)
  .option("-s, --speaker-id <id>", "Speaker identifier for verification")
  .option("--fail-open", "Pass audio when verification fails (default)")
  .option("--fail-closed", "Mute audio when verification fails")
  .action((options) => {
    const failOpen = options.failClosed ? false : (options.failOpen ?? true);
    runCommand({
      inputDevice: options.inputDevice,
      outputDevice: options.outputDevice,
      speakerId: options.speakerId,
      failOpen,
    });
  });

program
  .command("config")
  .description("Show current configuration")
  .action(async () => {
    const { loadSettings } = await import("../config/settings.js");
    const settings = loadSettings();
    console.log("\n=== Voice Filter Configuration ===\n");
    console.log(JSON.stringify(settings, null, 2));
    console.log("");
  });

program.parse(process.argv);
