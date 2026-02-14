import { EventEmitter } from "node:events";

export interface VADOptions {
  threshold?: number;
  sampleRate?: number;
  frameSamples?: number;
  smoothingFrames?: number;
}

const DEFAULT_THRESHOLD = 0.01;
const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_FRAME_SAMPLES = 512;
const DEFAULT_SMOOTHING_FRAMES = 5;

export type SpeechState = "speech" | "silence";

export class VoiceActivityDetector extends EventEmitter {
  private readonly threshold: number;
  private readonly sampleRate: number;
  private readonly frameSamples: number;
  private readonly smoothingFrames: number;
  private currentState: SpeechState = "silence";
  private recentEnergies: number[] = [];

  constructor(options: VADOptions = {}) {
    super();
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD;
    this.sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.frameSamples = options.frameSamples ?? DEFAULT_FRAME_SAMPLES;
    this.smoothingFrames = options.smoothingFrames ?? DEFAULT_SMOOTHING_FRAMES;
  }

  async initialize(): Promise<void> {
    this.emit("initialized");
  }

  async process(samples: Float32Array): Promise<number> {
    const energy = this.computeEnergy(samples);
    this.recentEnergies.push(energy);

    if (this.recentEnergies.length > this.smoothingFrames) {
      this.recentEnergies.shift();
    }

    const smoothedEnergy =
      this.recentEnergies.reduce((a, b) => a + b, 0) / this.recentEnergies.length;
    const probability = Math.min(1, smoothedEnergy / (this.threshold * 10));

    const previousState = this.currentState;
    const isSpeech = smoothedEnergy >= this.threshold;
    this.currentState = isSpeech ? "speech" : "silence";

    if (previousState !== this.currentState) {
      this.emit("stateChange", this.currentState, probability);
      if (this.currentState === "speech") {
        this.emit("speechStart", probability);
      } else {
        this.emit("speechEnd", probability);
      }
    }

    this.emit("probability", probability);
    return probability;
  }

  private computeEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  state(): SpeechState {
    return this.currentState;
  }

  isSpeech(): boolean {
    return this.currentState === "speech";
  }

  thresholdValue(): number {
    return this.threshold;
  }

  reset(): void {
    this.currentState = "silence";
    this.recentEnergies = [];
    this.emit("reset");
  }

  dispose(): void {
    this.reset();
    this.emit("disposed");
  }
}
