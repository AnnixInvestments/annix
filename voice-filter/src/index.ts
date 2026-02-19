import { EventEmitter } from "node:events";
import {
  AudioCapture,
  type AudioDevice,
  listInputDevices,
  listOutputDevices,
} from "./audio/capture.js";
import { AudioOutput, findVBCableDevice } from "./audio/output.js";
import { type SpeechState, VoiceActivityDetector } from "./audio/vad.js";
import { loadSettings, type VoiceFilterSettings } from "./config/settings.js";
import {
  SpeakerVerifier,
  type VerificationDecision,
  type VerificationResult,
} from "./verification/verify.js";

export interface VoiceFilterOptions {
  inputDeviceId?: number;
  outputDeviceId?: number;
  speakerId?: string;
  vadThreshold?: number;
  verificationThreshold?: number;
  silenceTimeoutMs?: number;
  failOpen?: boolean;
}

export interface VoiceFilterStatus {
  running: boolean;
  muted: boolean;
  speechState: SpeechState;
  verificationDecision: VerificationDecision;
  inputDevice: AudioDevice | null;
  outputDevice: AudioDevice | null;
}

export class VoiceFilter extends EventEmitter {
  private capture: AudioCapture | null = null;
  private output: AudioOutput | null = null;
  private vad: VoiceActivityDetector | null = null;
  private verifier: SpeakerVerifier | null = null;
  private settings: VoiceFilterSettings;
  private running: boolean = false;
  private currentSpeechState: SpeechState = "silence";
  private currentVerificationDecision: VerificationDecision = "pending";

  private readonly inputDeviceId?: number;
  private readonly outputDeviceId?: number;
  private readonly speakerId?: string;
  private readonly vadThreshold: number;
  private readonly verificationThreshold: number;
  private readonly silenceTimeoutMs: number;
  private readonly failOpen: boolean;

  constructor(options: VoiceFilterOptions = {}) {
    super();
    this.settings = loadSettings();

    this.inputDeviceId = options.inputDeviceId ?? this.settings.inputDeviceId ?? undefined;
    this.outputDeviceId =
      options.outputDeviceId ?? this.settings.outputDeviceId ?? findVBCableDevice() ?? undefined;
    this.speakerId = options.speakerId ?? this.settings.speakerId ?? undefined;
    this.vadThreshold = options.vadThreshold ?? this.settings.vadThreshold;
    this.verificationThreshold =
      options.verificationThreshold ?? this.settings.verificationThreshold;
    this.silenceTimeoutMs = options.silenceTimeoutMs ?? this.settings.silenceTimeout;
    this.failOpen = options.failOpen ?? this.settings.failOpen;
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error("Voice filter is already running");
    }

    this.vad = new VoiceActivityDetector({
      threshold: this.vadThreshold,
      sampleRate: 16000,
    });
    await this.vad.initialize();

    console.log(`[INIT] speakerId=${this.speakerId}`);
    if (this.speakerId) {
      this.verifier = new SpeakerVerifier({
        speakerId: this.speakerId,
        verificationThreshold: this.verificationThreshold,
        silenceTimeoutMs: this.silenceTimeoutMs,
      });

      const initialized = await this.verifier.initialize();
      console.log(`[INIT] verifier initialized=${initialized}`);
      if (!initialized) {
        this.emit(
          "warning",
          `No enrollment found for speaker: ${this.speakerId}. Running in passthrough mode.`,
        );
        this.verifier = null;
      } else {
        console.log(`[INIT] Verifier ready for speaker: ${this.speakerId}`);
      }

      if (this.verifier) {
        this.verifier.on("verified", (result: VerificationResult) => {
          this.currentVerificationDecision = result.decision;
          this.updateMuteState();
          this.emit("verification", result);
        });

        this.verifier.on("unauthorized", (confidence: number) => {
          this.emit("unauthorized", confidence);
        });

        this.verifier.on("sessionExpired", () => {
          this.currentVerificationDecision = "pending";
          this.emit("sessionExpired");
        });
      }
    }

    this.capture = new AudioCapture({
      deviceId: this.inputDeviceId,
      sampleRate: 16000,
      channels: 1,
      frameSize: 512,
    });

    this.output = new AudioOutput({
      deviceId: this.outputDeviceId,
      sampleRate: 16000,
      channels: 1,
      frameSize: 512,
    });

