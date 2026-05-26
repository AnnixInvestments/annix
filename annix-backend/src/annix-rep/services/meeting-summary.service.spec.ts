import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "../../email/email.service";
import { MeetingRepository } from "../meeting.repository";
import { MeetingRecordingRepository } from "../meeting-recording.repository";
import { MeetingTranscriptRepository } from "../meeting-transcript.repository";
import { MeetingSummaryService } from "./meeting-summary.service";

describe("MeetingSummaryService", () => {
  let service: MeetingSummaryService;
  let mockMeetingRepo: Partial<MeetingRepository>;
  let mockRecordingRepo: Partial<MeetingRecordingRepository>;
  let mockTranscriptRepo: Partial<MeetingTranscriptRepository>;
  let mockEmailService: Partial<EmailService>;

  beforeEach(async () => {
    mockMeetingRepo = {
      findWithProspect: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockRecordingRepo = {
      findByMeetingId: jest.fn(),
    };

    mockTranscriptRepo = {
      findByRecordingId: jest.fn(),
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingSummaryService,
        {
          provide: MeetingRepository,
          useValue: mockMeetingRepo,
        },
        {
          provide: MeetingRecordingRepository,
          useValue: mockRecordingRepo,
        },
        {
          provide: MeetingTranscriptRepository,
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
      (mockMeetingRepo.findWithProspect as jest.Mock).mockResolvedValue(null);

      await expect(service.generateSummary(999)).rejects.toThrow();
    });

    it("should throw when no transcript exists for meeting", async () => {
      const mockMeeting = {
        id: 1,
        title: "Test Meeting",
        scheduledStart: new Date("2026-01-15T10:00:00Z"),
        scheduledEnd: new Date("2026-01-15T11:00:00Z"),
      };

      (mockMeetingRepo.findWithProspect as jest.Mock).mockResolvedValue(mockMeeting);
      (mockRecordingRepo.findByMeetingId as jest.Mock).mockResolvedValue(null);

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

      (mockMeetingRepo.findWithProspect as jest.Mock).mockResolvedValue(mockMeeting);
      (mockRecordingRepo.findByMeetingId as jest.Mock).mockResolvedValue(mockRecording);
      (mockTranscriptRepo.findByRecordingId as jest.Mock).mockResolvedValue(mockTranscript);

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
      (mockMeetingRepo.findWithProspect as jest.Mock).mockResolvedValue(null);

      await expect(service.previewSummary(999)).rejects.toThrow();
    });
  });
});
