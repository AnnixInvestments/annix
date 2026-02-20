import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AudioCapture, type AudioCaptureOptions } from "../audio/capture.js";
import { VoiceActivityDetector } from "../audio/vad.js";
import { MeetingEnrollment } from "./MeetingEnrollment.js";
import { SpeakerIdentifier } from "./SpeakerIdentifier.js";
import { Transcriber } from "./Transcriber.js";
import type {
  MeetingAttendee,
  MeetingConfig,
  MeetingExport,
  MeetingSessionData,
  TranscriptEntry,
} from "./types.js";

export interface MeetingSessionOptions {
  title: string;
  attendeeCount: number;
  inputDeviceId?: number;
  openaiApiKey?: string;
  config?: Partial<MeetingConfig>;
  calendarEventId?: number;
  calendarProvider?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  meetingUrl?: string;
}

const SAMPLE_RATE = 16000;
const AUTO_SAVE_INTERVAL_MS = 30000;

export class MeetingSession extends EventEmitter {
  private readonly sessionId: string;
  private readonly meetingDir: string;
  private readonly config: MeetingConfig;
  private readonly inputDeviceId?: number;
  private readonly openaiApiKey?: string;

  private session: MeetingSessionData;
  private enrollment: MeetingEnrollment | null = null;
  private identifier: SpeakerIdentifier | null = null;
  private transcriber: Transcriber | null = null;
  private capture: AudioCapture | null = null;
  private vad: VoiceActivityDetector | null = null;
  private transcript: TranscriptEntry[] = [];
  private audioBuffer: Buffer[] = [];
  private recordingBuffer: Buffer[] = [];
  private lastSpeaker: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(options: MeetingSessionOptions) {
    super();
    this.sessionId = randomUUID();
    this.meetingDir = join(homedir(), ".voice-filter", "meetings", this.sessionId);
    this.inputDeviceId = options.inputDeviceId;
    this.openaiApiKey = options.openaiApiKey;

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
      status: "setup",
      startedAt: null,
      endedAt: null,
      currentAttendeeIndex: 0,
      calendarEventId: options.calendarEventId ?? null,
      calendarProvider: options.calendarProvider ?? null,
      scheduledStartTime: options.scheduledStartTime ?? null,
      scheduledEndTime: options.scheduledEndTime ?? null,
      meetingUrl: options.meetingUrl ?? null,
    };

