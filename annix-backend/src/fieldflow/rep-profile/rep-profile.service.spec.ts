import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateRepProfileDto, UpdateRepProfileDto } from "./rep-profile.dto";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileService } from "./rep-profile.service";

describe("RepProfileService", () => {
  let service: RepProfileService;
  let repository: jest.Mocked<Repository<RepProfile>>;

  const mockProfile: RepProfile = {
    id: 1,
    userId: 100,
    organizationId: null,
    organization: null as any,
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

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepProfileService,
        { provide: getRepositoryToken(RepProfile), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<RepProfileService>(RepProfileService);
    repository = module.get(getRepositoryToken(RepProfile));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("profileByUserId", () => {
    it("should return profile when found", async () => {
      repository.findOne.mockResolvedValue(mockProfile);

      const result = await service.profileByUserId(100);

      expect(result).toEqual(mockProfile);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 100 },
      });
    });

    it("should return null when profile not found", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.profileByUserId(999);

      expect(result).toBeNull();
    });
  });

  describe("setupStatus", () => {
    it("should return setupCompleted true when profile exists and is complete", async () => {
      repository.findOne.mockResolvedValue(mockProfile);

      const result = await service.setupStatus(100);

      expect(result).toEqual({
        setupCompleted: true,
        profile: mockProfile,
      });
    });

    it("should return setupCompleted false when profile exists but not complete", async () => {
      const incompleteProfile = { ...mockProfile, setupCompleted: false };
      repository.findOne.mockResolvedValue(incompleteProfile);

      const result = await service.setupStatus(100);

      expect(result).toEqual({
        setupCompleted: false,
        profile: incompleteProfile,
      });
    });

    it("should return setupCompleted false when profile does not exist", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.setupStatus(999);

      expect(result).toEqual({
        setupCompleted: false,
        profile: null,
      });
    });
  });

  describe("createProfile", () => {
    const createDto: CreateRepProfileDto = {
      industry: "manufacturing",
      subIndustries: ["automotive"],
      productCategories: ["bearings"],
      companyName: "Test Company",
      jobTitle: "Sales Rep",
      territoryDescription: "Western Region",
      defaultSearchLatitude: -26.2041,
      defaultSearchLongitude: 28.0473,
      defaultSearchRadiusKm: 50,
      targetCustomerProfile: { businessTypes: ["OEM"] },
      customSearchTerms: ["bearings"],
    };

    it("should create new profile when none exists", async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProfile);
      repository.save.mockResolvedValue(mockProfile);

      const result = await service.createProfile(100, createDto);

      expect(result).toEqual(mockProfile);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          industry: createDto.industry,
          subIndustries: createDto.subIndustries,
          productCategories: createDto.productCategories,
          companyName: createDto.companyName,
          jobTitle: createDto.jobTitle,
          territoryDescription: createDto.territoryDescription,
          defaultSearchLatitude: createDto.defaultSearchLatitude,
          defaultSearchLongitude: createDto.defaultSearchLongitude,
          defaultSearchRadiusKm: createDto.defaultSearchRadiusKm,
          targetCustomerProfile: createDto.targetCustomerProfile,
          customSearchTerms: createDto.customSearchTerms,
          setupCompleted: true,
          setupCompletedAt: expect.any(Date),
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it("should update existing profile instead of creating new one", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockResolvedValue(existingProfile);

      const result = await service.createProfile(100, createDto);

      expect(result).toEqual(existingProfile);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it("should use default search radius when not provided", async () => {
      const dtoWithoutRadius: CreateRepProfileDto = {
        industry: "manufacturing",
        subIndustries: ["automotive"],
        productCategories: ["bearings"],
      };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProfile);
      repository.save.mockResolvedValue(mockProfile);

      await service.createProfile(100, dtoWithoutRadius);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultSearchRadiusKm: 25,
        }),
      );
    });

    it("should set null for optional fields when not provided", async () => {
      const minimalDto: CreateRepProfileDto = {
        industry: "manufacturing",
        subIndustries: ["automotive"],
        productCategories: ["bearings"],
      };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProfile);
      repository.save.mockResolvedValue(mockProfile);

      await service.createProfile(100, minimalDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: null,
          jobTitle: null,
          territoryDescription: null,
          defaultSearchLatitude: null,
          defaultSearchLongitude: null,
          targetCustomerProfile: null,
          customSearchTerms: null,
        }),
      );
    });
  });

  describe("updateProfile", () => {
    const updateDto: UpdateRepProfileDto = {
      industry: "technology",
      companyName: "Updated Company",
    };

    it("should update existing profile", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockResolvedValue({ ...existingProfile, ...updateDto });

      const result = await service.updateProfile(100, updateDto);

      expect(result.industry).toBe("technology");
      expect(result.companyName).toBe("Updated Company");
      expect(repository.save).toHaveBeenCalled();
    });

    it("should create new profile if none exists", async () => {
      repository.findOne.mockResolvedValue(null);
      const newProfile = {
        ...mockProfile,
        id: 2,
        userId: 100,
        industry: "technology",
        setupCompleted: false,
      };
      repository.create.mockReturnValue(newProfile);
      repository.save.mockResolvedValue(newProfile);

      const result = await service.updateProfile(100, updateDto);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 100,
        industry: "technology",
        subIndustries: [],
        productCategories: [],
        setupCompleted: false,
      });
      expect(result).toEqual(newProfile);
    });

    it("should only update provided fields", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const partialDto: UpdateRepProfileDto = { companyName: "New Name" };
      const result = await service.updateProfile(100, partialDto);

      expect(result.companyName).toBe("New Name");
      expect(result.industry).toBe(mockProfile.industry);
      expect(result.subIndustries).toEqual(mockProfile.subIndustries);
    });

    it("should update subIndustries when provided", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, {
        subIndustries: ["electronics", "medical"],
      });

      expect(result.subIndustries).toEqual(["electronics", "medical"]);
    });

    it("should update productCategories when provided", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, {
        productCategories: ["pumps", "valves"],
      });

      expect(result.productCategories).toEqual(["pumps", "valves"]);
    });

    it("should update location fields when provided", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, {
        defaultSearchLatitude: -33.9249,
        defaultSearchLongitude: 18.4241,
        defaultSearchRadiusKm: 100,
      });

      expect(result.defaultSearchLatitude).toBe(-33.9249);
      expect(result.defaultSearchLongitude).toBe(18.4241);
      expect(result.defaultSearchRadiusKm).toBe(100);
    });

    it("should update targetCustomerProfile when provided", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const newProfile = { businessTypes: ["Retailer"] };
      const result = await service.updateProfile(100, {
        targetCustomerProfile: newProfile,
      });

      expect(result.targetCustomerProfile).toEqual(newProfile);
    });

    it("should update customSearchTerms when provided", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, {
        customSearchTerms: ["new term 1", "new term 2"],
      });

      expect(result.customSearchTerms).toEqual(["new term 1", "new term 2"]);
    });

    it("should set setupCompletedAt when marking setup as completed", async () => {
      const existingProfile = { ...mockProfile, setupCompleted: false, setupCompletedAt: null };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, { setupCompleted: true });

      expect(result.setupCompleted).toBe(true);
      expect(result.setupCompletedAt).toBeInstanceOf(Date);
    });

    it("should not overwrite setupCompletedAt if already set", async () => {
      const originalDate = new Date("2024-01-01T00:00:00Z");
      const existingProfile = {
        ...mockProfile,
        setupCompleted: true,
        setupCompletedAt: originalDate,
      };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, { setupCompleted: true });

      expect(result.setupCompletedAt).toEqual(originalDate);
    });

    it("should not update companyName when undefined is passed", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, { companyName: undefined });

      expect(result.companyName).toBe(mockProfile.companyName);
    });

    it("should set companyName to null when null is passed", async () => {
      const existingProfile = { ...mockProfile };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.updateProfile(100, { companyName: null as any });

      expect(result.companyName).toBeNull();
    });
  });

  describe("completeSetup", () => {
    it("should mark setup as complete and set timestamp", async () => {
      const existingProfile = { ...mockProfile, setupCompleted: false, setupCompletedAt: null };
      repository.findOne.mockResolvedValue(existingProfile);
      repository.save.mockImplementation((profile) => Promise.resolve(profile as RepProfile));

      const result = await service.completeSetup(100);

      expect(result.setupCompleted).toBe(true);
      expect(result.setupCompletedAt).toBeInstanceOf(Date);
      expect(repository.save).toHaveBeenCalled();
    });

    it("should throw error when profile not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.completeSetup(999)).rejects.toThrow(
        "Profile not found. Please create a profile first.",
      );
    });
  });

  describe("searchTermsForUser", () => {
    it("should return custom search terms when profile exists", async () => {
      repository.findOne.mockResolvedValue(mockProfile);

      const result = await service.searchTermsForUser(100);

      expect(result).toEqual(["industrial bearings", "seals supplier"]);
    });

    it("should return empty array when profile does not exist", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.searchTermsForUser(999);

      expect(result).toEqual([]);
    });

    it("should return empty array when customSearchTerms is null", async () => {
      const profileWithoutTerms = { ...mockProfile, customSearchTerms: null };
      repository.findOne.mockResolvedValue(profileWithoutTerms);

      const result = await service.searchTermsForUser(100);

      expect(result).toEqual([]);
    });

    it("should return empty array when customSearchTerms is empty", async () => {
      const profileWithEmptyTerms = { ...mockProfile, customSearchTerms: [] };
      repository.findOne.mockResolvedValue(profileWithEmptyTerms);

      const result = await service.searchTermsForUser(100);

      expect(result).toEqual([]);
    });
  });
});
