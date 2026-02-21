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
  openaiApiKey: string | null;
  speakerIdentificationThreshold: number;
  meetingSavePath: string | null;
  jwtSecret: string | null;
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
  openaiApiKey: null,
  speakerIdentificationThreshold: 0.65,
  meetingSavePath: null,
  jwtSecret: null,
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
  email: string | null;
  name: string | null;
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

export function allProfiles(): SpeakerProfile[] {
  const dir = profilesPath();
  if (!existsSync(dir)) {
    return [];
  }
  const { readdirSync } = require("node:fs");
  const files = readdirSync(dir) as string[];
  return files
    .filter((f: string) => f.endsWith(".json"))
    .map((f: string) => {
      const content = readFileSync(join(dir, f), "utf-8");
      return JSON.parse(content) as SpeakerProfile;
    });
}

export function profileByEmail(email: string): SpeakerProfile | null {
  const profiles = allProfiles();
  const normalizedEmail = email.toLowerCase().trim();
  return profiles.find((p) => p.email?.toLowerCase().trim() === normalizedEmail) ?? null;
}

export function profilesByEmails(emails: string[]): Map<string, SpeakerProfile> {
  const profiles = allProfiles();
  const result = new Map<string, SpeakerProfile>();
  const normalizedEmails = emails.map((e) => e.toLowerCase().trim());

  for (const profile of profiles) {
    if (profile.email) {
      const normalizedProfileEmail = profile.email.toLowerCase().trim();
      if (normalizedEmails.includes(normalizedProfileEmail)) {
        result.set(normalizedProfileEmail, profile);
      }
    }
  }

  return result;
}
