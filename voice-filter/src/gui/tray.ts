import { readFileSync } from "node:fs";
import { join } from "node:path";
import SysTray from "systray2";
import { findRealMicrophone } from "../audio/capture.js";
import { findVBCableDevice } from "../audio/output.js";
import { loadProfile, loadSettings } from "../config/settings.js";
import { VoiceFilter, type VoiceFilterStatus } from "../index.js";
import type { VerificationResult } from "../verification/verify.js";

let voiceFilter: VoiceFilter | null = null;
let systray: SysTray | null = null;
let isFilterActive = false;

function createIcon(): string {
  try {
    const iconPath = join(import.meta.dirname, "icon.ico");
    const iconBuffer = readFileSync(iconPath);
    return iconBuffer.toString("base64");
  } catch {
    return "";
  }
}

function hasProfile(): boolean {
  const settings = loadSettings();
  if (settings.speakerId) {
    const profile = loadProfile(settings.speakerId);
    return profile !== null;
  }
  return false;
}

async function startFilter(): Promise<boolean> {
  if (voiceFilter?.isRunning()) {
    console.log("Voice filter already running");
    return true;
  }

  const settings = loadSettings();
  const vbCableId = findVBCableDevice();

  if (vbCableId === null) {
    console.error("VB-Cable not found. Please install VB-Cable.");
    return false;
  }

  const realMic = findRealMicrophone();
  const inputDeviceId = settings.inputDeviceId ?? realMic?.id;

  console.log("Starting voice filter...");
  console.log("  Input device:", realMic?.name ?? "default");
  console.log("  Output device: VB-Cable (ID:", vbCableId, ")");
  console.log("  Speaker ID:", settings.speakerId ?? "none");

  voiceFilter = new VoiceFilter({
    inputDeviceId,
    outputDeviceId: vbCableId,
    speakerId: settings.speakerId ?? undefined,
    failOpen: true,
  });

  voiceFilter.on("started", (status: VoiceFilterStatus) => {
    console.log("Voice filter started");
    isFilterActive = true;
    updateTrayMenu();
  });

  voiceFilter.on("verification", (result: VerificationResult) => {
    if (result.decision === "authorized") {
      console.log(`Speaker verified (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    } else if (result.decision === "unauthorized") {
      console.log(`Unauthorized speaker (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    }
  });

  voiceFilter.on("muted", () => {
    console.log("Audio muted - unauthorized speaker");
  });

  voiceFilter.on("unmuted", () => {
    console.log("Audio unmuted - speaker verified");
  });

  voiceFilter.on("error", (error: Error) => {
    console.error("Voice filter error:", error);
    isFilterActive = false;
    updateTrayMenu();
  });

  try {
    await voiceFilter.start();
    return true;
  } catch (error) {
    console.error("Failed to start voice filter:", error);
    voiceFilter = null;
    return false;
  }
}

function stopFilter(): void {
  if (voiceFilter) {
    console.log("Stopping voice filter...");
    voiceFilter.stop();
    voiceFilter = null;
    isFilterActive = false;
    updateTrayMenu();
  }
}

function updateTrayMenu(): void {
  if (!systray) {
    return;
  }

  const filterLabel = isFilterActive ? "Stop Filter" : "Start Filter";
  const statusLabel = isFilterActive ? "Status: Active" : "Status: Inactive";

  systray.sendAction({
    type: "update-menu",
    menu: createMenu(filterLabel, statusLabel),
  });
}

interface MenuItem {
  title: string;
  tooltip: string;
  checked: boolean;
  enabled: boolean;
  hidden?: boolean;
}

interface Menu {
  icon: string;
  title: string;
  tooltip: string;
  items: MenuItem[];
}

function createMenu(
  filterLabel: string = "Start Filter",
  statusLabel: string = "Status: Inactive",
): Menu {
  return {
    icon: createIcon(),
    title: "Annix Voice Filter",
    tooltip: "Annix Voice Filter",
    items: [
      {
        title: statusLabel,
        tooltip: "Current filter status",
        checked: false,
        enabled: false,
      },
      {
        title: filterLabel,
        tooltip: isFilterActive ? "Stop the voice filter" : "Start the voice filter",
        checked: false,
        enabled: hasProfile(),
      },
      {
        title: "Open Dashboard",
        tooltip: "Open the voice filter dashboard",
        checked: false,
        enabled: true,
      },
      {
        title: "Re-Enroll Voice",
        tooltip: "Update your voice profile",
        checked: false,
        enabled: true,
      },
      {
        title: "Exit",
        tooltip: "Exit the application",
        checked: false,
        enabled: true,
      },
    ],
  };
}

export async function startTray(): Promise<void> {
  console.log("Starting Annix Voice Filter system tray...");

  const profileExists = hasProfile();
  console.log("Voice profile exists:", profileExists);

  systray = new SysTray({
    menu: createMenu(),
    debug: false,
    copyDir: true,
  });

  systray.onClick((action) => {
    const index = action.seq_id;

    if (index === 1) {
      if (isFilterActive) {
        stopFilter();
      } else {
        startFilter();
      }
    } else if (index === 2) {
      console.log("Opening dashboard...");
      import("open").then((open) => {
        import("./server.js").then((server) => {
          server.startGuiServer();
        });
      });
    } else if (index === 3) {
      console.log("Opening enrollment...");
      import("./server.js").then((server) => {
        server.startGuiServer();
      });
    } else if (index === 4) {
      console.log("Exiting...");
      stopFilter();
      systray?.kill(false);
      process.exit(0);
    }
  });

  systray.onReady(() => {
    console.log("System tray ready");
    console.log("Right-click the tray icon to access the menu");

    if (profileExists) {
      console.log("Auto-starting voice filter...");
      startFilter();
    } else {
      console.log("No voice profile found. Please enroll first.");
    }
  });

  systray.onError((err) => {
    console.error("System tray error:", err);
  });

  process.on("SIGINT", () => {
    stopFilter();
    systray?.kill(false);
    process.exit(0);
  });
}
