import { Readable } from "node:stream";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { S3StorageService } from "../../storage/s3-storage.service";
import {
  Meeting,
  MeetingRecording,
  MeetingStatus,
  MeetingType,
  RecordingProcessingStatus,
} from "../entities";
import {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "../entities/platform-meeting-record.entity";
import { MeetingPlatformService } from "./meeting-platform.service";

export interface DownloadResult {
  success: boolean;
  recordId: number;
  s3Path: string | null;
  error: string | null;
}

@Injectable()
export class PlatformRecordingService {
  private readonly logger = new Logger(PlatformRecordingService.name);

  constructor(
    @InjectRepository(PlatformMeetingRecord)
    private readonly recordRepo: Repository<PlatformMeetingRecord>,
    @InjectRepository(MeetingRecording)
    private readonly meetingRecordingRepo: Repository<MeetingRecording>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    private readonly platformService: MeetingPlatformService,
    private readonly s3Storage: S3StorageService,
    private readonly configService: ConfigService,
  ) {}

  async fetchAndStoreRecording(record: PlatformMeetingRecord): Promise<DownloadResult> {
    const connection = await record.connection;

    if (!connection) {
      this.logger.error(`No connection found for record ${record.id}`);
      return {
        success: false,
        recordId: record.id,
        s3Path: null,
        error: "Connection not found",
      };
    }

    record.recordingStatus = PlatformRecordingStatus.DOWNLOADING;
    await this.recordRepo.save(record);

    const config = await this.platformService.refreshTokenIfNeeded(connection);
    const provider = this.platformService.providerFor(connection.platform);

    const recordingData = await provider.meetingRecordings(config, record.platformMeetingId);

    if (!recordingData || recordingData.recordingFiles.length === 0) {
      record.recordingStatus = PlatformRecordingStatus.NO_RECORDING;
      record.fetchedAt = now().toJSDate();
      await this.recordRepo.save(record);

      return {
        success: true,
        recordId: record.id,
        s3Path: null,
        error: null,
      };
    }

    const audioFile = recordingData.recordingFiles.find(
      (f) =>
        f.fileType.includes("audio") ||
        f.fileType === "M4A" ||
        f.fileExtension === "m4a" ||
        f.fileExtension === "mp3",
    );

    const fileToDownload = audioFile ?? recordingData.recordingFiles[0];

    record.platformRecordingId = fileToDownload.recordingId;
    record.recordingUrl = fileToDownload.downloadUrl;
    record.recordingPassword = fileToDownload.password;
    record.recordingFileType = fileToDownload.fileType;
    record.recordingFileSizeBytes = fileToDownload.fileSizeBytes;
    record.rawRecordingData = recordingData.rawData;

    await this.recordRepo.save(record);

    const buffer = await provider.downloadRecording(config, fileToDownload.downloadUrl);

    const timestamp = now().toFormat("yyyyMMdd-HHmmss");
    const filename = `${timestamp}-${record.platformMeetingId}.${fileToDownload.fileExtension}`;
    const s3Path = `platform-recordings/${connection.platform}/${connection.userId}/${filename}`;

    const multerFile: Express.Multer.File = {
      buffer,
      originalname: filename,
      mimetype: this.mimeTypeFromExtension(fileToDownload.fileExtension),
      size: buffer.length,
      fieldname: "file",
      encoding: "7bit",
      destination: "",
      filename,
      path: "",
      stream: Readable.from(buffer),
    };

    const result = await this.s3Storage.upload(multerFile, "platform-recordings");

    record.s3StoragePath = result.path;
    record.s3StorageBucket = this.s3Storage.getBucket();
    record.recordingStatus = PlatformRecordingStatus.DOWNLOADED;
    record.downloadedAt = now().toJSDate();

    await this.recordRepo.save(record);

    this.logger.log(
      `Recording downloaded for record ${record.id}: ${result.path} (${buffer.length} bytes)`,
    );

    return {
      success: true,
      recordId: record.id,
      s3Path: result.path,
      error: null,
    };
  }

  async processPendingRecordings(limit: number = 10): Promise<DownloadResult[]> {
    const pendingRecords = await this.recordRepo.find({
      where: { recordingStatus: PlatformRecordingStatus.PENDING },
      relations: ["connection"],
      take: limit,
      order: { startTime: "DESC" },
    });

    const results: DownloadResult[] = [];

    for (const record of pendingRecords) {
      const result = await this.fetchAndStoreRecording(record);
      results.push(result);

      if (result.success && result.s3Path) {
        await this.createMeetingRecording(record);
      }
    }

    return results;
  }

  async createMeetingRecording(record: PlatformMeetingRecord): Promise<MeetingRecording | null> {
    if (!record.s3StoragePath) {
      return null;
    }

    const linkedMeeting = await this.findOrCreateLinkedMeeting(record);

    if (!linkedMeeting) {
      this.logger.warn(`Could not find or create linked meeting for record ${record.id}`);
      return null;
    }

    const existingRecording = await this.meetingRecordingRepo.findOne({
      where: { meetingId: linkedMeeting.id },
    });

    if (existingRecording) {
      this.logger.log(`Meeting ${linkedMeeting.id} already has a recording`);
      record.meetingId = linkedMeeting.id;
      record.recordingStatus = PlatformRecordingStatus.PROCESSING;
      await this.recordRepo.save(record);
      return existingRecording;
    }

    const meetingRecording = this.meetingRecordingRepo.create({
      meetingId: linkedMeeting.id,
      storagePath: record.s3StoragePath,
      storageBucket: record.s3StorageBucket ?? this.s3Storage.getBucket(),
      originalFilename: record.title,
      mimeType: this.mimeTypeFromExtension(record.recordingFileType ?? "mp4"),
      fileSizeBytes: record.recordingFileSizeBytes ?? 0,
      durationSeconds: record.durationSeconds,
      processingStatus: RecordingProcessingStatus.PROCESSING,
    });

    const saved = await this.meetingRecordingRepo.save(meetingRecording);

    record.meetingId = linkedMeeting.id;
    record.recordingStatus = PlatformRecordingStatus.PROCESSING;
    record.processedAt = now().toJSDate();
    await this.recordRepo.save(record);

    this.logger.log(
      `Created MeetingRecording ${saved.id} for meeting ${linkedMeeting.id} from platform record ${record.id}`,
    );

    return saved;
  }

  private async findOrCreateLinkedMeeting(record: PlatformMeetingRecord): Promise<Meeting | null> {
    if (record.meetingId) {
      return this.meetingRepo.findOne({ where: { id: record.meetingId } });
    }

    const connection = await record.connection;
    if (!connection) {
      return null;
    }

    if (record.joinUrl) {
      const meetingByUrl = await this.meetingRepo
        .createQueryBuilder("m")
        .leftJoin("m.calendarEvent", "e")
        .where("e.meeting_url = :url", { url: record.joinUrl })
        .andWhere("m.sales_rep_id = :userId", { userId: connection.userId })
        .getOne();

      if (meetingByUrl) {
        return meetingByUrl;
      }
    }

    const startWindow = new Date(record.startTime.getTime() - 30 * 60 * 1000);
    const endWindow = new Date(record.startTime.getTime() + 30 * 60 * 1000);

    const meetingByTime = await this.meetingRepo
      .createQueryBuilder("m")
      .where("m.sales_rep_id = :userId", { userId: connection.userId })
      .andWhere("m.scheduled_start >= :start", { start: startWindow })
      .andWhere("m.scheduled_start <= :end", { end: endWindow })
      .andWhere("m.title ILIKE :title", { title: `%${record.title.substring(0, 50)}%` })
      .getOne();

    if (meetingByTime) {
      return meetingByTime;
    }

    const newMeeting = new Meeting();
    newMeeting.salesRepId = connection.userId;
    newMeeting.title = record.title;
    newMeeting.description = record.topic;
    newMeeting.meetingType = MeetingType.VIDEO;
    newMeeting.status = MeetingStatus.COMPLETED;
    newMeeting.scheduledStart = record.startTime;
    newMeeting.scheduledEnd =
      record.endTime ??
      new Date(record.startTime.getTime() + (record.durationSeconds ?? 3600) * 1000);
    newMeeting.actualStart = record.startTime;
    newMeeting.actualEnd = record.endTime;
    newMeeting.attendees = record.participants;

    const saved = await this.meetingRepo.save(newMeeting);
    this.logger.log(`Created new meeting ${saved.id} from platform record ${record.id}`);

    return saved;
  }

  async markRecordingComplete(recordId: number): Promise<void> {
    const record = await this.recordRepo.findOne({ where: { id: recordId } });
    if (record) {
      record.recordingStatus = PlatformRecordingStatus.COMPLETED;
      await this.recordRepo.save(record);
    }
  }

  async markRecordingFailed(recordId: number, error: string): Promise<void> {
    const record = await this.recordRepo.findOne({ where: { id: recordId } });
    if (record) {
      record.recordingStatus = PlatformRecordingStatus.FAILED;
      record.recordingError = error;
      await this.recordRepo.save(record);
    }
  }

  async downloadedRecordingsForTranscription(): Promise<PlatformMeetingRecord[]> {
    return this.recordRepo.find({
      where: { recordingStatus: PlatformRecordingStatus.DOWNLOADED },
      relations: ["connection"],
      order: { downloadedAt: "ASC" },
      take: 10,
    });
  }

  private mimeTypeFromExtension(ext: string): string {
    const types: Record<string, string> = {
      mp4: "video/mp4",
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      webm: "video/webm",
      ogg: "audio/ogg",
    };
    return types[ext.toLowerCase()] ?? "application/octet-stream";
  }
}
