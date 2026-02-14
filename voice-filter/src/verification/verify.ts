import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureProfilesDir, loadProfile, type SpeakerProfile } from "../config/settings.js";

export type VerificationDecision = "authorized" | "unauthorized" | "pending" | "unknown";

export interface VerificationResult {
  decision: VerificationDecision;
  confidence: number;
  speakerId: string | null;
  timestamp: number;
}

export interface VerifierOptions {
  speakerId: string;
  verificationThreshold?: number;
  silenceTimeoutMs?: number;
}

const DEFAULT_VERIFICATION_THRESHOLD = 0.7;
const DEFAULT_SILENCE_TIMEOUT_MS = 2000;

export class SpeakerVerifier extends EventEmitter {
  private readonly speakerId: string;
  private readonly verificationThreshold: number;
  private readonly silenceTimeoutMs: number;
  private profile: SpeakerProfile | null = null;
  private enrolledEmbedding: Float32Array | null = null;
  private currentDecision: VerificationDecision = "pending";
  private lastVerificationTime: number = 0;
  private lastSpeechTime: number = 0;
  private audioBuffer: Buffer[] = [];
  private verificationInProgress: boolean = false;

  constructor(options: VerifierOptions) {
    super();
    this.speakerId = options.speakerId;
    this.verificationThreshold = options.verificationThreshold ?? DEFAULT_VERIFICATION_THRESHOLD;
    this.silenceTimeoutMs = options.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS;
  }

  async initialize(): Promise<boolean> {
    this.profile = loadProfile(this.speakerId);
    if (!this.profile) {
      this.emit("error", new Error(`No profile found for speaker: ${this.speakerId}`));
      return false;
    }

    const embedding = this.loadEmbedding();
    if (embedding) {
      this.enrolledEmbedding = embedding;
    }

    this.emit("initialized", this.profile);
    return true;
  }

  private loadEmbedding(): Float32Array | null {
    const profilesDir = ensureProfilesDir();
    const embeddingPath = join(profilesDir, "embeddings", `${this.speakerId}.bin`);
    if (!existsSync(embeddingPath)) {
      return null;
    }
    const buffer = readFileSync(embeddingPath);
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
  }

  onSpeechStart(): void {
    this.lastSpeechTime = Date.now();
    const timeSinceLastVerification = this.lastSpeechTime - this.lastVerificationTime;

    if (timeSinceLastVerification > this.silenceTimeoutMs) {
      this.currentDecision = "pending";
      this.audioBuffer = [];
      this.emit("verificationRequired");
    }
  }

  onSpeechEnd(): void {
    const now = Date.now();
    const silenceDuration = now - this.lastSpeechTime;

    if (silenceDuration > this.silenceTimeoutMs && this.currentDecision === "authorized") {
      this.currentDecision = "pending";
      this.emit("sessionExpired");
    }
  }

  async processAudio(buffer: Buffer, isSpeech: boolean): Promise<VerificationResult> {
    if (isSpeech) {
      this.lastSpeechTime = Date.now();
      this.audioBuffer.push(buffer);

      if (this.currentDecision === "pending" && !this.verificationInProgress) {
        const bufferDurationMs = this.estimateBufferDuration();
        if (bufferDurationMs >= 1500) {
          await this.performVerification();
        }
      }
    } else {
      const silenceDuration = Date.now() - this.lastSpeechTime;
      if (silenceDuration > this.silenceTimeoutMs && this.currentDecision === "authorized") {
        this.currentDecision = "pending";
        this.audioBuffer = [];
        this.emit("sessionExpired");
      }
    }

    return {
      decision: this.currentDecision,
      confidence: this.currentDecision === "authorized" ? 1.0 : 0.0,
      speakerId: this.currentDecision === "authorized" ? this.speakerId : null,
      timestamp: Date.now(),
    };
  }

