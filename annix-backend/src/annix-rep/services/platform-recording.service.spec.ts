import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { S3StorageService } from "../../storage/s3-storage.service";
import { Meeting, MeetingRecording } from "../entities";
import {
  PlatformMeetingRecord,
  PlatformRecordingStatus,
} from "../entities/platform-meeting-record.entity";
import { MeetingPlatformService } from "./meeting-platform.service";
import { PlatformRecordingService } from "./platform-recording.service";

describe("PlatformRecordingService", () => {
  let service: PlatformRecordingService;
  let mockRecordRepo: Partial<Repository<PlatformMeetingRecord>>;
  let mockMeetingRecordingRepo: Partial<Repository<MeetingRecording>>;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockPlatformService: Partial<MeetingPlatformService>;
  let mockS3Storage: Partial<S3StorageService>;

  beforeEach(async () => {
    mockRecordRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockMeetingRecordingRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      findOne: jest.fn(),
    };

    mockMeetingRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      createQueryBuilder: jest.fn(),
    };

    mockPlatformService = {
      refreshTokenIfNeeded: jest.fn(),
      providerFor: jest.fn(),
    };

    mockS3Storage = {
      upload: jest.fn(),
      bucket: jest.fn().mockReturnValue("test-bucket"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformRecordingService,
        {
          provide: getRepositoryToken(PlatformMeetingRecord),
          useValue: mockRecordRepo,
        },
        {
          provide: getRepositoryToken(MeetingRecording),
          useValue: mockMeetingRecordingRepo,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: MeetingPlatformService,
          useValue: mockPlatformService,
        },
        {
          provide: S3StorageService,
          useValue: mockS3Storage,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PlatformRecordingService>(PlatformRecordingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("fetchAndStoreRecording", () => {
    it("should return failure when connection is not found", async () => {
      const record = {
        id: 1,
        connection: Promise.resolve(null),
      } as unknown as PlatformMeetingRecord;

      const result = await service.fetchAndStoreRecording(record);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection not found");
      expect(result.s3Path).toBeNull();
    });

    it("should handle no recording files gracefully", async () => {
      const mockConnection = { id: 1, platform: "zoom", userId: 100 };
      const record = {
        id: 1,
        platformMeetingId: "meeting-123",
        recordingStatus: PlatformRecordingStatus.PENDING,
        connection: Promise.resolve(mockConnection),
      } as unknown as PlatformMeetingRecord;

      const mockProvider = {
        meetingRecordings: jest.fn().mockResolvedValue({ recordingFiles: [] }),
      };

      (mockPlatformService.refreshTokenIfNeeded as jest.Mock).mockResolvedValue({});
      (mockPlatformService.providerFor as jest.Mock).mockReturnValue(mockProvider);

      const result = await service.fetchAndStoreRecording(record);

      expect(result.success).toBe(true);
      expect(result.s3Path).toBeNull();
      expect(record.recordingStatus).toBe(PlatformRecordingStatus.NO_RECORDING);
    });

    it("should handle null recording data", async () => {
      const mockConnection = { id: 1, platform: "zoom", userId: 100 };
      const record = {
        id: 1,
        platformMeetingId: "meeting-123",
        recordingStatus: PlatformRecordingStatus.PENDING,
        connection: Promise.resolve(mockConnection),
      } as unknown as PlatformMeetingRecord;

      const mockProvider = {
        meetingRecordings: jest.fn().mockResolvedValue(null),
      };

      (mockPlatformService.refreshTokenIfNeeded as jest.Mock).mockResolvedValue({});
      (mockPlatformService.providerFor as jest.Mock).mockReturnValue(mockProvider);

      const result = await service.fetchAndStoreRecording(record);

      expect(result.success).toBe(true);
      expect(result.s3Path).toBeNull();
    });
  });

  describe("createMeetingRecording", () => {
    it("should return null when record has no s3 storage path", async () => {
      const record = { id: 1, s3StoragePath: null } as unknown as PlatformMeetingRecord;

      const result = await service.createMeetingRecording(record);

      expect(result).toBeNull();
    });

    it("should return existing recording if meeting already has one", async () => {
      const existingRecording = { id: 10, meetingId: 1 } as MeetingRecording;
      const mockMeeting = { id: 1 } as Meeting;

      const record = {
        id: 1,
        s3StoragePath: "recordings/test.m4a",
        meetingId: 1,
        connection: Promise.resolve({ userId: 100 }),
      } as unknown as PlatformMeetingRecord;

      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(mockMeeting);
      (mockMeetingRecordingRepo.findOne as jest.Mock).mockResolvedValue(existingRecording);

      const result = await service.createMeetingRecording(record);

      expect(result).toEqual(existingRecording);
      expect(record.meetingId).toBe(1);
      expect(record.recordingStatus).toBe(PlatformRecordingStatus.PROCESSING);
    });
  });

  describe("markRecordingComplete", () => {
    it("should update recording status to COMPLETED", async () => {
      const record = {
        id: 1,
        recordingStatus: PlatformRecordingStatus.PROCESSING,
      } as PlatformMeetingRecord;

      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(record);

      await service.markRecordingComplete(1);

      expect(record.recordingStatus).toBe(PlatformRecordingStatus.COMPLETED);
      expect(mockRecordRepo.save).toHaveBeenCalledWith(record);
    });

    it("should do nothing when record is not found", async () => {
      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(null);

      await service.markRecordingComplete(999);

      expect(mockRecordRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("markRecordingFailed", () => {
    it("should update recording status to FAILED with error message", async () => {
      const record = {
        id: 1,
        recordingStatus: PlatformRecordingStatus.PROCESSING,
      } as PlatformMeetingRecord;

      (mockRecordRepo.findOne as jest.Mock).mockResolvedValue(record);

      await service.markRecordingFailed(1, "Download timeout");

      expect(record.recordingStatus).toBe(PlatformRecordingStatus.FAILED);
      expect(record.recordingError).toBe("Download timeout");
      expect(mockRecordRepo.save).toHaveBeenCalledWith(record);
    });
  });

  describe("downloadedRecordingsForTranscription", () => {
    it("should return records with DOWNLOADED status ordered by downloadedAt ASC", async () => {
      const records = [
        { id: 1, recordingStatus: PlatformRecordingStatus.DOWNLOADED },
        { id: 2, recordingStatus: PlatformRecordingStatus.DOWNLOADED },
      ];

      (mockRecordRepo.find as jest.Mock).mockResolvedValue(records);

      const result = await service.downloadedRecordingsForTranscription();

      expect(result).toEqual(records);
      expect(mockRecordRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recordingStatus: PlatformRecordingStatus.DOWNLOADED },
          order: { downloadedAt: "ASC" },
          take: 10,
        }),
      );
    });
  });

  describe("processPendingRecordings", () => {
    it("should return empty array when no pending records exist", async () => {
      (mockRecordRepo.find as jest.Mock).mockResolvedValue([]);

      const results = await service.processPendingRecordings();

      expect(results).toEqual([]);
    });
  });
});
