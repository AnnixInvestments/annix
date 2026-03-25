import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { Meeting, MeetingRecording, MeetingTranscript } from "../entities";
import { MeetingSummaryService } from "./meeting-summary.service";

describe("MeetingSummaryService", () => {
  let service: MeetingSummaryService;
  let mockMeetingRepo: Partial<Repository<Meeting>>;
  let mockRecordingRepo: Partial<Repository<MeetingRecording>>;
  let mockTranscriptRepo: Partial<Repository<MeetingTranscript>>;
  let mockEmailService: Partial<EmailService>;

  beforeEach(async () => {
    mockMeetingRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockRecordingRepo = {
      findOne: jest.fn(),
    };

    mockTranscriptRepo = {
      findOne: jest.fn(),
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingSummaryService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepo,
        },
        {
          provide: getRepositoryToken(MeetingRecording),
          useValue: mockRecordingRepo,
        },
        {
          provide: getRepositoryToken(MeetingTranscript),
          useValue: mockTranscriptRepo,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("http://localhost:3000"),
          },
        },
      ],
    }).compile();

    service = module.get<MeetingSummaryService>(MeetingSummaryService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateSummary", () => {
    it("should throw when meeting is not found", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.generateSummary(999)).rejects.toThrow();
    });

    it("should throw when no transcript exists for meeting", async () => {
      const mockMeeting = {
        id: 1,
        title: "Test Meeting",
        scheduledStart: new Date("2026-01-15T10:00:00Z"),
        scheduledEnd: new Date("2026-01-15T11:00:00Z"),
      };

      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(mockMeeting);
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.generateSummary(1)).rejects.toThrow();
    });

    it("should generate summary from transcript analysis", async () => {
      const mockMeeting = {
        id: 1,
        title: "Sales Review",
        scheduledStart: new Date("2026-01-15T10:00:00Z"),
        scheduledEnd: new Date("2026-01-15T11:00:00Z"),
        actualStart: new Date("2026-01-15T10:05:00Z"),
        actualEnd: new Date("2026-01-15T10:55:00Z"),
        attendees: ["alice@example.com", "bob@example.com"],
      };

      const mockRecording = {
        id: 1,
        meetingId: 1,
        durationSeconds: 3000,
      };

      const mockTranscript = {
        id: 1,
        recordingId: 1,
        fullText: "This is a test transcript with some content about pricing.",
        wordCount: 10,
        segments: [
          {
            startTime: 0,
            endTime: 30,
            text: "Hello everyone",
            speakerLabel: "Alice",
            confidence: 0.9,
          },
        ],
        analysis: {
          topics: ["pricing", "timeline"],
          sentiment: "positive",
          actionItems: [
            { task: "Follow up with client", assignee: "Bob", dueDate: null, extracted: true },
          ],
          keyPoints: ["Agreed on pricing structure"],
          questions: ["When is the deadline?"],
          objections: [],
          dealProbability: { probability: 0.7, factors: [], confidence: "medium" },
          objectionResponses: [],
        },
      };

      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(mockMeeting);
      (mockRecordingRepo.findOne as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findOne as jest.Mock).mockResolvedValue(mockTranscript);

      const result = await service.generateSummary(1);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("overview");
      expect(result).toHaveProperty("keyPoints");
      expect(result).toHaveProperty("actionItems");
      expect(result).toHaveProperty("topics");
      expect(result).toHaveProperty("sentiment");
    });
  });

  describe("previewSummary", () => {
    it("should throw when meeting is not found", async () => {
      (mockMeetingRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.previewSummary(999)).rejects.toThrow();
    });
  });
});
