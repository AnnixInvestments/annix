import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import FormData from "form-data";
import { nowISO } from "../../lib/datetime";
import type { TeamsBotTranscriptEntry } from "../entities/teams-bot-session.entity";
import { TeamsBotGateway } from "../gateways/teams-bot.gateway";
import { TeamsBotService } from "./teams-bot.service";

const SAMPLE_RATE = 16000;
const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

interface AudioSegment {
  callId: string;
  speakerId: string | null;
  speakerName: string;
  audioData: Buffer[];
  startTime: number;
}

@Injectable()
export class TeamsBotAudioService {
  private readonly logger = new Logger(TeamsBotAudioService.name);
  private readonly openaiApiKey: string;

  private readonly activeSegments: Map<string, AudioSegment> = new Map();
  private readonly audioBuffers: Map<string, Buffer[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly teamsBotService: TeamsBotService,
    @Inject(forwardRef(() => TeamsBotGateway))
    private readonly gateway: TeamsBotGateway,
  ) {
    this.openaiApiKey = this.configService.get<string>("OPENAI_API_KEY") ?? "";
  }

  async processAudioChunk(
    callId: string,
    audioBuffer: Buffer,
    speakerId: string | null,
    speakerName: string,
  ): Promise<void> {
    const bufferKey = `${callId}-${speakerId ?? "unknown"}`;

    if (!this.audioBuffers.has(bufferKey)) {
      this.audioBuffers.set(bufferKey, []);
    }

    const buffers = this.audioBuffers.get(bufferKey)!;
    buffers.push(audioBuffer);

    const totalSize = buffers.reduce((sum, b) => sum + b.length, 0);
    const minSizeForTranscription = SAMPLE_RATE * 2;

    if (totalSize >= minSizeForTranscription) {
      const combinedBuffer = Buffer.concat(buffers);
      this.audioBuffers.set(bufferKey, []);

      await this.transcribeAndEmit(callId, combinedBuffer, speakerId, speakerName);
    }
  }

  async flushAudioBuffer(callId: string): Promise<void> {
    const keysToFlush = Array.from(this.audioBuffers.keys()).filter((key) =>
      key.startsWith(`${callId}-`),
    );

    for (const key of keysToFlush) {
      const buffers = this.audioBuffers.get(key);
      if (buffers && buffers.length > 0) {
        const combinedBuffer = Buffer.concat(buffers);
        const parts = key.split("-");
        const speakerId = parts.slice(1).join("-");

        await this.transcribeAndEmit(
          callId,
          combinedBuffer,
          speakerId === "unknown" ? null : speakerId,
          "Unknown Speaker",
        );
      }
      this.audioBuffers.delete(key);
    }
  }

  private async transcribeAndEmit(
    callId: string,
    audioBuffer: Buffer,
    speakerId: string | null,
    speakerName: string,
  ): Promise<void> {
    if (!this.openaiApiKey) {
      this.logger.warn("OpenAI API key not configured, skipping transcription");
      return;
    }

    try {
      const wavBuffer = this.pcmToWav(audioBuffer);
      const text = await this.transcribeWithWhisper(wavBuffer);

      if (!text || text.trim().length === 0) {
        return;
      }

      const entry: TeamsBotTranscriptEntry = {
        timestamp: nowISO(),
        speakerId,
        speakerName,
        text: text.trim(),
        confidence: 0.9,
      };

      const session = await this.teamsBotService.addTranscriptEntry(callId, entry);

      if (session) {
        this.gateway.emitTranscriptEntry({
          sessionId: session.sessionId,
          callId,
          entry,
        });
      }
    } catch (error) {
      this.logger.error(`Transcription failed for callId=${callId}: ${error}`);
    }
  }

  private async transcribeWithWhisper(wavBuffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append("file", wavBuffer, {
      filename: "audio.wav",
      contentType: "audio/wav",
    });
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    const response = await fetch(WHISPER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
        ...formData.getHeaders(),
      },
      body: formData as unknown as BodyInit,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }

    const result = (await response.json()) as { text: string };
    return result.text;
  }

  private pcmToWav(pcmData: Buffer): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
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
    header.writeUInt32LE(SAMPLE_RATE, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }

  convertTeamsAudioToPcm(teamsAudioBuffer: Buffer, format: string): Buffer {
    if (format === "pcm16") {
      return teamsAudioBuffer;
    }

    if (format === "silk" || format === "opus") {
      this.logger.warn(`Audio format ${format} conversion not implemented, returning raw buffer`);
      return teamsAudioBuffer;
    }

    return teamsAudioBuffer;
  }

  clearSession(callId: string): void {
    const keysToDelete = Array.from(this.audioBuffers.keys()).filter((key) =>
      key.startsWith(`${callId}-`),
    );

    for (const key of keysToDelete) {
      this.audioBuffers.delete(key);
    }

    this.activeSegments.delete(callId);
  }
}
