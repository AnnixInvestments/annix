import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { VoiceActivityDetector } from "../audio/vad.js";
import { TeamsAudioAdapter, type TeamsAudioChunk } from "./adapters/TeamsAudioAdapter.js";
import { SpeakerIdentifier } from "./SpeakerIdentifier.js";
import { Transcriber } from "./Transcriber.js";
import type {
  MeetingAttendee,
  MeetingConfig,
  MeetingExport,
  MeetingSessionData,
  MeetingStatus,
  TranscriptEntry,
} from "./types.js";

export interface RemoteMeetingSessionOptions {
  title: string;
  openaiApiKey?: string;
  config?: Partial<MeetingConfig>;
  meetingUrl?: string;
  platform?: "teams" | "zoom" | "google_meet";
}

export interface RemoteParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
  leftAt: string | null;
}

const SAMPLE_RATE = 16000;
const AUTO_SAVE_INTERVAL_MS = 30000;

export class RemoteMeetingSession extends EventEmitter {
  private readonly sessionId: string;
  private readonly meetingDir: string;
  private readonly config: MeetingConfig;
  private readonly openaiApiKey?: string;
  private readonly platform: string;

  private session: MeetingSessionData;
  private adapter: TeamsAudioAdapter | null = null;
  private identifier: SpeakerIdentifier | null = null;
  private transcriber: Transcriber | null = null;
  private vad: VoiceActivityDetector | null = null;
  private transcript: TranscriptEntry[] = [];
  private audioBuffer: Buffer[] = [];
  private recordingBuffer: Buffer[] = [];
  private lastSpeaker: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private remoteParticipants: Map<string, RemoteParticipant> = new Map();
  private currentSpeakerContext: { speakerId: string | null; speakerName: string } | null = null;

  constructor(options: RemoteMeetingSessionOptions) {
    super();
    this.sessionId = randomUUID();
    this.meetingDir = join(homedir(), ".voice-filter", "remote-meetings", this.sessionId);
    this.openaiApiKey = options.openaiApiKey;
    this.platform = options.platform ?? "teams";

    this.config = {
      speakerIdentificationThreshold: 0.65,
      minEnrollmentDurationMs: 10000,
      transcriptionEnabled: true,
      ...options.config,
    };

    this.session = {
      id: this.sessionId,
      title: options.title,
      attendees: [],
      status: "setup" as MeetingStatus,
      startedAt: null,
      endedAt: null,
      currentAttendeeIndex: 0,
      calendarEventId: null,
      calendarProvider: null,
      scheduledStartTime: null,
      scheduledEndTime: null,
      meetingUrl: options.meetingUrl ?? null,
    };

    this.ensureMeetingDir();
    this.saveSession();
  }

