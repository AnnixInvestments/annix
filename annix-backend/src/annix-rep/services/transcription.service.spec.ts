import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  MeetingRecording,
  MeetingTranscript,
  RecordingProcessingStatus,
} from "../entities";
import { TranscriptionService } from "./transcription.service";

describe("TranscriptionService", () => {
  let service: TranscriptionService;
  let mockRecordingRepo: Partial<Repository<MeetingRecording>>;
  let mockTranscriptRepo: Partial<Repository<MeetingTranscript>>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        WHISPER_API_URL: "http://localhost:8000",
        UPLOAD_DIR: "./uploads",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockRecordingRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockTranscriptRepo = {
      create: jest.fn().mockImplementation((data) => ({ id: 1, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: getRepositoryToken(MeetingRecording),
          useValue: mockRecordingRepo,
        },
        {
          provide: getRepositoryToken(MeetingTranscript),
          useValue: mockTranscriptRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("transcribeRecording", () => {
    it("should throw NotFoundException when recording does not exist", async () => {
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.transcribeRecording(999)).rejects.toThrow(NotFoundException);
      await expect(service.transcribeRecording(999)).rejects.toThrow("Recording 999 not found");
    });

    it("should return existing transcript if one already exists", async () => {
      const mockRecording = { id: 1, storagePath: "test.webm" };
      const mockTranscript = { id: 10, recordingId: 1, fullText: "Hello world" };

      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      const result = await service.transcribeRecording(1);

      expect(result).toEqual(mockTranscript);
      expect(mockRecordingRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("updateSegments", () => {
    const mockSegments = [
      { startTime: 0, endTime: 5, text: "Hello", speakerLabel: "Speaker A", confidence: 0.9 },
      { startTime: 5, endTime: 10, text: "World", speakerLabel: "Speaker B", confidence: 0.8 },
    ];

    const mockTranscript = {
      id: 1,
      recordingId: 1,
      segments: mockSegments,
      fullText: "Hello World",
      wordCount: 2,
      recording: {
        meeting: { salesRepId: 100 },
      },
    };

    it("should throw NotFoundException when transcript does not exist", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSegments(100, 999, { segments: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user is not the meeting owner", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      await expect(
        service.updateSegments(200, 1, { segments: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for invalid segment indices", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      await expect(
        service.updateSegments(100, 1, {
          segments: [{ index: 5, speakerLabel: "New Speaker" }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for negative segment indices", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      await expect(
        service.updateSegments(100, 1, {
          segments: [{ index: -1, speakerLabel: "New Speaker" }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should update segment speaker labels", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue({ ...mockTranscript });
      (mockTranscriptRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve({ ...entity }),
      );

      const result = await service.updateSegments(100, 1, {
        segments: [{ index: 0, speakerLabel: "John" }],
      });

      expect(mockTranscriptRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should update segment text", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue({ ...mockTranscript });
      (mockTranscriptRepo.save as jest.Mock).mockImplementation((entity) =>
        Promise.resolve({ ...entity }),
      );

      const result = await service.updateSegments(100, 1, {
        segments: [{ index: 1, text: "Updated text" }],
      });

      expect(mockTranscriptRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("deleteTranscript", () => {
    it("should remove transcript if it exists", async () => {
      const mockTranscript = { id: 1, recordingId: 1 };
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      await service.deleteTranscript(1);

      expect(mockTranscriptRepo.remove).toHaveBeenCalledWith(mockTranscript);
    });

    it("should do nothing if transcript does not exist", async () => {
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(null);

      await service.deleteTranscript(1);

      expect(mockTranscriptRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe("alignSpeakerLabels (via transcribeRecording)", () => {
    it("should assign default speaker label when no speaker segments exist", () => {
      const whisperSegments = [
        { start_time: 0, end_time: 5, text: "Hello", confidence: 0.9 },
      ];

      const result = (service as any).alignSpeakerLabels(whisperSegments, [], {});

      expect(result).toEqual([
        {
          startTime: 0,
          endTime: 5,
          text: "Hello",
          speakerLabel: "Speaker",
          confidence: 0.9,
        },
      ]);
    });

    it("should align whisper segments to speaker segments by overlap", () => {
      const whisperSegments = [
        { start_time: 0, end_time: 5, text: "Hello", confidence: 0.9 },
        { start_time: 5, end_time: 10, text: "World", confidence: 0.8 },
      ];

      const speakerSegments = [
        { startTime: 0, endTime: 6, speakerLabel: "SPEAKER_00", endTime2: 6 },
        { startTime: 6, endTime: 12, speakerLabel: "SPEAKER_01" },
      ];

      const labels = { SPEAKER_00: "Alice", SPEAKER_01: "Bob" };

      const result = (service as any).alignSpeakerLabels(
        whisperSegments,
        speakerSegments,
        labels,
      );

      expect(result[0].speakerLabel).toBe("Alice");
      expect(result[1].speakerLabel).toBe("Bob");
    });

    it("should use raw label when no display label mapping exists", () => {
      const whisperSegments = [
        { start_time: 0, end_time: 5, text: "Hello", confidence: 0.9 },
      ];

      const speakerSegments = [
        { startTime: 0, endTime: 10, speakerLabel: "SPEAKER_00" },
      ];

      const result = (service as any).alignSpeakerLabels(whisperSegments, speakerSegments, {});

      expect(result[0].speakerLabel).toBe("SPEAKER_00");
    });
  });

  describe("analyzeTranscript", () => {
    it("should return analysis with all required fields", () => {
      const segments = [
        { startTime: 0, endTime: 10, text: "We need to discuss the pricing for next quarter.", speakerLabel: "Alice", confidence: 0.9 },
        { startTime: 10, endTime: 20, text: "I think we should follow up with the client by Friday.", speakerLabel: "Bob", confidence: 0.8 },
        { startTime: 20, endTime: 30, text: "The key point is that we agreed on the discount structure.", speakerLabel: "Alice", confidence: 0.9 },
      ];

      const result = (service as any).analyzeTranscript(segments);

      expect(result).toHaveProperty("topics");
      expect(result).toHaveProperty("sentiment");
      expect(result).toHaveProperty("actionItems");
      expect(result).toHaveProperty("keyPoints");
      expect(result).toHaveProperty("questions");
      expect(result).toHaveProperty("objections");
      expect(result).toHaveProperty("dealProbability");
      expect(result).toHaveProperty("objectionResponses");
      expect(Array.isArray(result.topics)).toBe(true);
      expect(Array.isArray(result.actionItems)).toBe(true);
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });
  });
});