  private estimateBufferDuration(): number {
    const totalBytes = this.audioBuffer.reduce((sum, b) => sum + b.length, 0);
    const sampleRate = 16000;
    const bytesPerSample = 2;
    const durationSeconds = totalBytes / (sampleRate * bytesPerSample);
    return durationSeconds * 1000;
  }

  private async performVerification(): Promise<void> {
    this.verificationInProgress = true;

    try {
      const similarity = await this.computeSimilarity();
      const isAuthorized = similarity >= this.verificationThreshold;

      this.currentDecision = isAuthorized ? "authorized" : "unauthorized";
      this.lastVerificationTime = Date.now();

      this.emit("verified", {
        decision: this.currentDecision,
        confidence: similarity,
        speakerId: isAuthorized ? this.speakerId : null,
        timestamp: this.lastVerificationTime,
      });

      if (!isAuthorized) {
        this.emit("unauthorized", similarity);
      }
    } catch (error) {
      this.emit("error", error);
      this.currentDecision = "unknown";
    } finally {
      this.verificationInProgress = false;
    }
  }

  private async computeSimilarity(): Promise<number> {
    if (!this.enrolledEmbedding) {
      return this.computeLocalSimilarity();
    }

    return this.computeLocalSimilarity();
  }

  private computeLocalSimilarity(): number {
    if (!this.profile) {
      return 0;
    }

    const profilesDir = ensureProfilesDir();
    const enrolledAudioPath = join(profilesDir, "audio", `${this.speakerId}.raw`);

    if (!existsSync(enrolledAudioPath)) {
      return 0.5;
    }

    const enrolledAudio = readFileSync(enrolledAudioPath);
    const currentAudio = Buffer.concat(this.audioBuffer);

    const similarity = this.computeAudioCorrelation(enrolledAudio, currentAudio);
    return Math.max(0, Math.min(1, similarity));
  }

  private computeAudioCorrelation(enrolled: Buffer, current: Buffer): number {
    const enrolledSamples = this.bufferToSamples(enrolled);
    const currentSamples = this.bufferToSamples(current);

    const minLength = Math.min(enrolledSamples.length, currentSamples.length, 8000);

    if (minLength < 1000) {
      return 0.5;
    }

    const enrolledSlice = enrolledSamples.slice(0, minLength);
    const currentSlice = currentSamples.slice(0, minLength);

    const enrolledMean = enrolledSlice.reduce((a, b) => a + b, 0) / minLength;
    const currentMean = currentSlice.reduce((a, b) => a + b, 0) / minLength;

    let covariance = 0;
    let enrolledVariance = 0;
    let currentVariance = 0;

    for (let i = 0; i < minLength; i++) {
      const enrolledDiff = enrolledSlice[i] - enrolledMean;
      const currentDiff = currentSlice[i] - currentMean;
      covariance += enrolledDiff * currentDiff;
      enrolledVariance += enrolledDiff * enrolledDiff;
      currentVariance += currentDiff * currentDiff;
    }

    const denominator = Math.sqrt(enrolledVariance * currentVariance);
    if (denominator === 0) {
      return 0.5;
    }

    const correlation = covariance / denominator;
    return (correlation + 1) / 2;
  }

  private bufferToSamples(buffer: Buffer): number[] {
    const samples: number[] = [];
    for (let i = 0; i < buffer.length - 1; i += 2) {
      samples.push(buffer.readInt16LE(i) / 32768);
    }
    return samples;
  }

  decision(): VerificationDecision {
    return this.currentDecision;
  }

  isAuthorized(): boolean {
    return this.currentDecision === "authorized";
  }

  reset(): void {
    this.currentDecision = "pending";
    this.audioBuffer = [];
    this.lastVerificationTime = 0;
    this.lastSpeechTime = 0;
    this.emit("reset");
  }

  dispose(): void {
    this.reset();
    this.profile = null;
    this.enrolledEmbedding = null;
    this.emit("disposed");
  }
}