  private ensureMeetingDir(): void {
    if (!existsSync(this.meetingDir)) {
      mkdirSync(this.meetingDir, { recursive: true });
    }
    const audioDir = join(this.meetingDir, "audio");
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }
  }

  private saveSession(): void {
    const sessionPath = join(this.meetingDir, "session.json");
    writeFileSync(sessionPath, JSON.stringify(this.session, null, 2));
  }

  private saveTranscript(): void {
    const transcriptPath = join(this.meetingDir, "transcript.json");
    writeFileSync(transcriptPath, JSON.stringify(this.transcript, null, 2));
  }

  async startMeeting(callId: string): Promise<void> {
    this.adapter = new TeamsAudioAdapter({
      sampleRate: SAMPLE_RATE,
      channels: 1,
    });

    this.identifier = new SpeakerIdentifier({
      threshold: this.config.speakerIdentificationThreshold,
    });

    if (this.openaiApiKey && this.config.transcriptionEnabled) {
      this.transcriber = new Transcriber({
        openaiApiKey: this.openaiApiKey,
      });
      this.transcriber.on("transcribed", (entry: TranscriptEntry) => {
        this.transcript.push(entry);
        this.saveTranscript();
        this.emit("transcript-entry", entry);
      });
      this.transcriber.on("error", (error) => {
        this.emit("transcription-error", error);
      });
    }

    this.vad = new VoiceActivityDetector({
      sampleRate: SAMPLE_RATE,
      threshold: 0.005,
    });
    await this.vad.initialize();

    this.adapter.on("audio", async (samples: Float32Array, buffer: Buffer, meta) => {
      if (this.session.status !== "active") {
        return;
      }

      this.currentSpeakerContext = {
        speakerId: meta.speakerId ?? null,
        speakerName: meta.speakerName ?? "Unknown",
      };

      this.recordingBuffer.push(Buffer.from(buffer));
      this.emitVolumeLevel(samples);

      const probability = await this.vad!.process(samples);
      const isSpeech = probability >= 0.1;

      if (isSpeech) {
        this.audioBuffer.push(Buffer.from(buffer));
        const maxBufferSize = 128000;
        while (this.bufferSize() > maxBufferSize) {
          this.audioBuffer.shift();
        }
      } else if (this.audioBuffer.length > 0) {
        await this.processSpeechSegment();
        this.audioBuffer = [];
      }
    });

    this.adapter.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.adapter.connect(callId);

    this.session.status = "active" as MeetingStatus;
    this.session.startedAt = new Date().toISOString();
    this.saveSession();

    this.autoSaveTimer = setInterval(() => {
      this.saveTranscript();
      this.saveSession();
    }, AUTO_SAVE_INTERVAL_MS);

    this.emit("meeting-started", this.session);
  }

  processRemoteAudio(chunk: TeamsAudioChunk): void {
    if (!this.adapter || !this.adapter.connected()) {
      return;
    }

    this.adapter.processIncomingAudio(chunk);
  }

  addRemoteParticipant(participant: RemoteParticipant): void {
    this.remoteParticipants.set(participant.id, participant);

    const attendee: MeetingAttendee = {
      id: participant.id,
      name: participant.displayName,
      title: "Remote Participant",
      email: null,
      enrolledAt: participant.joinedAt,
      profilePath: null,
      matchedProfileId: null,
    };

    const existing = this.session.attendees.find((a) => a.id === participant.id);
    if (!existing) {
      this.session.attendees.push(attendee);
      this.saveSession();
      this.emit("attendee-added", attendee);
    }
  }

  removeRemoteParticipant(participantId: string): void {
    const participant = this.remoteParticipants.get(participantId);
    if (participant) {
      participant.leftAt = new Date().toISOString();
      this.emit("attendee-left", { id: participantId, displayName: participant.displayName });
    }
  }

  private bufferSize(): number {
    return this.audioBuffer.reduce((sum, b) => sum + b.length, 0);
  }

  private emitVolumeLevel(samples: Float32Array): void {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    const avg = sum / samples.length;
    const level = Math.min(1, avg * 10);
    this.emit("volume-level", level);
  }

  private async processSpeechSegment(): Promise<void> {
    const audioData = Buffer.concat(this.audioBuffer);

    if (audioData.length < SAMPLE_RATE * 2 * 0.5) {
      return;
    }

    const speakerContext = this.currentSpeakerContext;
    const speaker = {
      speakerId: speakerContext?.speakerId ?? null,
      speakerName: speakerContext?.speakerName ?? "Unknown",
      confidence: speakerContext?.speakerId ? 0.9 : 0.5,
      timestamp: new Date().toISOString(),
    };

    this.emit("speaker-identified", speaker);

    if (speaker.speakerId !== this.lastSpeaker) {
      this.lastSpeaker = speaker.speakerId;
      this.emit("speaker-changed", speaker);
    }

    if (this.transcriber && audioData.length >= SAMPLE_RATE * 2) {
      await this.transcriber.transcribe(audioData, speaker);
    }
  }

  pauseMeeting(): void {
    if (this.session.status !== "active") {
      return;
    }

    this.session.status = "paused" as MeetingStatus;
    this.saveSession();
    this.emit("meeting-paused");
  }

  resumeMeeting(): void {
    if (this.session.status !== "paused") {
      return;
    }

    this.session.status = "active" as MeetingStatus;
    this.saveSession();
    this.emit("meeting-resumed");
  }

  endMeeting(): MeetingExport {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }

    if (this.vad) {
      this.vad.dispose();
      this.vad = null;
    }

    if (this.identifier) {
      this.identifier.dispose();
      this.identifier = null;
    }

    if (this.transcriber) {
      this.transcriber.dispose();
      this.transcriber = null;
    }

    this.session.status = "ended" as MeetingStatus;
    this.session.endedAt = new Date().toISOString();
    this.saveSession();
    this.saveTranscript();

    if (this.recordingBuffer.length > 0) {
      this.saveFullRecording();
    }

    const duration =
      this.session.startedAt && this.session.endedAt
        ? new Date(this.session.endedAt).getTime() - new Date(this.session.startedAt).getTime()
        : 0;

    const exportData: MeetingExport = {
      session: { ...this.session },
      transcript: [...this.transcript],
      duration,
    };

    this.emit("meeting-ended", exportData);
    return exportData;
  }

  private saveFullRecording(): void {
    const recordingPath = join(this.meetingDir, "recording.wav");
    const pcmData = Buffer.concat(this.recordingBuffer);

    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const headerSize = 44;
    const fileSize = headerSize + dataSize - 8;

    const header = Buffer.alloc(headerSize);
    header.write("RIFF", 0);
    header.writeUInt32LE(fileSize, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(SAMPLE_RATE, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);

    const wavBuffer = Buffer.concat([header, pcmData]);
    writeFileSync(recordingPath, wavBuffer);
  }

  exportTranscript(format: "txt" | "json"): string {
    if (format === "json") {
      return JSON.stringify(
        {
          session: this.session,
          transcript: this.transcript,
        },
        null,
        2,
      );
    }

    const lines: string[] = [
      `Meeting: ${this.session.title}`,
      `Date: ${this.session.startedAt ?? "N/A"}`,
      `Platform: ${this.platform}`,
      `Participants: ${Array.from(this.remoteParticipants.values())
        .map((p) => p.displayName)
        .join(", ")}`,
      "",
      "Transcript:",
      "---",
      "",
    ];

    for (const entry of this.transcript) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      lines.push(`[${time}] ${entry.speakerName}: ${entry.text}`);
    }

    return lines.join("\n");
  }

  data(): MeetingSessionData {
    return { ...this.session };
  }

  transcriptData(): TranscriptEntry[] {
    return [...this.transcript];
  }

  participants(): RemoteParticipant[] {
    return Array.from(this.remoteParticipants.values());
  }

  meetingDir_(): string {
    return this.meetingDir;
  }

  sessionId_(): string {
    return this.sessionId;
  }
}