    this.ensureMeetingDir();
    this.saveSession();
  }

  private ensureMeetingDir(): void {
    if (!existsSync(this.meetingDir)) {
      mkdirSync(this.meetingDir, { recursive: true });
    }
    const attendeesDir = join(this.meetingDir, "attendees");
    if (!existsSync(attendeesDir)) {
      mkdirSync(attendeesDir, { recursive: true });
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

  addAttendee(name: string, title: string, options?: { isHost?: boolean }): MeetingAttendee {
    const attendee: MeetingAttendee = {
      id: randomUUID(),
      name,
      title,
      enrolledAt: options?.isHost ? new Date().toISOString() : null,
      profilePath: null,
    };

    this.session.attendees.push(attendee);
    this.saveSession();
    this.emit("attendee-added", attendee);
    return attendee;
  }

  removeAttendee(attendeeId: string): boolean {
    const index = this.session.attendees.findIndex((a) => a.id === attendeeId);
    if (index === -1) {
      return false;
    }

    const removed = this.session.attendees.splice(index, 1)[0];
    this.saveSession();
    this.emit("attendee-removed", removed);
    return true;
  }

  async startEnrollment(attendeeIndex: number): Promise<void> {
    if (attendeeIndex < 0 || attendeeIndex >= this.session.attendees.length) {
      throw new Error("Invalid attendee index");
    }

    const attendee = this.session.attendees[attendeeIndex];
    this.session.status = "enrolling";
    this.session.currentAttendeeIndex = attendeeIndex;
    this.saveSession();

    this.enrollment = new MeetingEnrollment({
      meetingDir: this.meetingDir,
      minSpeechDuration: this.config.minEnrollmentDurationMs,
      inputDeviceId: this.inputDeviceId,
    });

    this.enrollment.on("audio", (samples: Float32Array) => {
      this.emit("enrollment-audio", samples);
    });

    this.enrollment.on("progress", (progress) => {
      this.emit("enrollment-progress", progress);
    });

    this.enrollment.on("completed", (result) => {
      const updatedAttendee = result.attendee;
      this.session.attendees[attendeeIndex] = updatedAttendee;
      this.saveSession();
      this.emit("enrollment-complete", updatedAttendee);

      const allEnrolled = this.session.attendees.every((a) => a.enrolledAt !== null);
      if (allEnrolled) {
        this.session.status = "setup";
        this.emit("all-enrolled");
      }
    });

    this.enrollment.on("error", (error) => {
      this.emit("enrollment-error", error);
    });

    this.enrollment.on("cancelled", () => {
      this.session.status = "setup";
      this.saveSession();
      this.emit("enrollment-cancelled");
    });

    await this.enrollment.startEnrollment(attendee);
  }

  cancelEnrollment(): void {
    if (this.enrollment) {
      this.enrollment.cancel();
      this.enrollment = null;
    }
  }

  async startMeeting(): Promise<void> {
    const enrolledCount = this.session.attendees.filter((a) => a.enrolledAt !== null).length;
    if (enrolledCount < 2) {
      throw new Error("At least 2 attendees must be enrolled to start a meeting");
    }

    this.identifier = new SpeakerIdentifier({
      threshold: this.config.speakerIdentificationThreshold,
    });
    this.identifier.loadAttendeeProfiles(this.session.attendees, this.meetingDir);

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

    const captureOptions: AudioCaptureOptions = {
      sampleRate: SAMPLE_RATE,
      channels: 1,
      frameSize: 512,
    };
    if (this.inputDeviceId !== undefined) {
      captureOptions.deviceId = this.inputDeviceId;
    }

    this.capture = new AudioCapture(captureOptions);
    this.audioBuffer = [];
    this.recordingBuffer = [];

    this.capture.on("audio", async (samples: Float32Array, buffer: Buffer) => {
      if (this.session.status !== "active") {
        return;
      }

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

    this.capture.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.session.status = "active";
    this.session.startedAt = new Date().toISOString();
    this.saveSession();

    this.capture.start();

    this.autoSaveTimer = setInterval(() => {
      this.saveTranscript();
      this.saveSession();
    }, AUTO_SAVE_INTERVAL_MS);

    this.emit("meeting-started", this.session);
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

    const speaker = this.identifier!.identify(audioData);
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

    this.session.status = "paused";
    this.saveSession();
    this.emit("meeting-paused");
  }

  resumeMeeting(): void {
    if (this.session.status !== "paused") {
      return;
    }

    this.session.status = "active";
    this.saveSession();
    this.emit("meeting-resumed");
  }

  endMeeting(): MeetingExport {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    if (this.capture) {
      this.capture.stop();
      this.capture = null;
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

    this.session.status = "ended";
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
      `Attendees: ${this.session.attendees.map((a) => `${a.name} (${a.title})`).join(", ")}`,
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

  meetingDir_(): string {
    return this.meetingDir;
  }

  sessionId_(): string {
    return this.sessionId;
  }

  static load(sessionId: string): MeetingSession | null {
    const meetingDir = join(homedir(), ".voice-filter", "meetings", sessionId);
    const sessionPath = join(meetingDir, "session.json");

    if (!existsSync(sessionPath)) {
      return null;
    }

    const sessionData = JSON.parse(readFileSync(sessionPath, "utf-8")) as MeetingSessionData;
    const session = new MeetingSession({
      title: sessionData.title,
      attendeeCount: sessionData.attendees.length,
      calendarEventId: sessionData.calendarEventId ?? undefined,
      calendarProvider: sessionData.calendarProvider ?? undefined,
      scheduledStartTime: sessionData.scheduledStartTime ?? undefined,
      scheduledEndTime: sessionData.scheduledEndTime ?? undefined,
      meetingUrl: sessionData.meetingUrl ?? undefined,
    });

    session.session = sessionData;

    const transcriptPath = join(meetingDir, "transcript.json");
    if (existsSync(transcriptPath)) {
      session.transcript = JSON.parse(readFileSync(transcriptPath, "utf-8")) as TranscriptEntry[];
    }

    return session;
  }

  static fromCalendarEvent(options: {
    calendarEventId: number;
    calendarProvider: string;
    title: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    meetingUrl?: string;
    attendeeNames?: string[];
    inputDeviceId?: number;
    openaiApiKey?: string;
    config?: Partial<MeetingConfig>;
  }): MeetingSession {
    const session = new MeetingSession({
      title: options.title,
      attendeeCount: options.attendeeNames?.length ?? 0,
      inputDeviceId: options.inputDeviceId,
      openaiApiKey: options.openaiApiKey,
      config: options.config,
      calendarEventId: options.calendarEventId,
      calendarProvider: options.calendarProvider,
      scheduledStartTime: options.scheduledStartTime,
      scheduledEndTime: options.scheduledEndTime,
      meetingUrl: options.meetingUrl,
    });

    if (options.attendeeNames) {
      for (const name of options.attendeeNames) {
        session.addAttendee(name, "Attendee");
      }
    }

    return session;
  }

  calendarInfo(): {
    eventId: number | null;
    provider: string | null;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    meetingUrl: string | null;
  } {
    return {
      eventId: this.session.calendarEventId,
      provider: this.session.calendarProvider,
      scheduledStart: this.session.scheduledStartTime,
      scheduledEnd: this.session.scheduledEndTime,
      meetingUrl: this.session.meetingUrl,
    };
  }
}
