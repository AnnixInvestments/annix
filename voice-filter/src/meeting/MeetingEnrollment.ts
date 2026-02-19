import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AudioCapture, type AudioCaptureOptions } from "../audio/capture.js";
import { VoiceActivityDetector } from "../audio/vad.js";
import type { EnrollmentProgress, MeetingAttendee } from "./types.js";

export interface MeetingEnrollmentOptions {
  meetingDir: string;
  minSpeechDuration?: number;
  inputDeviceId?: number;
  sampleRate?: number;
}

const MIN_SPEECH_DURATION_MS = 10000;
const SAMPLE_RATE = 16000;

export interface AttendeeEnrollmentResult {
  attendee: MeetingAttendee;
  audioFilePath: string;
  speechDurationMs: number;
}

export class MeetingEnrollment extends EventEmitter {
  private readonly meetingDir: string;
  private readonly minSpeechDuration: number;
  private readonly inputDeviceId?: number;
  private readonly sampleRate: number;

  private capture: AudioCapture | null = null;
  private vad: VoiceActivityDetector | null = null;
  private audioBuffers: Buffer[] = [];
  private speechDurationMs: number = 0;
  private isRecording: boolean = false;
  private currentAttendee: MeetingAttendee | null = null;

  constructor(options: MeetingEnrollmentOptions) {
    super();
    this.meetingDir = options.meetingDir;
    this.minSpeechDuration = options.minSpeechDuration ?? MIN_SPEECH_DURATION_MS;
    this.inputDeviceId = options.inputDeviceId;
    this.sampleRate = options.sampleRate ?? SAMPLE_RATE;
  }

  async startEnrollment(attendee: MeetingAttendee): Promise<void> {
    this.currentAttendee = attendee;
    this.audioBuffers = [];
    this.speechDurationMs = 0;

    this.vad = new VoiceActivityDetector({
      sampleRate: this.sampleRate,
      threshold: 0.005,
    });
    await this.vad.initialize();

    const captureOptions: AudioCaptureOptions = {
      sampleRate: this.sampleRate,
      channels: 1,
      frameSize: 512,
    };
    if (this.inputDeviceId !== undefined) {
      captureOptions.deviceId = this.inputDeviceId;
    }

    this.capture = new AudioCapture(captureOptions);
    this.isRecording = true;

    this.capture.on("audio", async (samples: Float32Array, buffer: Buffer) => {
      if (!this.isRecording || !this.currentAttendee) {
        return;
      }

      this.emit("audio", samples);
      this.audioBuffers.push(Buffer.from(buffer));

      const probability = await this.vad!.process(samples);
      const isSpeech = probability >= 0.1;

      if (isSpeech) {
        const frameDurationMs = (samples.length / this.sampleRate) * 1000;
        this.speechDurationMs += frameDurationMs;
      }

      const progress: EnrollmentProgress = {
        attendeeId: this.currentAttendee.id,
        attendeeName: this.currentAttendee.name,
        speechDurationMs: this.speechDurationMs,
        requiredMs: this.minSpeechDuration,
        percentComplete: Math.min(100, (this.speechDurationMs / this.minSpeechDuration) * 100),
        isSpeech,
      };

      this.emit("progress", progress);

      if (this.speechDurationMs >= this.minSpeechDuration) {
        await this.completeEnrollment();
      }
    });

    this.capture.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.capture.start();
    this.emit("started", attendee);
  }

  private async completeEnrollment(): Promise<AttendeeEnrollmentResult> {
    this.isRecording = false;

    if (this.capture) {
      this.capture.stop();
      this.capture = null;
    }

    if (this.vad) {
      this.vad.dispose();
      this.vad = null;
    }

    const audioFilePath = this.saveAudioFile();

    const updatedAttendee: MeetingAttendee = {
      ...this.currentAttendee!,
      enrolledAt: new Date().toISOString(),
      profilePath: audioFilePath,
    };

    this.saveAttendeeProfile(updatedAttendee);

    const result: AttendeeEnrollmentResult = {
      attendee: updatedAttendee,
      audioFilePath,
      speechDurationMs: this.speechDurationMs,
    };

    this.emit("completed", result);
    return result;
  }

  cancel(): void {
    this.isRecording = false;
    if (this.capture) {
      this.capture.stop();
      this.capture = null;
    }
    if (this.vad) {
      this.vad.dispose();
      this.vad = null;
    }
    this.emit("cancelled", this.currentAttendee);
    this.currentAttendee = null;
  }

  private saveAudioFile(): string {
    const audioDir = join(this.meetingDir, "audio");
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }

    const rawPath = join(audioDir, `${this.currentAttendee!.id}.raw`);
    const combinedBuffer = Buffer.concat(this.audioBuffers);
    writeFileSync(rawPath, combinedBuffer);

    const wavPath = join(audioDir, `${this.currentAttendee!.id}.wav`);
    this.writeWavFile(wavPath, combinedBuffer);

    return wavPath;
  }

  private writeWavFile(path: string, pcmData: Buffer): void {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (this.sampleRate * numChannels * bitsPerSample) / 8;
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
    header.writeUInt32LE(this.sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);

    const wavBuffer = Buffer.concat([header, pcmData]);
    writeFileSync(path, wavBuffer);
  }

  private saveAttendeeProfile(attendee: MeetingAttendee): void {
    const attendeesDir = join(this.meetingDir, "attendees");
    if (!existsSync(attendeesDir)) {
      mkdirSync(attendeesDir, { recursive: true });
    }

    const profilePath = join(attendeesDir, `${attendee.id}.json`);
    writeFileSync(profilePath, JSON.stringify(attendee, null, 2));
  }

  recording(): boolean {
    return this.isRecording;
  }

  speechDuration(): number {
    return this.speechDurationMs;
  }

  requiredDuration(): number {
    return this.minSpeechDuration;
  }
}
