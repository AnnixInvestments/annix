import { EventEmitter } from "node:events";
import type { SpeakerIdentification, TranscriptEntry } from "./types.js";

export interface TranscriberOptions {
  openaiApiKey: string;
  sampleRate?: number;
}

const SAMPLE_RATE = 16000;

export class Transcriber extends EventEmitter {
  private readonly apiKey: string;
  private readonly sampleRate: number;
  private isTranscribing: boolean = false;

  constructor(options: TranscriberOptions) {
    super();
    this.apiKey = options.openaiApiKey;
    this.sampleRate = options.sampleRate ?? SAMPLE_RATE;
  }

  async transcribe(
    audioBuffer: Buffer,
    speaker: SpeakerIdentification,
  ): Promise<TranscriptEntry | null> {
    if (this.isTranscribing) {
      return null;
    }

    if (audioBuffer.length < this.sampleRate * 2) {
      return null;
    }

    this.isTranscribing = true;

    try {
      const wavBuffer = this.createWavBuffer(audioBuffer);
      const text = await this.callWhisperAPI(wavBuffer);

      if (!text || text.trim().length === 0) {
        this.isTranscribing = false;
        return null;
      }

      const entry: TranscriptEntry = {
        timestamp: speaker.timestamp,
        speakerId: speaker.speakerId,
        speakerName: speaker.speakerName,
        text: text.trim(),
        confidence: speaker.confidence,
      };

      this.emit("transcribed", entry);
      this.isTranscribing = false;
      return entry;
    } catch (error) {
      this.emit("error", error);
      this.isTranscribing = false;
      return null;
    }
  }

  private async callWhisperAPI(wavBuffer: Buffer): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([wavBuffer], { type: "audio/wav" });
    formData.append("file", blob, "audio.wav");
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    return await response.text();
  }

  private createWavBuffer(pcmData: Buffer): Buffer {
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

    return Buffer.concat([header, pcmData]);
  }

  transcribing(): boolean {
    return this.isTranscribing;
  }

  dispose(): void {
    this.isTranscribing = false;
    this.emit("disposed");
  }
}
