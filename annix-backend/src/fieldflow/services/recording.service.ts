import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  CompleteUploadDto,
  InitiateUploadDto,
  InitiateUploadResponseDto,
  RecordingResponseDto,
  RecordingWithSegmentsDto,
  UpdateSpeakerLabelsDto,
} from "../dto";
import {
  Meeting,
  MeetingRecording,
  RecordingProcessingStatus,
  type SpeakerSegment,
} from "../entities";

interface ChunkUploadSession {
  recordingId: number;
  storagePath: string;
  chunks: number[];
  startedAt: Date;
  lastChunkAt: Date;
}

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private readonly uploadDir: string;
  private readonly uploadSessions: Map<number, ChunkUploadSession> = new Map();

  constructor(
    @InjectRepository(MeetingRecording)
    private readonly recordingRepo: Repository<MeetingRecording>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>("UPLOAD_DIR") ?? "./uploads";
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    const recordingsDir = path.join(this.uploadDir, "recordings");
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
  }

  async initiateUpload(userId: number, dto: InitiateUploadDto): Promise<InitiateUploadResponseDto> {
    const meeting = await this.meetingRepo.findOne({
      where: { id: dto.meetingId, salesRepId: userId },
    });

    if (!meeting) {
      throw new NotFoundException("Meeting not found");
    }

    const existingRecording = await this.recordingRepo.findOne({
      where: { meetingId: dto.meetingId },
    });

    if (existingRecording) {
      throw new BadRequestException("Recording already exists for this meeting");
    }

    const timestamp = now().toFormat("yyyyMMdd-HHmmss");
    const sanitizedFilename = dto.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `recordings/${meeting.id}/${timestamp}-${sanitizedFilename}`;

    const recording = this.recordingRepo.create({
      meetingId: dto.meetingId,
      storagePath,
      storageBucket: "local",
      originalFilename: dto.filename,
      mimeType: dto.mimeType,
      fileSizeBytes: 0,
      sampleRate: dto.sampleRate ?? 16000,
      channels: dto.channels ?? 1,
      processingStatus: RecordingProcessingStatus.UPLOADING,
    });

    const saved = await this.recordingRepo.save(recording);

    const fullPath = path.join(this.uploadDir, storagePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.uploadSessions.set(saved.id, {
      recordingId: saved.id,
      storagePath: fullPath,
      chunks: [],
      startedAt: now().toJSDate(),
      lastChunkAt: now().toJSDate(),
    });

    const apiBaseUrl = this.configService.get<string>("API_BASE_URL") ?? "http://localhost:4001";
    const uploadUrl = `${apiBaseUrl}/fieldflow/recordings/${saved.id}/chunk`;

    this.logger.log(`Recording upload initiated: ${saved.id} for meeting ${dto.meetingId}`);

    return {
      recordingId: saved.id,
      uploadUrl,
      uploadMethod: "POST",
      uploadHeaders: { "Content-Type": "application/octet-stream" },
      expiresAt: now().plus({ hours: 1 }).toJSDate(),
    };
  }

  async uploadChunk(
    userId: number,
    recordingId: number,
    chunkIndex: number,
    data: Buffer,
  ): Promise<{ chunkIndex: number; bytesReceived: number }> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: ["meeting"],
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    if (recording.meeting.salesRepId !== userId) {
      throw new NotFoundException("Recording not found");
    }

    if (recording.processingStatus !== RecordingProcessingStatus.UPLOADING) {
      throw new BadRequestException("Recording is not in uploading state");
    }

    let session = this.uploadSessions.get(recordingId);
    if (!session) {
      const fullPath = path.join(this.uploadDir, recording.storagePath);
      session = {
        recordingId,
        storagePath: fullPath,
        chunks: [],
        startedAt: now().toJSDate(),
        lastChunkAt: now().toJSDate(),
      };
      this.uploadSessions.set(recordingId, session);
    }

    const chunkPath = `${session.storagePath}.chunk${chunkIndex}`;
    fs.writeFileSync(chunkPath, data);

    session.chunks.push(chunkIndex);
    session.lastChunkAt = now().toJSDate();

    this.logger.debug(
      `Chunk ${chunkIndex} uploaded for recording ${recordingId}: ${data.length} bytes`,
    );

    return {
      chunkIndex,
      bytesReceived: data.length,
    };
  }

  async completeUpload(
    userId: number,
    recordingId: number,
    dto: CompleteUploadDto,
  ): Promise<RecordingResponseDto> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: ["meeting"],
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    if (recording.meeting.salesRepId !== userId) {
      throw new NotFoundException("Recording not found");
    }

    const session = this.uploadSessions.get(recordingId);
    if (!session) {
      throw new BadRequestException("No upload session found");
    }

    const sortedChunks = [...session.chunks].sort((a, b) => a - b);
    const fullPath = session.storagePath;

    const writeStream = fs.createWriteStream(fullPath);

    for (const chunkIndex of sortedChunks) {
      const chunkPath = `${session.storagePath}.chunk${chunkIndex}`;
      if (fs.existsSync(chunkPath)) {
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
        fs.unlinkSync(chunkPath);
      }
    }

    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const stats = fs.statSync(fullPath);

    recording.fileSizeBytes = stats.size;
    recording.durationSeconds = dto.durationSeconds ?? null;
    recording.processingStatus = RecordingProcessingStatus.PROCESSING;

    const saved = await this.recordingRepo.save(recording);

    this.uploadSessions.delete(recordingId);

    this.logger.log(`Recording upload completed: ${recordingId}, size: ${stats.size} bytes`);

    return this.toRecordingResponse(saved);
  }

  async recording(userId: number, recordingId: number): Promise<RecordingWithSegmentsDto> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: ["meeting"],
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    if (recording.meeting.salesRepId !== userId) {
      throw new NotFoundException("Recording not found");
    }

    return this.toRecordingWithSegments(recording);
  }

  async recordingByMeeting(
    userId: number,
    meetingId: number,
  ): Promise<RecordingWithSegmentsDto | null> {
    const recording = await this.recordingRepo.findOne({
      where: { meetingId },
      relations: ["meeting"],
    });

    if (!recording) {
      return null;
    }

    if (recording.meeting.salesRepId !== userId) {
      return null;
    }

    return this.toRecordingWithSegments(recording);
  }

  async updateSpeakerLabels(
    userId: number,
    recordingId: number,
    dto: UpdateSpeakerLabelsDto,
  ): Promise<RecordingResponseDto> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: ["meeting"],
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    if (recording.meeting.salesRepId !== userId) {
      throw new NotFoundException("Recording not found");
    }

    recording.speakerLabels = dto.speakerLabels;

    const saved = await this.recordingRepo.save(recording);

    this.logger.log(`Speaker labels updated for recording ${recordingId}`);

    return this.toRecordingResponse(saved);
  }

  async deleteRecording(userId: number, recordingId: number): Promise<void> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: ["meeting"],
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    if (recording.meeting.salesRepId !== userId) {
      throw new NotFoundException("Recording not found");
    }

    const fullPath = path.join(this.uploadDir, recording.storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await this.recordingRepo.remove(recording);

    this.logger.log(`Recording deleted: ${recordingId}`);
  }

  async storeSpeakerSegments(recordingId: number, segments: SpeakerSegment[]): Promise<void> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    const uniqueSpeakers = new Set(segments.map((s) => s.speakerLabel));

    recording.speakerSegments = segments;
    recording.detectedSpeakersCount = uniqueSpeakers.size;
    recording.processingStatus = RecordingProcessingStatus.COMPLETED;

    await this.recordingRepo.save(recording);

    this.logger.log(
      `Speaker segments stored for recording ${recordingId}: ${segments.length} segments, ${uniqueSpeakers.size} speakers`,
    );
  }

  async markProcessingFailed(recordingId: number, error: string): Promise<void> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
    });

    if (!recording) return;

    recording.processingStatus = RecordingProcessingStatus.FAILED;
    recording.processingError = error;

    await this.recordingRepo.save(recording);

    this.logger.error(`Recording processing failed: ${recordingId} - ${error}`);
  }

  async cleanupStaleSessions(): Promise<void> {
    const staleThreshold = now().minus({ hours: 1 }).toJSDate();

    for (const [recordingId, session] of this.uploadSessions.entries()) {
      if (session.lastChunkAt < staleThreshold) {
        for (const chunkIndex of session.chunks) {
          const chunkPath = `${session.storagePath}.chunk${chunkIndex}`;
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }

        this.uploadSessions.delete(recordingId);

        const recording = await this.recordingRepo.findOne({
          where: { id: recordingId },
        });

        if (recording && recording.processingStatus === RecordingProcessingStatus.UPLOADING) {
          recording.processingStatus = RecordingProcessingStatus.FAILED;
          recording.processingError = "Upload timed out";
          await this.recordingRepo.save(recording);
        }

        this.logger.warn(`Cleaned up stale upload session: ${recordingId}`);
      }
    }
  }

  private toRecordingResponse(recording: MeetingRecording): RecordingResponseDto {
    return {
      id: recording.id,
      meetingId: recording.meetingId,
      processingStatus: recording.processingStatus,
      originalFilename: recording.originalFilename,
      mimeType: recording.mimeType,
      fileSizeBytes: Number(recording.fileSizeBytes),
      durationSeconds: recording.durationSeconds,
      sampleRate: recording.sampleRate,
      channels: recording.channels,
      detectedSpeakersCount: recording.detectedSpeakersCount,
      speakerLabels: recording.speakerLabels,
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    };
  }

  private toRecordingWithSegments(recording: MeetingRecording): RecordingWithSegmentsDto {
    return {
      ...this.toRecordingResponse(recording),
      speakerSegments: recording.speakerSegments,
    };
  }

  async audioStream(
    userId: number,
    recordingId: number,
  ): Promise<{ filePath: string; mimeType: string; fileSize: number } | null> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
      relations: ["meeting"],
    });

    if (!recording) {
      return null;
    }

    if (recording.meeting.salesRepId !== userId) {
      return null;
    }

    const fullPath = path.join(this.uploadDir, recording.storagePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const stats = fs.statSync(fullPath);

    return {
      filePath: fullPath,
      mimeType: recording.mimeType,
      fileSize: stats.size,
    };
  }
}
