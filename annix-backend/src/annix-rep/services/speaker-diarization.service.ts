import * as fs from "node:fs";
import { Injectable, Logger } from "@nestjs/common";
import type { SpeakerSegment } from "../entities";
import { RecordingService } from "./recording.service";

interface AudioFrame {
  startTime: number;
  endTime: number;
  energy: number;
  samples: Float32Array;
}

interface SpeakerProfile {
  id: string;
  frames: AudioFrame[];
  avgEnergy: number;
}

interface DiarizationOptions {
  minSegmentDuration: number;
  energyThreshold: number;
  silenceThreshold: number;
  correlationThreshold: number;
  maxSpeakers: number;
}

const DEFAULT_OPTIONS: DiarizationOptions = {
  minSegmentDuration: 0.5,
  energyThreshold: 0.01,
  silenceThreshold: 0.005,
  correlationThreshold: 0.6,
  maxSpeakers: 10,
};

@Injectable()
export class SpeakerDiarizationService {
  private readonly logger = new Logger(SpeakerDiarizationService.name);

  constructor(private readonly recordingService: RecordingService) {}

  async processRecording(
    recordingId: number,
    audioPath: string,
    options: Partial<DiarizationOptions> = {},
  ): Promise<SpeakerSegment[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!fs.existsSync(audioPath)) {
      this.logger.error(`Audio file not found: ${audioPath}`);
      await this.recordingService.markProcessingFailed(recordingId, "Audio file not found");
      return [];
    }

    const audioBuffer = fs.readFileSync(audioPath);
    const samples = this.decodeAudio(audioBuffer);

    if (samples.length === 0) {
      this.logger.warn(`No audio samples decoded from: ${audioPath}`);
      await this.recordingService.markProcessingFailed(recordingId, "Failed to decode audio");
      return [];
    }

    const frames = this.extractFrames(samples, 16000, 512, 256);

    const speechFrames = frames.filter((frame) => frame.energy >= opts.energyThreshold);

    if (speechFrames.length === 0) {
      this.logger.warn(`No speech detected in recording: ${recordingId}`);
      await this.recordingService.storeSpeakerSegments(recordingId, []);
      return [];
    }

    const speakers = this.clusterSpeakers(speechFrames, opts);

    const segments = this.buildSegments(speakers, opts.minSegmentDuration);

    await this.recordingService.storeSpeakerSegments(recordingId, segments);

    this.logger.log(
      `Diarization completed for recording ${recordingId}: ${segments.length} segments, ${speakers.length} speakers`,
    );

