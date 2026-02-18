import { Test, TestingModule } from "@nestjs/testing";
import { AnnixRepAuthGuard } from "../auth";
import { RepProfileController } from "./rep-profile.controller";
import { CreateRepProfileDto, UpdateRepProfileDto } from "./rep-profile.dto";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileService } from "./rep-profile.service";

describe("RepProfileController", () => {
  let controller: RepProfileController;
  let service: jest.Mocked<RepProfileService>;

  const mockProfile: RepProfile = {
    id: 1,
    userId: 100,
    industry: "manufacturing",
    subIndustries: ["automotive", "aerospace"],
    productCategories: ["bearings", "seals"],
    companyName: "Test Company",
    jobTitle: "Sales Rep",
    territoryDescription: "Western Region",
    defaultSearchLatitude: -26.2041,
    defaultSearchLongitude: 28.0473,
    defaultSearchRadiusKm: 50,
    targetCustomerProfile: {
      businessTypes: ["OEM", "Distributor"],
      companySizes: ["Medium", "Large"],
      decisionMakerTitles: ["Purchasing Manager"],
    },
    customSearchTerms: ["industrial bearings", "seals supplier"],
    setupCompleted: true,
    setupCompletedAt: new Date("2024-01-15T10:00:00Z"),
    defaultBufferBeforeMinutes: 15,
    defaultBufferAfterMinutes: 15,
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    workingDays: "1,2,3,4,5",
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
    user: undefined as any,
  };

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

  beforeEach(async () => {
    const mockService = {
      setupStatus: jest.fn(),
      profileByUserId: jest.fn(),
      createProfile: jest.fn(),
      updateProfile: jest.fn(),
      completeSetup: jest.fn(),
      searchTermsForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RepProfileController],
      providers: [{ provide: RepProfileService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RepProfileController>(RepProfileController);
    service = module.get(RepProfileService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /status (setupStatus)", () => {
    it("should return setup status with profile when completed", async () => {
      service.setupStatus.mockResolvedValue({
        setupCompleted: true,
        profile: mockProfile,
      });

      const result = await controller.setupStatus(mockRequest as any);

      expect(result.setupCompleted).toBe(true);
      expect(result.profile).toBeDefined();
      expect(result.profile?.id).toBe(1);
      expect(result.profile?.industry).toBe("manufacturing");
      expect(service.setupStatus).toHaveBeenCalledWith(100);
    });

    it("should return setup status with null profile when not completed", async () => {
      service.setupStatus.mockResolvedValue({
        setupCompleted: false,
        profile: null,
      });

      const result = await controller.setupStatus(mockRequest as any);

      expect(result.setupCompleted).toBe(false);
      expect(result.profile).toBeNull();
    });

    it("should transform profile to response DTO", async () => {
      service.setupStatus.mockResolvedValue({
        setupCompleted: true,
        profile: mockProfile,
      });

      const result = await controller.setupStatus(mockRequest as any);

      expect(result.profile).toEqual({
        id: mockProfile.id,
        userId: mockProfile.userId,
        industry: mockProfile.industry,
        subIndustries: mockProfile.subIndustries,
        productCategories: mockProfile.productCategories,
        companyName: mockProfile.companyName,
        jobTitle: mockProfile.jobTitle,
        territoryDescription: mockProfile.territoryDescription,
        defaultSearchLatitude: mockProfile.defaultSearchLatitude,
        defaultSearchLongitude: mockProfile.defaultSearchLongitude,
        defaultSearchRadiusKm: mockProfile.defaultSearchRadiusKm,
        targetCustomerProfile: mockProfile.targetCustomerProfile,
        customSearchTerms: mockProfile.customSearchTerms,
        setupCompleted: mockProfile.setupCompleted,
        setupCompletedAt: mockProfile.setupCompletedAt,
        defaultBufferBeforeMinutes: mockProfile.defaultBufferBeforeMinutes,
        defaultBufferAfterMinutes: mockProfile.defaultBufferAfterMinutes,
        workingHoursStart: mockProfile.workingHoursStart,
        workingHoursEnd: mockProfile.workingHoursEnd,
        workingDays: mockProfile.workingDays,
        createdAt: mockProfile.createdAt,
        updatedAt: mockProfile.updatedAt,
      });
    });
  });

  describe("GET / (profile)", () => {
    it("should return profile when exists", async () => {
      service.profileByUserId.mockResolvedValue(mockProfile);

      const result = await controller.profile(mockRequest as any);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.industry).toBe("manufacturing");
      expect(service.profileByUserId).toHaveBeenCalledWith(100);
    });

    it("should return null when profile does not exist", async () => {
      service.profileByUserId.mockResolvedValue(null);

      const result = await controller.profile(mockRequest as any);

      expect(result).toBeNull();
    });
  });

  describe("POST / (createProfile)", () => {
    const createDto: CreateRepProfileDto = {
      industry: "manufacturing",
      subIndustries: ["automotive"],
      productCategories: ["bearings"],
      companyName: "New Company",
      jobTitle: "Account Manager",
    };

    it("should create profile and return response", async () => {
      service.createProfile.mockResolvedValue(mockProfile);

      const result = await controller.createProfile(mockRequest as any, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(service.createProfile).toHaveBeenCalledWith(100, createDto);
    });

    it("should pass all DTO fields to service", async () => {
      const fullDto: CreateRepProfileDto = {
        industry: "technology",
        subIndustries: ["software", "hardware"],
        productCategories: ["components", "systems"],
        companyName: "Tech Corp",
        jobTitle: "Sales Director",
        territoryDescription: "EMEA",
        defaultSearchLatitude: 51.5074,
        defaultSearchLongitude: -0.1278,
        defaultSearchRadiusKm: 100,
        targetCustomerProfile: { businessTypes: ["Enterprise"] },
        customSearchTerms: ["cloud services"],
      };
      service.createProfile.mockResolvedValue({ ...mockProfile, ...fullDto });

      await controller.createProfile(mockRequest as any, fullDto);

      expect(service.createProfile).toHaveBeenCalledWith(100, fullDto);
    });
  });

  describe("PATCH / (updateProfile)", () => {
    const updateDto: UpdateRepProfileDto = {
      companyName: "Updated Company",
      jobTitle: "Senior Sales Rep",
    };

    it("should update profile and return response", async () => {
      const updatedProfile = { ...mockProfile, ...updateDto };
      service.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockRequest as any, updateDto);

      expect(result.companyName).toBe("Updated Company");
      expect(result.jobTitle).toBe("Senior Sales Rep");
      expect(service.updateProfile).toHaveBeenCalledWith(100, updateDto);
    });

    it("should allow partial updates", async () => {
      const partialDto: UpdateRepProfileDto = { defaultSearchRadiusKm: 75 };
      service.updateProfile.mockResolvedValue({ ...mockProfile, defaultSearchRadiusKm: 75 });

      const result = await controller.updateProfile(mockRequest as any, partialDto);

      expect(result.defaultSearchRadiusKm).toBe(75);
      expect(service.updateProfile).toHaveBeenCalledWith(100, partialDto);
    });
  });

  describe("POST /complete-setup (completeSetup)", () => {
    it("should mark setup as complete and return profile", async () => {
      const completedProfile = {
        ...mockProfile,
        setupCompleted: true,
        setupCompletedAt: new Date(),
      };
      service.completeSetup.mockResolvedValue(completedProfile);

      const result = await controller.completeSetup(mockRequest as any);

      expect(result.setupCompleted).toBe(true);
      expect(result.setupCompletedAt).toBeDefined();
      expect(service.completeSetup).toHaveBeenCalledWith(100);
    });
  });

  describe("GET /search-terms (searchTerms)", () => {
    it("should return search terms from profile", async () => {
      service.searchTermsForUser.mockResolvedValue(["industrial bearings", "seals supplier"]);

      const result = await controller.searchTerms(mockRequest as any);

      expect(result).toEqual(["industrial bearings", "seals supplier"]);
      expect(service.searchTermsForUser).toHaveBeenCalledWith(100);
    });

    it("should return empty array when no search terms", async () => {
      service.searchTermsForUser.mockResolvedValue([]);

      const result = await controller.searchTerms(mockRequest as any);

      expect(result).toEqual([]);
    });
  });

  describe("toResponse helper", () => {
    it("should include all profile fields in response", async () => {
      service.profileByUserId.mockResolvedValue(mockProfile);

      const result = await controller.profile(mockRequest as any);

      expect(result).not.toHaveProperty("user");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("industry");
      expect(result).toHaveProperty("subIndustries");
      expect(result).toHaveProperty("productCategories");
      expect(result).toHaveProperty("companyName");
      expect(result).toHaveProperty("jobTitle");
      expect(result).toHaveProperty("territoryDescription");
      expect(result).toHaveProperty("defaultSearchLatitude");
      expect(result).toHaveProperty("defaultSearchLongitude");
      expect(result).toHaveProperty("defaultSearchRadiusKm");
      expect(result).toHaveProperty("targetCustomerProfile");
      expect(result).toHaveProperty("customSearchTerms");
      expect(result).toHaveProperty("setupCompleted");
      expect(result).toHaveProperty("setupCompletedAt");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });

    it("should handle null optional fields", async () => {
      const profileWithNulls: RepProfile = {
        ...mockProfile,
        companyName: null,
        jobTitle: null,
        territoryDescription: null,
        defaultSearchLatitude: null,
        defaultSearchLongitude: null,
        targetCustomerProfile: null,
        customSearchTerms: null,
        setupCompletedAt: null,
      };
      service.profileByUserId.mockResolvedValue(profileWithNulls);

      const result = await controller.profile(mockRequest as any);

      expect(result?.companyName).toBeNull();
      expect(result?.jobTitle).toBeNull();
      expect(result?.territoryDescription).toBeNull();
      expect(result?.defaultSearchLatitude).toBeNull();
      expect(result?.defaultSearchLongitude).toBeNull();
      expect(result?.targetCustomerProfile).toBeNull();
      expect(result?.customSearchTerms).toBeNull();
      expect(result?.setupCompletedAt).toBeNull();
    });
  });
});
