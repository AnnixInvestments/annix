import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { RepProfile } from "../src/fieldflow/rep-profile/rep-profile.entity";
import { RepProfileModule } from "../src/fieldflow/rep-profile/rep-profile.module";
import { User } from "../src/user/entities/user.entity";

describe("RepProfileController - Setup Flow (e2e)", () => {
  let app: INestApplication;

  const mockUser: Partial<User> = {
    id: 1,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  const mockProfile: Partial<RepProfile> = {
    id: 1,
    userId: 1,
    industry: "manufacturing",
    subIndustries: ["steel", "pipes"],
    productCategories: ["flanges", "fittings"],
    companyName: "Test Company",
    jobTitle: "Sales Rep",
    territoryDescription: "Gauteng region",
    defaultSearchRadiusKm: 25,
    defaultBufferBeforeMinutes: 15,
    defaultBufferAfterMinutes: 15,
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    workingDays: "1,2,3,4,5",
    setupCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfileRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockProfile, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockProfile, ...entity })),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockProfileRepository.findOne.mockResolvedValue(null);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RepProfileModule],
    })
      .overrideProvider(getRepositoryToken(RepProfile))
      .useValue(mockProfileRepository)
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

  describe("Setup Status Check", () => {
    describe("GET /annix-rep/rep-profile/status", () => {
      it("should return setupCompleted: false when no profile exists", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce(null);

        const response = await request(app.getHttpServer())
          .get("/annix-rep/rep-profile/status")
          .expect(200);

        expect(response.body.setupCompleted).toBe(false);
        expect(response.body.profile).toBeNull();
      });

      it("should return setupCompleted: false when profile exists but not completed", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce({
          ...mockProfile,
          setupCompleted: false,
        });

        const response = await request(app.getHttpServer())
          .get("/annix-rep/rep-profile/status")
          .expect(200);

        expect(response.body.setupCompleted).toBe(false);
      });

      it("should return setupCompleted: true when setup is completed", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce({
          ...mockProfile,
          setupCompleted: true,
          setupCompletedAt: new Date(),
        });

        const response = await request(app.getHttpServer())
          .get("/annix-rep/rep-profile/status")
          .expect(200);

        expect(response.body.setupCompleted).toBe(true);
        expect(response.body.profile).toBeDefined();
      });
    });
  });

  describe("Profile Creation (Setup Step)", () => {
    describe("POST /annix-rep/rep-profile", () => {
      const createDto = {
        industry: "manufacturing",
        subIndustries: ["steel", "pipes"],
        productCategories: ["flanges", "fittings"],
      };

      it("should create a new profile with required fields", async () => {
        const response = await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(createDto)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(mockProfileRepository.create).toHaveBeenCalled();
        expect(mockProfileRepository.save).toHaveBeenCalled();
      });

      it("should create profile with optional fields", async () => {
        const fullDto = {
          ...createDto,
          companyName: "Test Company",
          jobTitle: "Sales Manager",
          territoryDescription: "Gauteng and surroundings",
          defaultSearchRadiusKm: 50,
          workingHoursStart: "07:00",
          workingHoursEnd: "18:00",
        };

        const response = await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(fullDto)
          .expect(201);

        expect(response.body).toBeDefined();
      });

      it("should return 400 when industry is missing", async () => {
        const invalidDto = {
          subIndustries: ["steel"],
          productCategories: ["flanges"],
        };

        await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(invalidDto)
          .expect(400);
      });

      it("should return 400 when subIndustries is empty", async () => {
        const invalidDto = {
          industry: "manufacturing",
          subIndustries: [],
          productCategories: ["flanges"],
        };

        await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(invalidDto)
          .expect(400);
      });

      it("should return 400 when productCategories is empty", async () => {
        const invalidDto = {
          industry: "manufacturing",
          subIndustries: ["steel"],
          productCategories: [],
        };

        await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(invalidDto)
          .expect(400);
      });

      it("should return 400 for invalid working hours format", async () => {
        const invalidDto = {
          ...createDto,
          workingHoursStart: "8am",
        };

        await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(invalidDto)
          .expect(400);
      });

      it("should return 400 for invalid working days format", async () => {
        const invalidDto = {
          ...createDto,
          workingDays: "Monday,Tuesday",
        };

        await request(app.getHttpServer())
          .post("/annix-rep/rep-profile")
          .send(invalidDto)
          .expect(400);
      });
    });
  });

  describe("Profile Update (Setup Details Step)", () => {
    describe("PATCH /annix-rep/rep-profile", () => {
      beforeEach(() => {
        mockProfileRepository.findOne.mockResolvedValue(mockProfile);
      });

      it("should update profile with partial data", async () => {
        const updateDto = {
          companyName: "Updated Company",
        };

        const response = await request(app.getHttpServer())
          .patch("/annix-rep/rep-profile")
          .send(updateDto)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(mockProfileRepository.save).toHaveBeenCalled();
      });

      it("should update multiple fields", async () => {
        const updateDto = {
          companyName: "New Company",
          jobTitle: "Senior Sales Rep",
          territoryDescription: "Extended region",
          customSearchTerms: ["valves", "pumps"],
        };

        const response = await request(app.getHttpServer())
          .patch("/annix-rep/rep-profile")
          .send(updateDto)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it("should update working hours", async () => {
        const updateDto = {
          workingHoursStart: "07:30",
          workingHoursEnd: "18:30",
          workingDays: "1,2,3,4,5,6",
        };

        const response = await request(app.getHttpServer())
          .patch("/annix-rep/rep-profile")
          .send(updateDto)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it("should return 404 when profile does not exist", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce(null);

        await request(app.getHttpServer())
          .patch("/annix-rep/rep-profile")
          .send({ companyName: "Test" })
          .expect(404);
      });
    });
  });

  describe("Complete Setup", () => {
    describe("POST /annix-rep/rep-profile/complete-setup", () => {
      it("should mark setup as completed", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce({
          ...mockProfile,
          setupCompleted: false,
        });

        const response = await request(app.getHttpServer())
          .post("/annix-rep/rep-profile/complete-setup")
          .expect(200);

        expect(response.body).toBeDefined();
        expect(mockProfileRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            setupCompleted: true,
          }),
        );
      });

      it("should return 404 when profile does not exist", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce(null);

        await request(app.getHttpServer())
          .post("/annix-rep/rep-profile/complete-setup")
          .expect(404);
      });

      it("should handle already completed setup gracefully", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce({
          ...mockProfile,
          setupCompleted: true,
          setupCompletedAt: new Date(),
        });

        const response = await request(app.getHttpServer())
          .post("/annix-rep/rep-profile/complete-setup")
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe("Get Profile", () => {
    describe("GET /annix-rep/rep-profile", () => {
      it("should return profile when it exists", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce(mockProfile);

        const response = await request(app.getHttpServer())
          .get("/annix-rep/rep-profile")
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.industry).toBe(mockProfile.industry);
      });

      it("should return 404 when profile does not exist", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce(null);

        await request(app.getHttpServer()).get("/annix-rep/rep-profile").expect(404);
      });
    });
  });

  describe("Search Terms", () => {
    describe("GET /annix-rep/rep-profile/search-terms", () => {
      it("should return custom search terms", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce({
          ...mockProfile,
          customSearchTerms: ["valves", "pumps", "fittings"],
        });

        const response = await request(app.getHttpServer())
          .get("/annix-rep/rep-profile/search-terms")
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it("should return empty array when no search terms", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce({
          ...mockProfile,
          customSearchTerms: null,
        });

        const response = await request(app.getHttpServer())
          .get("/annix-rep/rep-profile/search-terms")
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it("should return 404 when profile does not exist", async () => {
        mockProfileRepository.findOne.mockResolvedValueOnce(null);

        await request(app.getHttpServer()).get("/annix-rep/rep-profile/search-terms").expect(404);
      });
    });
  });

  describe("Full Setup Flow Integration", () => {
    it("should complete full setup flow: create -> update -> complete", async () => {
      const createDto = {
        industry: "manufacturing",
        subIndustries: ["steel"],
        productCategories: ["flanges"],
      };

      await request(app.getHttpServer()).post("/annix-rep/rep-profile").send(createDto).expect(201);

      mockProfileRepository.findOne.mockResolvedValue({
        ...mockProfile,
        ...createDto,
        setupCompleted: false,
      });

      await request(app.getHttpServer())
        .patch("/annix-rep/rep-profile")
        .send({ companyName: "Full Flow Company" })
        .expect(200);

      await request(app.getHttpServer()).post("/annix-rep/rep-profile/complete-setup").expect(200);

      mockProfileRepository.findOne.mockResolvedValue({
        ...mockProfile,
        ...createDto,
        companyName: "Full Flow Company",
        setupCompleted: true,
        setupCompletedAt: new Date(),
      });

      const statusResponse = await request(app.getHttpServer())
        .get("/annix-rep/rep-profile/status")
        .expect(200);

      expect(statusResponse.body.setupCompleted).toBe(true);
    });
  });
});