    return segments;
  }

  private decodeAudio(buffer: Buffer): Float32Array {
    if (this.isWavFile(buffer)) {
      return this.decodeWav(buffer);
    }

    return this.decodeRawPcm(buffer);
  }

  private isWavFile(buffer: Buffer): boolean {
    return (
      buffer.length > 44 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WAVE"
    );
  }

  private decodeWav(buffer: Buffer): Float32Array {
    const dataStart = buffer.indexOf("data") + 8;
    const dataLength = buffer.readUInt32LE(dataStart - 4);
    const bitsPerSample = buffer.readUInt16LE(34);

    const samples = new Float32Array(Math.floor(dataLength / (bitsPerSample / 8)));

    if (bitsPerSample === 16) {
      for (let i = 0; i < samples.length; i++) {
        const offset = dataStart + i * 2;
        if (offset + 1 < buffer.length) {
          samples[i] = buffer.readInt16LE(offset) / 32768;
        }
      }
    } else if (bitsPerSample === 32) {
      for (let i = 0; i < samples.length; i++) {
        const offset = dataStart + i * 4;
        if (offset + 3 < buffer.length) {
          samples[i] = buffer.readFloatLE(offset);
        }
      }
    }

    return samples;
  }

  private decodeRawPcm(buffer: Buffer): Float32Array {
    const samples = new Float32Array(Math.floor(buffer.length / 2));

    for (let i = 0; i < samples.length; i++) {
      const offset = i * 2;
      if (offset + 1 < buffer.length) {
        samples[i] = buffer.readInt16LE(offset) / 32768;
      }
    }

    return samples;
  }

  private extractFrames(
    samples: Float32Array,
    sampleRate: number,
    frameSize: number,
    hopSize: number,
  ): AudioFrame[] {
    const frameDuration = frameSize / sampleRate;
    const frameCount = Math.floor((samples.length - frameSize) / hopSize) + 1;

    return Array.from({ length: Math.max(0, frameCount) }, (_, idx) => {
      const i = idx * hopSize;
      const frameSamples = samples.slice(i, i + frameSize);
      const energy = this.computeEnergy(frameSamples);
      const startTime = i / sampleRate;

      return {
        startTime,
        endTime: startTime + frameDuration,
        energy,
        samples: frameSamples,
      };
    });
  }

  private computeEnergy(samples: Float32Array): number {
    const sum = Array.from(samples).reduce((acc, sample) => acc + sample * sample, 0);
    return Math.sqrt(sum / samples.length);
  }

  private clusterSpeakers(frames: AudioFrame[], opts: DiarizationOptions): SpeakerProfile[] {
    const speakers: SpeakerProfile[] = [];

    for (const frame of frames) {
      let bestMatch: SpeakerProfile | null = null;
      let bestCorrelation = 0;

      for (const speaker of speakers) {
        const correlation = this.computeSpeakerCorrelation(frame, speaker);
        if (correlation > bestCorrelation && correlation >= opts.correlationThreshold) {
          bestCorrelation = correlation;
          bestMatch = speaker;
        }
      }

      if (bestMatch) {
        bestMatch.frames.push(frame);
        bestMatch.avgEnergy =
          (bestMatch.avgEnergy * (bestMatch.frames.length - 1) + frame.energy) /
          bestMatch.frames.length;
      } else if (speakers.length < opts.maxSpeakers) {
        speakers.push({
          id: `Speaker ${speakers.length + 1}`,
          frames: [frame],
          avgEnergy: frame.energy,
        });
      } else {
        const lowestEnergySpeaker = speakers.reduce((lowest, speaker) =>
          speaker.avgEnergy < lowest.avgEnergy ? speaker : lowest,
        );
        lowestEnergySpeaker.frames.push(frame);
      }
    }

    return speakers;
  }

  private computeSpeakerCorrelation(frame: AudioFrame, speaker: SpeakerProfile): number {
    if (speaker.frames.length === 0) return 0;

    const recentFrames = speaker.frames.slice(-10);
    const totalCorrelation = recentFrames.reduce(
      (sum, speakerFrame) => sum + this.pearsonCorrelation(frame.samples, speakerFrame.samples),
      0,
    );

    return totalCorrelation / recentFrames.length;
  }

  private pearsonCorrelation(a: Float32Array, b: Float32Array): number {
    const n = Math.min(a.length, b.length);
    if (n === 0) return 0;

    let sumA = 0;
    let sumB = 0;
    let sumAB = 0;
    let sumA2 = 0;
    let sumB2 = 0;

    for (let i = 0; i < n; i++) {
      sumA += a[i];
      sumB += b[i];
      sumAB += a[i] * b[i];
      sumA2 += a[i] * a[i];
      sumB2 += b[i] * b[i];
    }

    const numerator = n * sumAB - sumA * sumB;
    const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

    if (denominator === 0) return 0;

    const correlation = numerator / denominator;

    return (correlation + 1) / 2;
  }

  private buildSegments(speakers: SpeakerProfile[], minDuration: number): SpeakerSegment[] {
    const allFrames = speakers.flatMap((speaker) =>
      speaker.frames.map((frame) => ({ frame, speakerId: speaker.id })),
    );

    allFrames.sort((a, b) => a.frame.startTime - b.frame.startTime);

    const { segments, current } = allFrames.reduce(
      (acc, { frame, speakerId }) => {
        if (!acc.current || acc.current.speakerLabel !== speakerId) {
          if (acc.current) {
            const duration = acc.current.endTime - acc.current.startTime;
            if (duration >= minDuration) {
              return {
                segments: [...acc.segments, acc.current],
                current: {
                  startTime: frame.startTime,
                  endTime: frame.endTime,
                  speakerLabel: speakerId,
                  confidence: null,
                },
              };
            }
          }
          return {
            segments: acc.segments,
            current: {
              startTime: frame.startTime,
              endTime: frame.endTime,
              speakerLabel: speakerId,
              confidence: null,
            },
          };
        }
        return {
          segments: acc.segments,
          current: { ...acc.current, endTime: frame.endTime },
        };
      },
      { segments: [] as SpeakerSegment[], current: null as SpeakerSegment | null },
    );

    const finalSegments =
      current && current.endTime - current.startTime >= minDuration
        ? [...segments, current]
        : segments;

    return this.mergeAdjacentSegments(finalSegments, 0.3);
  }

  private mergeAdjacentSegments(segments: SpeakerSegment[], maxGap: number): SpeakerSegment[] {
    if (segments.length <= 1) return segments;

    const result = segments.slice(1).reduce(
      (acc, next) => {
        const current = acc[acc.length - 1];
        if (
          next.speakerLabel === current.speakerLabel &&
          next.startTime - current.endTime <= maxGap
        ) {
          return [...acc.slice(0, -1), { ...current, endTime: next.endTime }];
        }
        return [...acc, { ...next }];
      },
      [{ ...segments[0] }] as SpeakerSegment[],
    );

    return result;
  }
}
