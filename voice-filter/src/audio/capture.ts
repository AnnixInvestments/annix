import { EventEmitter } from "node:events";
import portAudio from "naudiodon";

export interface AudioDevice {
  id: number;
  name: string;
  maxInputChannels: number;
  maxOutputChannels: number;
  defaultSampleRate: number;
  hostAPIName: string;
}

export interface AudioCaptureOptions {
  deviceId?: number;
  sampleRate?: number;
  channels?: number;
  frameSize?: number;
}

const DEFAULT_SAMPLE_RATE = 16000;
const DEFAULT_CHANNELS = 1;
const DEFAULT_FRAME_SIZE = 512;

export function listInputDevices(): AudioDevice[] {
  const devices = portAudio.getDevices() as AudioDevice[];
  return devices
    .filter((d) => d.maxInputChannels > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      maxInputChannels: d.maxInputChannels,
      maxOutputChannels: d.maxOutputChannels,
      defaultSampleRate: d.defaultSampleRate,
      hostAPIName: d.hostAPIName,
    }));
}

export function listOutputDevices(): AudioDevice[] {
  const devices = portAudio.getDevices() as AudioDevice[];
  return devices
    .filter((d) => d.maxOutputChannels > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      maxInputChannels: d.maxInputChannels,
      maxOutputChannels: d.maxOutputChannels,
      defaultSampleRate: d.defaultSampleRate,
      hostAPIName: d.hostAPIName,
    }));
}

export function defaultInputDevice(): AudioDevice | null {
  const devices = listInputDevices();
  return devices.length > 0 ? devices[0] : null;
}

const VIRTUAL_DEVICE_PATTERNS = ["cable", "vb-audio", "virtual", "voicemeeter", "stereo mix"];

function isVirtualDevice(device: AudioDevice): boolean {
  const nameLower = device.name.toLowerCase();
  return VIRTUAL_DEVICE_PATTERNS.some((pattern) => nameLower.includes(pattern));
}

export function findRealMicrophone(): AudioDevice | null {
  const devices = listInputDevices();
  const realMics = devices.filter((d) => !isVirtualDevice(d));

  if (realMics.length === 0) {
    return devices.length > 0 ? devices[0] : null;
  }

  const preferredMic = realMics.find(
    (d) => d.name.toLowerCase().includes("microphone") || d.name.toLowerCase().includes("mic"),
  );

  return preferredMic ?? realMics[0];
}

export function defaultOutputDevice(): AudioDevice | null {
  const devices = listOutputDevices();
  return devices.length > 0 ? devices[0] : null;
}

interface AudioStream {
  on(event: "data", listener: (buffer: Buffer) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  start(): void;
  quit(): void;
}

export class AudioCapture extends EventEmitter {
  private stream: AudioStream | null = null;
  private readonly sampleRate: number;
  private readonly channels: number;
  private readonly frameSize: number;
  private readonly deviceId: number | undefined;

  constructor(options: AudioCaptureOptions = {}) {
    super();
    this.sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.channels = options.channels ?? DEFAULT_CHANNELS;
    this.frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE;
    this.deviceId = options.deviceId;
  }

  start(): void {
    const inputOptions: Record<string, unknown> = {
      channelCount: this.channels,
      sampleFormat: portAudio.SampleFormat16Bit,
      sampleRate: this.sampleRate,
      framesPerBuffer: this.frameSize,
    };

    if (this.deviceId !== undefined) {
      inputOptions.deviceId = this.deviceId;
    }

    this.stream = portAudio.AudioIO({
      inOptions: inputOptions,
    }) as unknown as AudioStream;

    this.stream.on("data", (buffer: Buffer) => {
      if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length % 2 !== 0) {
        return;
      }
      const samples = new Float32Array(buffer.length / 2);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = buffer.readInt16LE(i * 2) / 32768;
      }
      this.emit("audio", samples, buffer);
    });

    this.stream.on("error", (err: Error) => {
      this.emit("error", err);
    });

    this.stream.start();
    this.emit("started");
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

  frameSizeValue(): number {
    return this.frameSize;
  }
}
