import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AudioCapture, type AudioCaptureOptions } from "../audio/capture.js";
import { VoiceActivityDetector } from "../audio/vad.js";
import { ensureProfilesDir, type SpeakerProfile, saveProfile } from "../config/settings.js";

export interface EnrollmentOptions {
  speakerId: string;
  domainId: string;
  minSpeechDuration?: number;
  inputDeviceId?: number;
  sampleRate?: number;
}

const MIN_SPEECH_DURATION_MS = 10000;
const SAMPLE_RATE = 16000;

export interface EnrollmentResult {
  speakerId: string;
  audioFilePath: string;
  speechDurationMs: number;
  profile: SpeakerProfile;
}

export class EnrollmentSession extends EventEmitter {
  private readonly speakerId: string;
  private readonly domainId: string;
  private readonly minSpeechDuration: number;
  private readonly inputDeviceId?: number;
  private readonly sampleRate: number;

  private capture: AudioCapture | null = null;
  private vad: VoiceActivityDetector | null = null;
  private audioBuffers: Buffer[] = [];
  private speechDurationMs: number = 0;
  private isRecording: boolean = false;
  private lastSpeechTime: number = 0;

  constructor(options: EnrollmentOptions) {
    super();
    this.speakerId = options.speakerId;
    this.domainId = options.domainId;
    this.minSpeechDuration = options.minSpeechDuration ?? MIN_SPEECH_DURATION_MS;
    this.inputDeviceId = options.inputDeviceId;
    this.sampleRate = options.sampleRate ?? SAMPLE_RATE;
  }

  async start(): Promise<void> {
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
    this.audioBuffers = [];
    this.speechDurationMs = 0;
    this.isRecording = true;

    this.capture.on("audio", async (samples: Float32Array, buffer: Buffer) => {
      if (!this.isRecording) {
        return;
      }

      this.emit("audio", samples);
      this.audioBuffers.push(Buffer.from(buffer));

      const probability = await this.vad!.process(samples);
      const isSpeech = probability >= 0.1;

      if (isSpeech) {
        const frameDurationMs = (samples.length / this.sampleRate) * 1000;
        this.speechDurationMs += frameDurationMs;
        this.lastSpeechTime = Date.now();
        this.emit("speech", this.speechDurationMs, this.minSpeechDuration);
      }

      this.emit("progress", {
        speechDurationMs: this.speechDurationMs,
        requiredMs: this.minSpeechDuration,
        percentComplete: Math.min(100, (this.speechDurationMs / this.minSpeechDuration) * 100),
        isSpeech,
        probability,
      });

      if (this.speechDurationMs >= this.minSpeechDuration) {
        await this.complete();
      }
    });

    this.capture.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.capture.start();
    this.emit("started");
  }

  async complete(): Promise<EnrollmentResult> {
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
    const profile = this.createProfile();

    const result: EnrollmentResult = {
      speakerId: this.speakerId,
      audioFilePath,
      speechDurationMs: this.speechDurationMs,
      profile,
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
    this.emit("cancelled");
  }

  private saveAudioFile(): string {
    const profilesDir = ensureProfilesDir();
    const audioDir = join(profilesDir, "audio");
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }

    const audioFilePath = join(audioDir, `${this.speakerId}.raw`);
    const combinedBuffer = Buffer.concat(this.audioBuffers);
    writeFileSync(audioFilePath, combinedBuffer);

    const wavPath = join(audioDir, `${this.speakerId}.wav`);
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

  private createProfile(): SpeakerProfile {
    const profile: SpeakerProfile = {
      speakerId: this.speakerId,
      enrolledAt: new Date().toISOString(),
      awsDomainId: this.domainId,
      awsSpeakerId: this.speakerId,
    };
    saveProfile(profile);
    return profile;
  }

  speechDurationValue(): number {
    return this.speechDurationMs;
  }

  requiredDuration(): number {
    return this.minSpeechDuration;
  }

  recording(): boolean {
    return this.isRecording;
  }
}
