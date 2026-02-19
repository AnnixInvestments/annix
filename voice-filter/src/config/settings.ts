import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface VoiceFilterSettings {
  inputDeviceId: number | null;
  outputDeviceId: number | null;
  awsRegion: string;
  awsVoiceIdDomainId: string | null;
  speakerId: string | null;
  vadThreshold: number;
  silenceTimeout: number;
  verificationThreshold: number;
  failOpen: boolean;
}

const DEFAULT_SETTINGS: VoiceFilterSettings = {
  inputDeviceId: null,
  outputDeviceId: null,
  awsRegion: "us-east-1",
  awsVoiceIdDomainId: null,
  speakerId: null,
  vadThreshold: 0.01,
  silenceTimeout: 2000,
  verificationThreshold: 0.7,
  failOpen: true,
};

function configPath(): string {
  return join(homedir(), ".voice-filter", "config.json");
}

function profilesPath(): string {
  return join(homedir(), ".voice-filter", "profiles");
}

export function loadSettings(): VoiceFilterSettings {
  const path = configPath();
  if (!existsSync(path)) {
    return { ...DEFAULT_SETTINGS };
  }
  const content = readFileSync(path, "utf-8");
  const loaded = JSON.parse(content) as Partial<VoiceFilterSettings>;
  return { ...DEFAULT_SETTINGS, ...loaded };
}

export function saveSettings(settings: VoiceFilterSettings): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2));
}

export function updateSettings(updates: Partial<VoiceFilterSettings>): VoiceFilterSettings {
  const current = loadSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
}

export function ensureProfilesDir(): string {
  const path = profilesPath();
  mkdirSync(path, { recursive: true });
  return path;
}

export function profilePath(profileId: string): string {
  return join(profilesPath(), `${profileId}.json`);
}

export interface SpeakerProfile {
  speakerId: string;
  enrolledAt: string;
  awsDomainId: string;
  awsSpeakerId: string;
}

export function saveProfile(profile: SpeakerProfile): void {
  ensureProfilesDir();
  writeFileSync(profilePath(profile.speakerId), JSON.stringify(profile, null, 2));
}

export function loadProfile(speakerId: string): SpeakerProfile | null {
  const path = profilePath(speakerId);
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf-8")) as SpeakerProfile;
}
