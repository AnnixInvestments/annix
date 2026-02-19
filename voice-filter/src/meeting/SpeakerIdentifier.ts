import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MeetingAttendee, SpeakerIdentification } from "./types.js";

export interface SpeakerIdentifierOptions {
  threshold?: number;
}

const DEFAULT_THRESHOLD = 0.65;

interface AttendeeProfile {
  attendee: MeetingAttendee;
  audioPath: string;
  mfccMean: number[];
  mfccVar: number[];
}

export class SpeakerIdentifier extends EventEmitter {
  private readonly threshold: number;
  private profiles: AttendeeProfile[] = [];

  constructor(options: SpeakerIdentifierOptions = {}) {
    super();
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD;
  }

  loadAttendeeProfiles(attendees: MeetingAttendee[], meetingDir: string): void {
    this.profiles = [];

    for (const attendee of attendees) {
      if (!attendee.enrolledAt) {
        continue;
      }

      const audioPath = join(meetingDir, "audio", `${attendee.id}.raw`);
      if (!existsSync(audioPath)) {
        continue;
      }

      const audioData = readFileSync(audioPath);
      const samples = this.bufferToSamples(audioData);

      if (samples.length < 1600) {
        continue;
      }

      const mfccFrames = this.computeMFCC(samples);
      if (mfccFrames.length === 0) {
        continue;
      }

      const mfccMean = this.computeMeanMFCC(mfccFrames);
      const mfccVar = this.computeVarMFCC(mfccFrames, mfccMean);

      this.profiles.push({
        attendee,
        audioPath,
        mfccMean,
        mfccVar,
      });
    }

    this.emit("profiles-loaded", this.profiles.length);
  }

  identify(audioBuffer: Buffer): SpeakerIdentification {
    const samples = this.bufferToSamples(audioBuffer);

    if (samples.length < 1600) {
      return {
        speakerId: null,
        speakerName: "Unknown",
        confidence: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const currentMFCC = this.computeMFCC(samples);
    if (currentMFCC.length === 0) {
      return {
        speakerId: null,
        speakerName: "Unknown",
        confidence: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const currentMean = this.computeMeanMFCC(currentMFCC);
    const currentVar = this.computeVarMFCC(currentMFCC, currentMean);

    let bestMatch: AttendeeProfile | null = null;
    let bestSimilarity = 0;

    for (const profile of this.profiles) {
      const similarity = this.computeSimilarity(
        profile.mfccMean,
        profile.mfccVar,
        currentMean,
        currentVar,
      );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = profile;
      }
    }

    const timestamp = new Date().toISOString();

    if (bestMatch && bestSimilarity >= this.threshold) {
      const result: SpeakerIdentification = {
        speakerId: bestMatch.attendee.id,
        speakerName: bestMatch.attendee.name,
        confidence: bestSimilarity,
        timestamp,
      };
      this.emit("identified", result);
      return result;
    }

    const result: SpeakerIdentification = {
      speakerId: null,
      speakerName: "Unknown",
      confidence: bestSimilarity,
      timestamp,
    };
    this.emit("unknown-speaker", result);
    return result;
  }

  private computeSimilarity(
    enrolledMean: number[],
    enrolledVar: number[],
    currentMean: number[],
    currentVar: number[],
  ): number {
    let distance = 0;

    for (let i = 0; i < enrolledMean.length; i++) {
      const diff = enrolledMean[i] - currentMean[i];
      if (Number.isNaN(diff)) {
        continue;
      }
      const variance = (enrolledVar[i] + currentVar[i]) / 2 + 0.001;
      if (variance > 0) {
        distance += (diff * diff) / variance;
      }
    }

    if (Number.isNaN(distance) || distance < 0) {
      return 0;
    }

    const normalizedDistance = Math.sqrt(distance / enrolledMean.length);
    const similarity = Math.exp(-normalizedDistance / 2);

    if (Number.isNaN(similarity)) {
      return 0;
    }

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
    for (let i = 0; i + 2 <= buffer.length; i += 2) {
      samples.push(buffer.readInt16LE(i) / 32768);
    }
    return samples;
  }

  profileCount(): number {
    return this.profiles.length;
  }

  thresholdValue(): number {
    return this.threshold;
  }

  reset(): void {
    this.profiles = [];
    this.emit("reset");
  }

  dispose(): void {
    this.reset();
    this.emit("disposed");
  }
}
