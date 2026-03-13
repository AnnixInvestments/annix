import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { Meeting } from "../entities/meeting.entity";
import { MeetingRecording, RecordingProcessingStatus } from "../entities/meeting-recording.entity";
import { RecordingService } from "./recording.service";

describe("RecordingService", () => {
  let service: RecordingService;
  let mockRecordingRepo: Partial<Repository<MeetingRecording>>;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockStorageService: Partial<IStorageService>;

  const mockConfigService = {
    get: jest.fn().mockReturnValue("./uploads"),
  };

  beforeEach(async () => {
    mockRecordingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    mockMeetingRepo = {
      findOne: jest.fn(),
    };

    mockStorageService = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      presignedUrl: jest.fn(),
      publicUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordingService,
        {
          provide: getRepositoryToken(MeetingRecording),
          useValue: mockRecordingRepo,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RecordingService>(RecordingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("initiateUpload", () => {
    it("should create recording with S3 bucket and fieldflow prefix", async () => {
      const mockMeeting = { id: 1, salesRepId: 100 };
      const mockRecording = {
        id: 1,
        meetingId: 1,
        storagePath: "fieldflow/recordings/1/20250302-120000-test.webm",
        storageBucket: "s3",
        originalFilename: "test.webm",
        mimeType: "audio/webm",
        fileSizeBytes: 0,
        processingStatus: RecordingProcessingStatus.UPLOADING,
      };

      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(mockMeeting);
      (mockRecordingRepo.create as jest.Mock).mockReturnValue(mockRecording);
      (mockRecordingRepo.save as jest.Mock).mockResolvedValue(mockRecording);

      const result = await service.initiateUpload(100, {
        meetingId: 1,
        filename: "test.webm",
        mimeType: "audio/webm",
      });

      expect(result).toBeDefined();
      expect(mockRecordingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storageBucket: "s3",
        }),
      );
      const createCall = (mockRecordingRepo.create as jest.Mock).mock.calls[0][0];
      expect(createCall.storagePath).toMatch(/^fieldflow\/recordings\/1\//);
    });

    it("should throw error if meeting not found", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.initiateUpload(100, {
          meetingId: 999,
          filename: "test.webm",
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("Meeting not found");
    });

    it("should throw error if user does not own meeting (meeting not found due to salesRepId filter)", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.initiateUpload(100, {
          meetingId: 1,
          filename: "test.webm",
          mimeType: "audio/webm",
        }),
      ).rejects.toThrow("Meeting not found");
    });
  });

  describe("audioStream", () => {
    it("should return presigned URL for existing recording", async () => {
      const mockRecording = {
        id: 1,
        meetingId: 1,
        storagePath: "fieldflow/recordings/1/test.webm",
        mimeType: "audio/webm",
        fileSizeBytes: 1024,
        meeting: { salesRepId: 100 },
      };

      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockStorageService.exists as jest.Mock).mockResolvedValue(true);
      (mockStorageService.presignedUrl as jest.Mock).mockResolvedValue(
        "https://s3.example.com/presigned-url",
      );

      const result = await service.audioStream(100, 1);

      expect(result).toEqual({
        presignedUrl: "https://s3.example.com/presigned-url",
        mimeType: "audio/webm",
        fileSize: 1024,
      });
      expect(mockStorageService.presignedUrl).toHaveBeenCalledWith(
        "fieldflow/recordings/1/test.webm",
        3600,
      );
    });

    it("should return null if recording not found", async () => {
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.audioStream(100, 999);

      expect(result).toBeNull();
    });

    it("should return null if user does not own recording", async () => {
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        meeting: { salesRepId: 999 },
      });

      const result = await service.audioStream(100, 1);

      expect(result).toBeNull();
    });

    it("should return null if file does not exist in S3", async () => {
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        storagePath: "fieldflow/recordings/1/test.webm",
        meeting: { salesRepId: 100 },
      });
      (mockStorageService.exists as jest.Mock).mockResolvedValue(false);

      const result = await service.audioStream(100, 1);

      expect(result).toBeNull();
    });
  });

  describe("deleteRecording", () => {
    it("should delete recording from S3 and database", async () => {
      const mockRecording = {
        id: 1,
        storagePath: "fieldflow/recordings/1/test.webm",
        meeting: { salesRepId: 100 },
      };

      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockStorageService.delete as jest.Mock).mockResolvedValue(undefined);
      (mockRecordingRepo.remove as jest.Mock).mockResolvedValue(mockRecording);

      await service.deleteRecording(100, 1);

      expect(mockStorageService.delete).toHaveBeenCalledWith("fieldflow/recordings/1/test.webm");
      expect(mockRecordingRepo.remove).toHaveBeenCalledWith(mockRecording);
    });

    it("should still delete from database if S3 delete fails", async () => {
      const mockRecording = {
        id: 1,
        storagePath: "fieldflow/recordings/1/test.webm",
        meeting: { salesRepId: 100 },
      };

      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockStorageService.delete as jest.Mock).mockRejectedValue(new Error("S3 error"));
      (mockRecordingRepo.remove as jest.Mock).mockResolvedValue(mockRecording);

      await service.deleteRecording(100, 1);

      expect(mockRecordingRepo.remove).toHaveBeenCalledWith(mockRecording);
    });
  });
});
