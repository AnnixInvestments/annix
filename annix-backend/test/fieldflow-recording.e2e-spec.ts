import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import {
  Meeting,
  MeetingRecording,
  MeetingStatus,
  MeetingType,
  RecordingProcessingStatus,
} from "../src/fieldflow/entities";
import { AnnixRepModule } from "../src/fieldflow/fieldflow.module";
import { User } from "../src/user/entities/user.entity";

describe("RecordingController (e2e)", () => {
  let app: INestApplication;

  const mockUser: Partial<User> = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockMeeting: Partial<Meeting> = {
    id: 1,
    salesRepId: 1,
    prospectId: 1,
    title: "Sales Meeting",
    meetingType: MeetingType.IN_PERSON,
    status: MeetingStatus.SCHEDULED,
    scheduledStart: new Date("2024-01-15T10:00:00Z"),
    scheduledEnd: new Date("2024-01-15T11:00:00Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecording: Partial<MeetingRecording> = {
    id: 1,
    meetingId: 1,
    storagePath: "recordings/1/20240115-100000-meeting.webm",
    storageBucket: "local",
    originalFilename: "meeting.webm",
    mimeType: "audio/webm",
    fileSizeBytes: 1024000,
    durationSeconds: 3600,
    sampleRate: 16000,
    channels: 1,
    processingStatus: RecordingProcessingStatus.COMPLETED,
    processingError: null,
    speakerSegments: [
      { startTime: 0, endTime: 30, speakerLabel: "Speaker 1", confidence: 0.95 },
      { startTime: 30, endTime: 60, speakerLabel: "Speaker 2", confidence: 0.92 },
    ],
    detectedSpeakersCount: 2,
    speakerLabels: { "Speaker 1": "John", "Speaker 2": "Jane" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMeetingRepository = {
    findOne: jest.fn().mockResolvedValue(mockMeeting),
  };

  const mockRecordingRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockRecording, ...dto, id: 1 })),
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ ...mockRecording, ...entity })),
    findOne: jest.fn().mockResolvedValue(mockRecording),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        UPLOAD_DIR: "./test-uploads",
        API_BASE_URL: "http://localhost:4001",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnnixRepModule],
    })
      .overrideProvider(getRepositoryToken(Meeting))
      .useValue(mockMeetingRepository)
      .overrideProvider(getRepositoryToken(MeetingRecording))
      .useValue(mockRecordingRepository)
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideGuard("AnnixRepAuthGuard")
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              annixRepUser: { userId: number; email: string; sessionToken: string };
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.annixRepUser = {
            userId: 1,
            email: "test@example.com",
            sessionToken: "test-token",
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("POST /annix-rep/recordings/initiate", () => {
    const initiateDto = {
      meetingId: 1,
      filename: "meeting-recording.webm",
      mimeType: "audio/webm",
      sampleRate: 16000,
      channels: 1,
    };

    it("should initiate a new recording upload", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(initiateDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.recordingId).toBeDefined();
      expect(response.body.uploadUrl).toBeDefined();
      expect(response.body.uploadMethod).toBe("POST");
      expect(mockRecordingRepository.create).toHaveBeenCalled();
      expect(mockRecordingRepository.save).toHaveBeenCalled();
    });

    it("should return 400 if recording already exists for meeting", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(mockRecording);

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(initiateDto)
        .expect(400);
    });

    it("should return 404 if meeting not found", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(initiateDto)
        .expect(404);
    });

    it("should return 400 for missing meetingId", async () => {
      const invalidDto = { ...initiateDto, meetingId: undefined };

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(invalidDto)
        .expect(400);
    });

    it("should return 400 for missing filename", async () => {
      const invalidDto = { ...initiateDto, filename: undefined };

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(invalidDto)
        .expect(400);
    });

    it("should return 400 for missing mimeType", async () => {
      const invalidDto = { ...initiateDto, mimeType: undefined };

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(invalidDto)
        .expect(400);
    });

    it("should accept optional sampleRate and channels", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      const minimalDto = {
        meetingId: 1,
        filename: "meeting.webm",
        mimeType: "audio/webm",
      };

      const response = await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send(minimalDto)
        .expect(201);

      expect(response.body.recordingId).toBeDefined();
    });
  });

  describe("POST /annix-rep/recordings/:id/complete", () => {
    const completeDto = {
      fileSizeBytes: 1024000,
      durationSeconds: 3600,
    };

    it("should complete a recording upload", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.UPLOADING,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .post("/annix-rep/recordings/1/complete")
        .send(completeDto)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should return 404 for non-existent recording", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/999/complete")
        .send(completeDto)
        .expect(404);
    });

    it("should return 400 for missing fileSizeBytes", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.UPLOADING,
        meeting: mockMeeting,
      });

      const invalidDto = { durationSeconds: 3600 };

      await request(app.getHttpServer())
        .post("/annix-rep/recordings/1/complete")
        .send(invalidDto)
        .expect(400);
    });

    it("should accept optional durationSeconds", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.UPLOADING,
        meeting: mockMeeting,
      });

      const minimalDto = { fileSizeBytes: 1024000 };

      const response = await request(app.getHttpServer())
        .post("/annix-rep/recordings/1/complete")
        .send(minimalDto)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("GET /annix-rep/recordings/:id", () => {
    it("should return recording details", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/1")
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(1);
      expect(response.body.meetingId).toBe(1);
      expect(response.body.processingStatus).toBeDefined();
      expect(response.body.speakerSegments).toBeDefined();
    });

    it("should return 404 for non-existent recording", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get("/annix-rep/recordings/999").expect(404);
    });

    it("should return 404 for recording owned by another user", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: { ...mockMeeting, salesRepId: 999 },
      });

      await request(app.getHttpServer()).get("/annix-rep/recordings/1").expect(404);
    });
  });

  describe("GET /annix-rep/recordings/meeting/:meetingId", () => {
    it("should return recording for a meeting", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/meeting/1")
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.meetingId).toBe(1);
    });

    it("should return null when no recording exists for meeting", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/meeting/999")
        .expect(200);

      expect(response.body).toBeNull();
    });
  });

  describe("PATCH /annix-rep/recordings/:id/speaker-labels", () => {
    const speakerLabelsDto = {
      speakerLabels: {
        "Speaker 1": "John Smith",
        "Speaker 2": "Jane Doe",
      },
    };

    it("should update speaker labels", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .patch("/annix-rep/recordings/1/speaker-labels")
        .send(speakerLabelsDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockRecordingRepository.save).toHaveBeenCalled();
    });

    it("should return 404 for non-existent recording", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .patch("/annix-rep/recordings/999/speaker-labels")
        .send(speakerLabelsDto)
        .expect(404);
    });

    it("should return 400 for missing speakerLabels", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: mockMeeting,
      });

      await request(app.getHttpServer())
        .patch("/annix-rep/recordings/1/speaker-labels")
        .send({})
        .expect(400);
    });

    it("should return 400 for invalid speakerLabels format", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: mockMeeting,
      });

      await request(app.getHttpServer())
        .patch("/annix-rep/recordings/1/speaker-labels")
        .send({ speakerLabels: "not-an-object" })
        .expect(400);
    });
  });

  describe("DELETE /annix-rep/recordings/:id", () => {
    it("should delete a recording", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: mockMeeting,
      });

      await request(app.getHttpServer()).delete("/annix-rep/recordings/1").expect(200);

      expect(mockRecordingRepository.remove).toHaveBeenCalled();
    });

    it("should return 404 for non-existent recording", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).delete("/annix-rep/recordings/999").expect(404);
    });

    it("should return 404 for recording owned by another user", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        meeting: { ...mockMeeting, salesRepId: 999 },
      });

      await request(app.getHttpServer()).delete("/annix-rep/recordings/1").expect(404);
    });
  });

  describe("Full Upload Flow Integration", () => {
    it("should complete full upload flow: initiate -> complete", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce(null);

      const initiateResponse = await request(app.getHttpServer())
        .post("/annix-rep/recordings/initiate")
        .send({
          meetingId: 1,
          filename: "integration-test.webm",
          mimeType: "audio/webm",
        })
        .expect(201);

      expect(initiateResponse.body.recordingId).toBeDefined();

      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        id: initiateResponse.body.recordingId,
        processingStatus: RecordingProcessingStatus.UPLOADING,
        meeting: mockMeeting,
      });

      const completeResponse = await request(app.getHttpServer())
        .post(`/annix-rep/recordings/${initiateResponse.body.recordingId}/complete`)
        .send({
          fileSizeBytes: 2048000,
          durationSeconds: 1800,
        })
        .expect(200);

      expect(completeResponse.body).toBeDefined();
    });
  });

  describe("Recording Processing States", () => {
    it("should return recording in PENDING state", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.PENDING,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/1")
        .expect(200);

      expect(response.body.processingStatus).toBe(RecordingProcessingStatus.PENDING);
    });

    it("should return recording in PROCESSING state", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.PROCESSING,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/1")
        .expect(200);

      expect(response.body.processingStatus).toBe(RecordingProcessingStatus.PROCESSING);
    });

    it("should return recording in TRANSCRIBING state", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.TRANSCRIBING,
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/1")
        .expect(200);

      expect(response.body.processingStatus).toBe(RecordingProcessingStatus.TRANSCRIBING);
    });

    it("should return recording in FAILED state with error", async () => {
      mockRecordingRepository.findOne.mockResolvedValueOnce({
        ...mockRecording,
        processingStatus: RecordingProcessingStatus.FAILED,
        processingError: "Transcription failed",
        meeting: mockMeeting,
      });

      const response = await request(app.getHttpServer())
        .get("/annix-rep/recordings/1")
        .expect(200);

      expect(response.body.processingStatus).toBe(RecordingProcessingStatus.FAILED);
    });
  });
});
