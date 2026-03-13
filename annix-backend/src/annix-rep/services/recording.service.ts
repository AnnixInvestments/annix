import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
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

const PRESIGNED_URL_EXPIRY_SECONDS = 3600;
const STALE_SESSION_THRESHOLD_HOURS = 1;

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
  private readonly tempDir: string;
  private readonly uploadSessions: Map<number, ChunkUploadSession> = new Map();

  constructor(
    @InjectRepository(MeetingRecording)
    private readonly recordingRepo: Repository<MeetingRecording>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly configService: ConfigService,
  ) {
    this.tempDir = path.join(os.tmpdir(), "annix-rep-recordings");
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
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
    const storagePath = `${StorageArea.ANNIX_REP}/recordings/${meeting.id}/${timestamp}-${sanitizedFilename}`;

    const recording = this.recordingRepo.create({
      meetingId: dto.meetingId,
      storagePath,
      storageBucket: "s3",
      originalFilename: dto.filename,
      mimeType: dto.mimeType,
      fileSizeBytes: 0,
      sampleRate: dto.sampleRate ?? 16000,
      channels: dto.channels ?? 1,
      processingStatus: RecordingProcessingStatus.UPLOADING,
    });

    const saved = await this.recordingRepo.save(recording);

    const tempPath = path.join(this.tempDir, `recording-${saved.id}`);
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }

    this.uploadSessions.set(saved.id, {
      recordingId: saved.id,
      storagePath: tempPath,
      chunks: [],
      startedAt: now().toJSDate(),
      lastChunkAt: now().toJSDate(),
    });

    const apiBaseUrl =
      this.configService.get<string>("API_BASE_URL") ?? "http://localhost:4001/api";
    const uploadUrl = `${apiBaseUrl}/annix-rep/recordings/${saved.id}/chunk`;

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
      const tempPath = path.join(this.tempDir, `recording-${recordingId}`);
      if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
      }
      session = {
        recordingId,
        storagePath: tempPath,
        chunks: [],
        startedAt: now().toJSDate(),
        lastChunkAt: now().toJSDate(),
      };
      this.uploadSessions.set(recordingId, session);
    }

    const chunkPath = path.join(session.storagePath, `chunk-${chunkIndex}`);
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
    const assembledPath = path.join(session.storagePath, "assembled");

    const writeStream = fs.createWriteStream(assembledPath);

    for (const chunkIndex of sortedChunks) {
      const chunkPath = path.join(session.storagePath, `chunk-${chunkIndex}`);
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

    const stats = fs.statSync(assembledPath);
    const fileBuffer = fs.readFileSync(assembledPath);

    const multerFile: Express.Multer.File = {
      fieldname: "file",
      originalname: recording.originalFilename ?? `recording-${recording.id}`,
      encoding: "7bit",
      mimetype: recording.mimeType,
      size: stats.size,
      buffer: fileBuffer,
      stream: null as never,
      destination: "",
      filename: "",
      path: "",
    };

    const subPath = `${StorageArea.ANNIX_REP}/recordings/${recording.meetingId}`;
    const storageResult = await this.storageService.upload(multerFile, subPath);

    fs.unlinkSync(assembledPath);
    fs.rmdirSync(session.storagePath, { recursive: true });

    recording.storagePath = storageResult.path;
    recording.fileSizeBytes = stats.size;
    recording.durationSeconds = dto.durationSeconds ?? null;
    recording.processingStatus = RecordingProcessingStatus.PROCESSING;

    const saved = await this.recordingRepo.save(recording);

    this.uploadSessions.delete(recordingId);

    this.logger.log(
      `Recording upload completed: ${recordingId}, size: ${stats.size} bytes, path: ${storageResult.path}`,
    );

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

    try {
      await this.storageService.delete(recording.storagePath);
    } catch (error) {
      this.logger.warn(`Failed to delete storage file for recording ${recordingId}: ${error}`);
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
    const staleThreshold = now().minus({ hours: STALE_SESSION_THRESHOLD_HOURS }).toJSDate();

    for (const [recordingId, session] of this.uploadSessions.entries()) {
      if (session.lastChunkAt < staleThreshold) {
        if (fs.existsSync(session.storagePath)) {
          fs.rmSync(session.storagePath, { recursive: true, force: true });
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
  ): Promise<{ presignedUrl: string; mimeType: string; fileSize: number } | null> {
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

    const exists = await this.storageService.exists(recording.storagePath);
    if (!exists) {
      return null;
    }

    const presignedUrl = await this.storageService.presignedUrl(
      recording.storagePath,
      PRESIGNED_URL_EXPIRY_SECONDS,
    );

    return {
      presignedUrl,
      mimeType: recording.mimeType,
      fileSize: Number(recording.fileSizeBytes),
    };
  }
}