    let frameCount = 0;
    let lastLogTime = 0;
    this.capture.on("audio", async (samples: Float32Array, buffer: Buffer) => {
      if (!this.running || !this.vad || !this.output) {
        return;
      }
      const probability = await this.vad.process(samples);
      const isSpeech = this.vad.isSpeech();
      const previousState = this.currentSpeechState;
      this.currentSpeechState = this.vad.state();

      frameCount++;
      const now = Date.now();
      if (isSpeech && now - lastLogTime > 200) {
        lastLogTime = now;
        const muted = this.output?.isMuted() ?? false;
        const status = muted ? "BLOCKED" : "PASSING";
        const bar = muted
          ? "█".repeat(Math.floor(probability * 20))
          : "▓".repeat(Math.floor(probability * 20));
        console.log(`[${status}] ${bar.padEnd(20)} vol=${(probability * 100).toFixed(0)}%`);
      }

      if (previousState !== this.currentSpeechState) {
        this.emit("speechStateChange", this.currentSpeechState);

        if (this.currentSpeechState === "speech") {
          this.verifier?.onSpeechStart();
        } else {
          this.verifier?.onSpeechEnd();
        }
      }

      if (this.verifier) {
        await this.verifier.processAudio(buffer, isSpeech);
        this.updateMuteState();
      } else if (frameCount === 1) {
        console.log("[WARN] No verifier - running without speaker verification");
      }

      this.output.writeBuffer(buffer);

      this.emit("audio", {
        samples,
        buffer,
        probability,
        isSpeech,
        muted: this.output.isMuted(),
      });
    });

    this.capture.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.output.start();
    this.capture.start();
    this.running = true;

    this.emit("started", this.status());
  }

  private updateMuteState(): void {
    if (!this.output) {
      return;
    }

    const shouldMute = this.shouldMute();
    if (shouldMute && !this.output.isMuted()) {
      this.output.mute();
      this.emit("muted");
    } else if (!shouldMute && this.output.isMuted()) {
      this.output.unmute();
      this.emit("unmuted");
    }
  }

  private shouldMute(): boolean {
    if (!this.verifier) {
      return false;
    }

    if (this.currentVerificationDecision === "unauthorized") {
      return true;
    }

    if (this.currentVerificationDecision === "pending") {
      return !this.failOpen;
    }

    return false;
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    if (this.capture) {
      this.capture.stop();
      this.capture = null;
    }

    if (this.output) {
      this.output.stop();
      this.output = null;
    }

    if (this.vad) {
      this.vad.dispose();
      this.vad = null;
    }

    if (this.verifier) {
      this.verifier.dispose();
      this.verifier = null;
    }

    this.running = false;
    this.currentSpeechState = "silence";
    this.currentVerificationDecision = "pending";

    this.emit("stopped");
  }

  mute(): void {
    this.output?.mute();
  }

  unmute(): void {
    this.output?.unmute();
  }

  isMuted(): boolean {
    return this.output?.isMuted() ?? false;
  }

  isRunning(): boolean {
    return this.running;
  }

  status(): VoiceFilterStatus {
    const inputDevices = listInputDevices();
    const outputDevices = listOutputDevices();

    return {
      running: this.running,
      muted: this.output?.isMuted() ?? false,
      speechState: this.currentSpeechState,
      verificationDecision: this.currentVerificationDecision,
      inputDevice: inputDevices.find((d) => d.id === this.inputDeviceId) ?? null,
      outputDevice: outputDevices.find((d) => d.id === this.outputDeviceId) ?? null,
    };
  }

  speechState(): SpeechState {
    return this.currentSpeechState;
  }

  verificationDecision(): VerificationDecision {
    return this.currentVerificationDecision;
  }
}

export { AudioCapture, listInputDevices, listOutputDevices } from "./audio/capture.js";
export { AudioOutput, findVBCableDevice } from "./audio/output.js";
export { type SpeechState, VoiceActivityDetector } from "./audio/vad.js";
export * from "./config/settings.js";
export { AWSVoiceIDClient } from "./verification/aws-voice-id.js";
export { type EnrollmentResult, EnrollmentSession } from "./verification/enrollment.js";
export {
  SpeakerVerifier,
  type VerificationDecision,
  type VerificationResult,
} from "./verification/verify.js";
