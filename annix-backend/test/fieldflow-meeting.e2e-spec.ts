import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { Meeting, MeetingStatus, MeetingType, Prospect } from "../src/fieldflow/entities";
import { AnnixRepModule } from "../src/fieldflow/fieldflow.module";
import { User } from "../src/user/entities/user.entity";

describe("MeetingController (e2e)", () => {
  let app: INestApplication;

  const mockUser: Partial<User> = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockProspect: Partial<Prospect> = {
    id: 1,
    ownerId: 1,
    companyName: "Acme Corp",
    contactName: "John Doe",
  };

  const mockMeeting: Partial<Meeting> = {
    id: 1,
    salesRepId: 1,
    prospectId: 1,
    title: "Initial Sales Meeting",
    description: "Discuss product offerings",
    meetingType: MeetingType.IN_PERSON,
    status: MeetingStatus.SCHEDULED,
    scheduledStart: new Date("2024-01-15T10:00:00Z"),
    scheduledEnd: new Date("2024-01-15T11:00:00Z"),
    location: "Client Office",
    latitude: -26.2041,
    longitude: 28.0473,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockMeeting]),
    getManyAndCount: jest.fn().mockResolvedValue([[mockMeeting], 1]),
    getOne: jest.fn().mockResolvedValue(mockMeeting),
  };

  const mockMeetingRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockMeeting, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockMeeting, ...entity })),
    find: jest.fn().mockResolvedValue([mockMeeting]),
    findOne: jest.fn().mockResolvedValue(mockMeeting),
    remove: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    count: jest.fn().mockResolvedValue(1),
  };

  const mockProspectRepository = {
    findOne: jest.fn().mockResolvedValue(mockProspect),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnnixRepModule],
    })
      .overrideProvider(getRepositoryToken(Meeting))
      .useValue(mockMeetingRepository)
      .overrideProvider(getRepositoryToken(Prospect))
      .useValue(mockProspectRepository)
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
      .overrideGuard("AnnixRepAuthGuard")
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              annixRepUser: { userId: number; email: string; sessionToken: string };
            };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          request.annixRepUser = {
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

  describe("POST /annix-rep/meetings", () => {
    const createDto = {
      title: "New Meeting",
      prospectId: 1,
      meetingType: MeetingType.VIDEO,
      scheduledStart: "2024-01-20T14:00:00Z",
      scheduledEnd: "2024-01-20T15:00:00Z",
      description: "Demo call",
    };

    it("should create a new meeting", async () => {
      const response = await request(app.getHttpServer())
        .post("/annix-rep/meetings")
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(mockMeetingRepository.create).toHaveBeenCalled();
      expect(mockMeetingRepository.save).toHaveBeenCalled();
    });

    it("should return 400 for missing title", async () => {
      const invalidDto = { ...createDto, title: undefined };

      await request(app.getHttpServer()).post("/annix-rep/meetings").send(invalidDto).expect(400);
    });

    it("should return 400 for invalid date format", async () => {
      const invalidDto = { ...createDto, scheduledStart: "invalid-date" };

      await request(app.getHttpServer()).post("/annix-rep/meetings").send(invalidDto).expect(400);
    });
  });

  describe("GET /annix-rep/meetings", () => {
    it("should return all meetings for the user", async () => {
      const response = await request(app.getHttpServer()).get("/annix-rep/meetings").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /annix-rep/meetings/today", () => {
    it("should return today's meetings", async () => {
      const response = await request(app.getHttpServer())
        .get("/annix-rep/meetings/today")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /annix-rep/meetings/upcoming", () => {
    it("should return upcoming meetings", async () => {
      const response = await request(app.getHttpServer())
        .get("/annix-rep/meetings/upcoming")
        .query({ days: 7 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /annix-rep/meetings/:id", () => {
    it("should return a specific meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(mockMeeting);

      const response = await request(app.getHttpServer()).get("/annix-rep/meetings/1").expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.title).toBeDefined();
    });

    it("should return 404 for non-existent meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get("/annix-rep/meetings/999").expect(404);
    });
  });

  describe("PATCH /annix-rep/meetings/:id", () => {
    const updateDto = {
      title: "Updated Meeting Title",
      status: MeetingStatus.IN_PROGRESS,
    };

    it("should update an existing meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(mockMeeting);

      const response = await request(app.getHttpServer())
        .patch("/annix-rep/meetings/1")
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockMeetingRepository.save).toHaveBeenCalled();
    });

    it("should return 404 for non-existent meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .patch("/annix-rep/meetings/999")
        .send(updateDto)
        .expect(404);
    });
  });

  describe("POST /annix-rep/meetings/:id/start", () => {
    it("should start a meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce({
        ...mockMeeting,
        status: MeetingStatus.SCHEDULED,
      });

      const response = await request(app.getHttpServer())
        .post("/annix-rep/meetings/1/start")
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should return error for already started meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce({
        ...mockMeeting,
        status: MeetingStatus.IN_PROGRESS,
      });

      await request(app.getHttpServer()).post("/annix-rep/meetings/1/start").expect(400);
    });
  });

  describe("POST /annix-rep/meetings/:id/end", () => {
    it("should end a meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce({
        ...mockMeeting,
        status: MeetingStatus.IN_PROGRESS,
      });

      const response = await request(app.getHttpServer())
        .post("/annix-rep/meetings/1/end")
        .send({ outcomes: "Successful demo", notes: "Follow up next week" })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should return error for meeting not in progress", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce({
        ...mockMeeting,
        status: MeetingStatus.SCHEDULED,
      });

      await request(app.getHttpServer()).post("/annix-rep/meetings/1/end").expect(400);
    });
  });

  describe("POST /annix-rep/meetings/:id/cancel", () => {
    it("should cancel a meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce({
        ...mockMeeting,
        status: MeetingStatus.SCHEDULED,
      });

      const response = await request(app.getHttpServer())
        .post("/annix-rep/meetings/1/cancel")
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should return error for completed meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce({
        ...mockMeeting,
        status: MeetingStatus.COMPLETED,
      });

      await request(app.getHttpServer()).post("/annix-rep/meetings/1/cancel").expect(400);
    });
  });

  describe("DELETE /annix-rep/meetings/:id", () => {
    it("should delete a meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(mockMeeting);

      await request(app.getHttpServer()).delete("/annix-rep/meetings/1").expect(200);

      expect(mockMeetingRepository.remove).toHaveBeenCalled();
    });

    it("should return 404 for non-existent meeting", async () => {
      mockMeetingRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).delete("/annix-rep/meetings/999").expect(404);
    });
  });

  describe("GET /annix-rep/meetings/prospect/:prospectId", () => {
    it("should return meetings for a specific prospect", async () => {
      const response = await request(app.getHttpServer())
        .get("/annix-rep/meetings/prospect/1")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
