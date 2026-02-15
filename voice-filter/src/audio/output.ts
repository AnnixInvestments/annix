import { EventEmitter } from "node:events";
import portAudio from "naudiodon";
import type { AudioDevice } from "./capture.js";

export interface AudioOutputOptions {
  deviceId?: number;
  sampleRate?: number;
  channels?: number;
  frameSize?: number;
}

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_CHANNELS = 1;
const DEFAULT_FRAME_SIZE = 512;

interface AudioOutputStream {
  on(event: "error", listener: (err: Error) => void): this;
  start(): void;
  write(buffer: Buffer): void;
  quit(): void;
}

export class AudioOutput extends EventEmitter {
  private stream: AudioOutputStream | null = null;
  private readonly sampleRate: number;
  private readonly channels: number;
  private readonly frameSize: number;
  private readonly deviceId: number | undefined;
  private muted: boolean = false;

  constructor(options: AudioOutputOptions = {}) {
    super();
    this.sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.channels = options.channels ?? DEFAULT_CHANNELS;
    this.frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE;
    this.deviceId = options.deviceId;
  }

  start(): void {
    const outputOptions: Record<string, unknown> = {
      channelCount: this.channels,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: this.sampleRate,
      framesPerBuffer: this.frameSize,
    };

    if (this.deviceId !== undefined) {
      outputOptions.deviceId = this.deviceId;
    }

    this.stream = portAudio.AudioIO({
      outOptions: outputOptions,
    }) as unknown as AudioOutputStream;

    this.stream.on("error", (err: Error | string) => {
      const message = typeof err === "string" ? err : err.message;
      if (message.includes("underflow") || message.includes("overflow")) {
        return;
      }
      this.emit("error", typeof err === "string" ? new Error(err) : err);
    });

    this.stream.start();
    this.emit("started");
  }

  write(samples: Float32Array): void {
    if (!this.stream) {
      return;
    }

    const buffer = Buffer.alloc(samples.length * 2);

    if (this.muted) {
      buffer.fill(0);
    } else {
      for (let i = 0; i < samples.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i]));
        buffer.writeInt16LE(Math.round(sample * 32767), i * 2);
      }
    }

    this.stream.write(buffer);
  }

  writeBuffer(buffer: Buffer): void {
    if (!this.stream) {
      return;
    }

    if (this.muted) {
      const silentBuffer = Buffer.alloc(buffer.length);
      silentBuffer.fill(0);
      this.stream.write(silentBuffer);
    } else {
      this.stream.write(buffer);
    }
  }

  mute(): void {
    this.muted = true;
    this.emit("muted");
  }

  unmute(): void {
    this.muted = false;
    this.emit("unmuted");
  }

  isMuted(): boolean {
    return this.muted;
  }

  stop(): void {
    if (this.stream) {
      this.stream.quit();
      this.stream = null;
      this.emit("stopped");
    }
  }

  sampleRateValue(): number {
    return this.sampleRate;
  }

  channelCount(): number {
    return this.channels;
  }
}

export function findVBCableDevice(): number | null {
  const devices = portAudio.getDevices() as AudioDevice[];
  const vbCable = devices.find(
    (d) => d.name.toLowerCase().includes("cable input") && d.maxOutputChannels > 0,
  );
  return vbCable ? vbCable.id : null;
}
