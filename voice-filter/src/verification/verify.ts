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

  private logCounter = 0;

  async processAudio(buffer: Buffer, isSpeech: boolean): Promise<VerificationResult> {
    if (isSpeech) {
      this.lastSpeechTime = Date.now();
      this.audioBuffer.push(buffer);

      const maxBufferSize = 64000;
      while (this.audioBuffer.reduce((sum, b) => sum + b.length, 0) > maxBufferSize) {
        this.audioBuffer.shift();
      }

      const bufferDurationMs = this.estimateBufferDuration();

      this.logCounter++;
      if (this.logCounter % 5 === 0) {
        console.log(
          `[BUFFER] ${bufferDurationMs.toFixed(0)}ms, decision=${this.currentDecision}, verifying=${this.verificationInProgress}`,
        );
      }

      if (!this.verificationInProgress) {
        const timeSinceLastVerification = Date.now() - this.lastVerificationTime;

        const shouldVerify =
          (this.currentDecision === "pending" && bufferDurationMs >= 400) ||
          (this.currentDecision === "authorized" &&
            timeSinceLastVerification >= 300 &&
            bufferDurationMs >= 400);

        if (shouldVerify) {
          console.log(`[TRIGGERING VERIFY] buffer=${bufferDurationMs.toFixed(0)}ms`);
          await this.performVerification();
        }
      }
    } else {
      const silenceDuration = Date.now() - this.lastSpeechTime;
      if (silenceDuration > 500 && this.currentDecision === "authorized") {
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

  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;

  private async performVerification(): Promise<void> {
    this.verificationInProgress = true;

    try {
      const similarity = await this.computeSimilarity();

      if (Number.isNaN(similarity) || similarity === undefined || similarity === null) {
        console.log("[VERIFY] Invalid similarity result, skipping");
        this.verificationInProgress = false;
        return;
      }

      const passesThreshold = similarity >= this.verificationThreshold;

      console.log(
        `[VERIFY] Similarity: ${(similarity * 100).toFixed(1)}% (threshold: ${(this.verificationThreshold * 100).toFixed(1)}%) - ${passesThreshold ? "PASS" : "FAIL"}`,
      );

      if (passesThreshold) {
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;

        if (this.consecutiveSuccesses >= 2 || this.currentDecision === "authorized") {
          this.currentDecision = "authorized";
        }
      } else {
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;

        if (this.consecutiveFailures >= 1) {
          this.currentDecision = "unauthorized";
        }
      }

      this.lastVerificationTime = Date.now();

      this.emit("verified", {
        decision: this.currentDecision,
        confidence: similarity,
        speakerId: this.currentDecision === "authorized" ? this.speakerId : null,
        timestamp: this.lastVerificationTime,
      });

      if (this.currentDecision === "unauthorized") {
        this.emit("unauthorized", similarity);
      }
    } catch (error) {
      console.log("[VERIFY ERROR]", error instanceof Error ? error.message : String(error));
      this.currentDecision = "unauthorized";
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
      console.log("[DEBUG] No profile loaded");
      return 0;
    }

    const profilesDir = ensureProfilesDir();
    const enrolledAudioPath = join(profilesDir, "audio", `${this.speakerId}.raw`);

    if (!existsSync(enrolledAudioPath)) {
      console.log("[DEBUG] Enrolled audio file not found:", enrolledAudioPath);
      return 0.3;
    }

    const enrolledAudio = readFileSync(enrolledAudioPath);
    const currentAudio = Buffer.concat(this.audioBuffer);

    console.log(
      `[DEBUG] Enrolled: ${enrolledAudio.length} bytes, Current: ${currentAudio.length} bytes`,
    );

    const enrolledSamples = this.bufferToSamples(enrolledAudio);
    const currentSamples = this.bufferToSamples(currentAudio);

    if (enrolledSamples.length < 1600 || currentSamples.length < 1600) {
      console.log("[DEBUG] Not enough samples:", enrolledSamples.length, currentSamples.length);
      return 0.3;
    }

    const enrolledMFCC = this.computeMFCC(enrolledSamples);
    const currentMFCC = this.computeMFCC(currentSamples);

    console.log(
      `[DEBUG] MFCC frames - Enrolled: ${enrolledMFCC.length}, Current: ${currentMFCC.length}`,
    );

    const similarity = this.compareMFCC(enrolledMFCC, currentMFCC);
    console.log(`[DEBUG] Raw similarity: ${similarity}`);
    return Math.max(0, Math.min(1, similarity));
  }

  private computeMFCC(samples: number[]): number[][] {
    const frameSize = 512;
    const hopSize = 256;
    const numCoeffs = 13;
    const numFilters = 26;
    const sampleRate = 16000;

    const frames: number[][] = [];
    for (let i = 0; i + frameSize <= samples.length; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      const windowed = this.applyHammingWindow(frame);
      const spectrum = this.computeFFTMagnitude(windowed);
      const melEnergies = this.applyMelFilterbank(spectrum, numFilters, sampleRate);
      const logMelEnergies = melEnergies.map((e) => Math.log(Math.max(e, 1e-10)));
      const mfcc = this.dct(logMelEnergies, numCoeffs);
      frames.push(mfcc);
    }

    return frames;
  }

  private applyHammingWindow(frame: number[]): number[] {
    const n = frame.length;
    return frame.map((sample, i) => sample * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1))));
  }

  private computeFFTMagnitude(frame: number[]): number[] {
    const n = frame.length;
    const real = [...frame];
    const imag = new Array(n).fill(0);

    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const angle = (-2 * Math.PI) / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0; j < halfSize; j++) {
          const cos = Math.cos(angle * j);
          const sin = Math.sin(angle * j);
          const realPart = real[i + j + halfSize];
          const imagPart = imag[i + j + halfSize];
          const tReal = cos * realPart - sin * imagPart;
          const tImag = sin * realPart + cos * imagPart;
          real[i + j + halfSize] = real[i + j] - tReal;
          imag[i + j + halfSize] = imag[i + j] - tImag;
          real[i + j] += tReal;
          imag[i + j] += tImag;
        }
      }
    }

    const magnitude: number[] = [];
    for (let i = 0; i <= n / 2; i++) {
      magnitude.push(Math.sqrt(real[i] * real[i] + imag[i] * imag[i]));
    }
    return magnitude;
  }

  private applyMelFilterbank(spectrum: number[], numFilters: number, sampleRate: number): number[] {
    const lowFreq = 0;
    const highFreq = sampleRate / 2;
    const lowMel = this.hzToMel(lowFreq);
    const highMel = this.hzToMel(highFreq);

    const melPoints: number[] = [];
    for (let i = 0; i <= numFilters + 1; i++) {
      melPoints.push(lowMel + (i * (highMel - lowMel)) / (numFilters + 1));
    }

    const hzPoints = melPoints.map((m) => this.melToHz(m));
    const binPoints = hzPoints.map((h) => Math.floor(((spectrum.length - 1) * 2 * h) / sampleRate));

    const filterbank: number[] = [];
    for (let i = 1; i <= numFilters; i++) {
      let energy = 0;
      for (let j = binPoints[i - 1]; j < binPoints[i]; j++) {
        if (j < spectrum.length) {
          const weight = (j - binPoints[i - 1]) / (binPoints[i] - binPoints[i - 1]);
          energy += spectrum[j] * weight;
        }
      }
      for (let j = binPoints[i]; j < binPoints[i + 1]; j++) {
        if (j < spectrum.length) {
          const weight = (binPoints[i + 1] - j) / (binPoints[i + 1] - binPoints[i]);
          energy += spectrum[j] * weight;
        }
      }
      filterbank.push(energy);
    }

    return filterbank;
  }

  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  private melToHz(mel: number): number {
    return 700 * (10 ** (mel / 2595) - 1);
  }

  private dct(input: number[], numCoeffs: number): number[] {
    const n = input.length;
    const output: number[] = [];
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += input[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
      }
      output.push(sum * Math.sqrt(2 / n));
    }
    return output;
  }

  private compareMFCC(enrolled: number[][], current: number[][]): number {
    if (enrolled.length === 0 || current.length === 0) {
      console.log("[DEBUG] Empty MFCC arrays");
      return 0.3;
    }

    try {
      const enrolledMean = this.computeMeanMFCC(enrolled);
      const currentMean = this.computeMeanMFCC(current);

      const enrolledVar = this.computeVarMFCC(enrolled, enrolledMean);
      const currentVar = this.computeVarMFCC(current, currentMean);

      let distance = 0;
      for (let i = 0; i < enrolledMean.length; i++) {
        const diff = enrolledMean[i] - currentMean[i];
        if (Number.isNaN(diff)) continue;
        const variance = (enrolledVar[i] + currentVar[i]) / 2 + 0.001;
        if (variance > 0) {
          distance += (diff * diff) / variance;
        }
      }

      if (Number.isNaN(distance) || distance < 0) {
        console.log("[DEBUG] Invalid distance:", distance);
        return 0.3;
      }

      const normalizedDistance = Math.sqrt(distance / enrolledMean.length);
      const similarity = Math.exp(-normalizedDistance / 2);

      if (Number.isNaN(similarity)) {
        console.log("[DEBUG] NaN similarity from distance:", normalizedDistance);
        return 0.3;
      }

      return similarity;
    } catch (err) {
      console.log("[DEBUG] MFCC comparison error:", err);
      return 0.3;
    }
  }

  private computeMeanMFCC(frames: number[][]): number[] {
    const numCoeffs = frames[0].length;
    const mean = new Array(numCoeffs).fill(0);
    for (const frame of frames) {
      for (let i = 0; i < numCoeffs; i++) {
        mean[i] += frame[i];
      }
    }
    return mean.map((m) => m / frames.length);
  }

  private computeVarMFCC(frames: number[][], mean: number[]): number[] {
    const numCoeffs = frames[0].length;
    const variance = new Array(numCoeffs).fill(0);
    for (const frame of frames) {
      for (let i = 0; i < numCoeffs; i++) {
        const diff = frame[i] - mean[i];
        variance[i] += diff * diff;
      }
    }
    return variance.map((v) => v / frames.length);
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
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.emit("reset");
  }

  dispose(): void {
    this.reset();
    this.profile = null;
    this.enrolledEmbedding = null;
    this.emit("disposed");
  }
}
