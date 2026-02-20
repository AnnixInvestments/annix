import { EventEmitter } from "node:events";

export interface TeamsAudioAdapterOptions {
  sampleRate?: number;
  channels?: number;
  callbackUrl?: string;
}

export interface TeamsAudioChunk {
  buffer: Buffer;
  speakerId: string | null;
  speakerName: string;
  timestamp: number;
}

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_CHANNELS = 1;

export class TeamsAudioAdapter extends EventEmitter {
  private readonly sampleRate: number;
  private readonly channels: number;
  private readonly callbackUrl: string | null;

  private isConnected: boolean = false;
  private callId: string | null = null;
  private incomingBuffer: Buffer[] = [];
  private resampleBuffer: Float32Array | null = null;

  constructor(options: TeamsAudioAdapterOptions = {}) {
    super();
    this.sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.channels = options.channels ?? DEFAULT_CHANNELS;
    this.callbackUrl = options.callbackUrl ?? null;
  }

  connect(callId: string): void {
    this.callId = callId;
    this.isConnected = true;
    this.incomingBuffer = [];
    this.emit("connected", { callId });
  }

  disconnect(): void {
    if (this.incomingBuffer.length > 0) {
      this.flushBuffer();
    }

    const callId = this.callId;
    this.callId = null;
    this.isConnected = false;
    this.incomingBuffer = [];
    this.resampleBuffer = null;
    this.emit("disconnected", { callId });
  }

  processIncomingAudio(chunk: TeamsAudioChunk): void {
    if (!this.isConnected) {
      return;
    }

    const pcmBuffer = this.convertToPcm16(chunk.buffer);
    const samples = this.bufferToFloat32(pcmBuffer);
    const resampledSamples = this.resampleIfNeeded(samples, chunk);

    this.emit("audio", resampledSamples, pcmBuffer, {
      speakerId: chunk.speakerId,
      speakerName: chunk.speakerName,
      timestamp: chunk.timestamp,
    });
  }

  private convertToPcm16(buffer: Buffer): Buffer {
    return buffer;
  }

  private bufferToFloat32(pcmBuffer: Buffer): Float32Array {
    const samples = new Float32Array(pcmBuffer.length / 2);

    for (let i = 0; i < samples.length; i++) {
      const int16 = pcmBuffer.readInt16LE(i * 2);
      samples[i] = int16 / 32768;
    }

    return samples;
  }

  private resampleIfNeeded(samples: Float32Array, _chunk: TeamsAudioChunk): Float32Array {
    return samples;
  }

  private flushBuffer(): void {
    if (this.incomingBuffer.length === 0) {
      return;
    }

    const combined = Buffer.concat(this.incomingBuffer);
    const samples = this.bufferToFloat32(combined);

    this.emit("audio", samples, combined, {
      speakerId: null,
      speakerName: "Unknown",
      timestamp: Date.now(),
    });

    this.incomingBuffer = [];
  }

  connected(): boolean {
    return this.isConnected;
  }

  currentCallId(): string | null {
    return this.callId;
  }

  audioFormat(): { sampleRate: number; channels: number; bitsPerSample: number } {
    return {
      sampleRate: this.sampleRate,
      channels: this.channels,
      bitsPerSample: 16,
    };
  }
}
