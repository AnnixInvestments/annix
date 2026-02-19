import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { Prospect, ProspectPriority, ProspectStatus } from "../src/fieldflow/entities";
import { AnnixRepModule } from "../src/fieldflow/fieldflow.module";
import { User } from "../src/user/entities/user.entity";

describe("ProspectController (e2e)", () => {
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
    contactEmail: "john@acme.com",
    contactPhone: "+27123456789",
    city: "Johannesburg",
    province: "Gauteng",
    country: "South Africa",
    status: ProspectStatus.NEW,
    priority: ProspectPriority.MEDIUM,
    latitude: -26.2041,
    longitude: 28.0473,
    tags: ["industrial", "manufacturing"],
    estimatedValue: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockProspect]),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProspect], 1]),
    getOne: jest.fn().mockResolvedValue(mockProspect),
  };

  const mockProspectRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockProspect, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockProspect, ...entity })),
    find: jest.fn().mockResolvedValue([mockProspect]),
    findOne: jest.fn().mockResolvedValue(mockProspect),
    remove: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    count: jest.fn().mockResolvedValue(1),
  };

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnnixRepModule],
    })
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

  describe("POST /annix-rep/prospects", () => {
    const createDto = {
      companyName: "New Company",
      contactName: "Jane Smith",
      contactEmail: "jane@newcompany.com",
      contactPhone: "+27987654321",
      city: "Cape Town",
      province: "Western Cape",
      status: ProspectStatus.NEW,
      priority: ProspectPriority.HIGH,
    };

    it("should create a new prospect", async () => {
      const response = await request(app.getHttpServer())
        .post("/annix-rep/prospects")
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(mockProspectRepository.create).toHaveBeenCalled();
      expect(mockProspectRepository.save).toHaveBeenCalled();
    });

    it("should return 400 for missing company name", async () => {
      const invalidDto = { ...createDto, companyName: undefined };

      await request(app.getHttpServer()).post("/annix-rep/prospects").send(invalidDto).expect(400);
    });
  });

  describe("GET /annix-rep/prospects", () => {
    it("should return all prospects for the user", async () => {
      const response = await request(app.getHttpServer()).get("/annix-rep/prospects").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /annix-rep/prospects/:id", () => {
    it("should return a specific prospect", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(mockProspect);

      const response = await request(app.getHttpServer()).get("/annix-rep/prospects/1").expect(200);

      expect(response.body).toBeDefined();
    });

    it("should return 404 for non-existent prospect", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).get("/annix-rep/prospects/999").expect(404);
    });
  });

  describe("PATCH /annix-rep/prospects/:id", () => {
    const updateDto = {
      companyName: "Updated Company Name",
      status: ProspectStatus.CONTACTED,
    };

    it("should update an existing prospect", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(mockProspect);

      const response = await request(app.getHttpServer())
        .patch("/annix-rep/prospects/1")
        .send(updateDto)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(mockProspectRepository.save).toHaveBeenCalled();
    });

    it("should return 404 for non-existent prospect", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .patch("/annix-rep/prospects/999")
        .send(updateDto)
        .expect(404);
    });
  });

  describe("PATCH /annix-rep/prospects/:id/status", () => {
    it("should update prospect status", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(mockProspect);

      const response = await request(app.getHttpServer())
        .patch("/annix-rep/prospects/1/status")
        .send({ status: ProspectStatus.QUALIFIED })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("DELETE /annix-rep/prospects/:id", () => {
    it("should delete a prospect", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(mockProspect);

      await request(app.getHttpServer()).delete("/annix-rep/prospects/1").expect(200);

      expect(mockProspectRepository.remove).toHaveBeenCalled();
    });

    it("should return 404 for non-existent prospect", async () => {
      mockProspectRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).delete("/annix-rep/prospects/999").expect(404);
    });
  });

  describe("GET /annix-rep/prospects/status/:status", () => {
    it("should return prospects filtered by status", async () => {
      const response = await request(app.getHttpServer())
        .get(`/annix-rep/prospects/status/${ProspectStatus.NEW}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /annix-rep/prospects/nearby", () => {
    it("should return nearby prospects", async () => {
      const response = await request(app.getHttpServer())
        .get("/annix-rep/prospects/nearby")
        .query({
          latitude: -26.2041,
          longitude: 28.0473,
          radiusKm: 10,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should return 400 for missing latitude", async () => {
      await request(app.getHttpServer())
        .get("/annix-rep/prospects/nearby")
        .query({
          longitude: 28.0473,
        })
        .expect(400);
    });
  });

  describe("POST /annix-rep/prospects/bulk-status", () => {
    it("should update status for multiple prospects", async () => {
      mockProspectRepository.findOne.mockResolvedValue(mockProspect);

      const response = await request(app.getHttpServer())
        .post("/annix-rep/prospects/bulk-status")
        .send({
          ids: [1, 2, 3],
          status: ProspectStatus.CONTACTED,
        })
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe("POST /annix-rep/prospects/bulk-delete", () => {
    it("should delete multiple prospects", async () => {
      mockProspectRepository.findOne.mockResolvedValue(mockProspect);

      const response = await request(app.getHttpServer())
        .post("/annix-rep/prospects/bulk-delete")
        .send({ ids: [1, 2, 3] })
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe("GET /annix-rep/prospects/stats", () => {
    it("should return prospect statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/annix-rep/prospects/stats")
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });
});
