import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { fromISO } from "../../lib/datetime";
import { Prospect, ProspectStatus } from "../entities/prospect.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { DiscoveryService } from "./discovery.service";
import { DiscoveredBusiness, DiscoverySource } from "./dto";
import { GooglePlacesProvider, OsmOverpassProvider, YellowPagesProvider } from "./providers";

describe("DiscoveryService", () => {
  let service: DiscoveryService;

  const mockProspectRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRepProfileRepository = {
    findOne: jest.fn(),
  };

  const mockGooglePlacesProvider = {
    search: jest.fn(),
    isConfigured: jest.fn(),
  };

  const mockYellowPagesProvider = {
    search: jest.fn(),
  };

  const mockOsmOverpassProvider = {
    search: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: number) => defaultValue),
  };

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const sampleBusiness = (overrides: Partial<DiscoveredBusiness> = {}): DiscoveredBusiness => ({
    source: DiscoverySource.GOOGLE_PLACES,
    externalId: "place_abc123",
    companyName: "Test Business",
    streetAddress: "123 Main St",
    city: "Johannesburg",
    province: "Gauteng",
    latitude: -26.2041,
    longitude: 28.0473,
    phone: "+27 11 123 4567",
    website: "https://test.co.za",
    businessTypes: ["manufacturing", "industrial"],
    rating: 4.5,
    userRatingsTotal: 100,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: getRepositoryToken(Prospect), useValue: mockProspectRepository },
        { provide: getRepositoryToken(RepProfile), useValue: mockRepProfileRepository },
        { provide: GooglePlacesProvider, useValue: mockGooglePlacesProvider },
        { provide: YellowPagesProvider, useValue: mockYellowPagesProvider },
        { provide: OsmOverpassProvider, useValue: mockOsmOverpassProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("search", () => {
    const searchDto = {
      latitude: -26.2041,
      longitude: 28.0473,
      radiusKm: 10,
      sources: [DiscoverySource.GOOGLE_PLACES],
      searchTerms: ["industrial"],
    };

    it("should search Google Places and return results", async () => {
      const businesses = [sampleBusiness()];
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue(businesses);
      mockProspectRepository.find.mockResolvedValue([]);

      const result = await service.search(1, searchDto);

      expect(result.discovered).toHaveLength(1);
      expect(result.totalFound).toBe(1);
      expect(result.existingMatches).toBe(0);
      expect(result.sourcesQueried).toEqual([DiscoverySource.GOOGLE_PLACES]);
    });

    it("should filter out already-imported prospects", async () => {
      const businesses = [sampleBusiness()];
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue(businesses);
      mockProspectRepository.find.mockResolvedValue([
        { googlePlaceId: "place_abc123", externalId: null },
      ]);

      const result = await service.search(1, searchDto);

      expect(result.discovered).toHaveLength(0);
      expect(result.existingMatches).toBe(1);
      expect(result.totalFound).toBe(1);
    });

    it("should use rep profile search terms when no custom terms provided", async () => {
      const profile = {
        customSearchTerms: ["bearings"],
        productCategories: ["seals"],
        subIndustries: ["automotive"],
        targetCustomerProfile: { businessTypes: ["OEM"] },
        defaultSearchRadiusKm: 25,
      } as RepProfile;
      mockRepProfileRepository.findOne.mockResolvedValue(profile);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([]);
      mockProspectRepository.find.mockResolvedValue([]);

      const dto = { latitude: -26.2041, longitude: 28.0473 };
      await service.search(1, dto);

      expect(mockGooglePlacesProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({
          searchTerms: expect.arrayContaining(["bearings", "seals", "automotive", "OEM"]),
          radiusKm: 25,
        }),
      );
    });

    it("should use default search terms when no profile and no custom terms", async () => {
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([]);
      mockProspectRepository.find.mockResolvedValue([]);

      const dto = { latitude: -26.2041, longitude: 28.0473 };
      await service.search(1, dto);

      expect(mockGooglePlacesProvider.search).toHaveBeenCalledWith(
        expect.objectContaining({
          searchTerms: ["business", "company"],
        }),
      );
    });

    it("should skip Google Places when not configured", async () => {
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(false);
      mockProspectRepository.find.mockResolvedValue([]);

      const result = await service.search(1, searchDto);

      expect(result.discovered).toHaveLength(0);
      expect(mockGooglePlacesProvider.search).not.toHaveBeenCalled();
    });

    it("should query multiple sources", async () => {
      const googleBusiness = sampleBusiness({ externalId: "google_1" });
      const osmBusiness = sampleBusiness({
        source: DiscoverySource.OSM,
        externalId: "osm_1",
        companyName: "OSM Business",
        latitude: -26.3,
        longitude: 28.1,
      });
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([googleBusiness]);
      mockOsmOverpassProvider.search.mockResolvedValue([osmBusiness]);
      mockProspectRepository.find.mockResolvedValue([]);

      const dto = {
        ...searchDto,
        sources: [DiscoverySource.GOOGLE_PLACES, DiscoverySource.OSM],
      };
      const result = await service.search(1, dto);

      expect(result.discovered).toHaveLength(2);
      expect(result.sourcesQueried).toEqual([
        DiscoverySource.GOOGLE_PLACES,
        DiscoverySource.OSM,
      ]);
    });

    it("should deduplicate businesses across sources", async () => {
      const googleBusiness = sampleBusiness({
        source: DiscoverySource.GOOGLE_PLACES,
        externalId: "google_1",
      });
      const osmBusiness = sampleBusiness({
        source: DiscoverySource.OSM,
        externalId: "osm_1",
      });
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([googleBusiness]);
      mockOsmOverpassProvider.search.mockResolvedValue([osmBusiness]);
      mockProspectRepository.find.mockResolvedValue([]);

      const dto = {
        ...searchDto,
        sources: [DiscoverySource.GOOGLE_PLACES, DiscoverySource.OSM],
      };
      const result = await service.search(1, dto);

      expect(result.totalFound).toBe(1);
      expect(result.discovered[0].source).toBe(DiscoverySource.GOOGLE_PLACES);
    });

    it("should return cached results on second call", async () => {
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([sampleBusiness()]);
      mockProspectRepository.find.mockResolvedValue([]);

      await service.search(1, searchDto);
      await service.search(1, searchDto);

      expect(mockGooglePlacesProvider.search).toHaveBeenCalledTimes(1);
    });

    it("should search Yellow Pages source", async () => {
      const ypBusiness = sampleBusiness({
        source: DiscoverySource.YELLOW_PAGES,
        externalId: "yp_1",
      });
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockYellowPagesProvider.search.mockResolvedValue([ypBusiness]);
      mockProspectRepository.find.mockResolvedValue([]);

      const dto = {
        ...searchDto,
        sources: [DiscoverySource.YELLOW_PAGES],
      };
      const result = await service.search(1, dto);

      expect(result.discovered).toHaveLength(1);
      expect(mockYellowPagesProvider.search).toHaveBeenCalled();
    });

    it("should skip Google Places when daily limit reached", async () => {
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([sampleBusiness()]);
      mockProspectRepository.find.mockResolvedValue([]);

      mockConfigService.get.mockImplementation((key: string, defaultValue: number) => {
        if (key === "DISCOVERY_GOOGLE_DAILY_LIMIT") return 1;
        return defaultValue;
      });

      const freshModule = await Test.createTestingModule({
        providers: [
          DiscoveryService,
          { provide: getRepositoryToken(Prospect), useValue: mockProspectRepository },
          { provide: getRepositoryToken(RepProfile), useValue: mockRepProfileRepository },
          { provide: GooglePlacesProvider, useValue: mockGooglePlacesProvider },
          { provide: YellowPagesProvider, useValue: mockYellowPagesProvider },
          { provide: OsmOverpassProvider, useValue: mockOsmOverpassProvider },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const freshService = freshModule.get<DiscoveryService>(DiscoveryService);

      const uniqueDto1 = { ...searchDto, searchTerms: ["first_unique_call"] };
      await freshService.search(1, uniqueDto1);

      const uniqueDto2 = { ...searchDto, searchTerms: ["second_unique_call"] };
      const result = await freshService.search(1, uniqueDto2);

      expect(result.discovered).toHaveLength(0);
    });
  });

  describe("importBusinesses", () => {
    it("should import new businesses as prospects", async () => {
      const business = sampleBusiness();
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockProspectRepository.create.mockReturnValue({ id: 1, ...business });
      mockProspectRepository.save.mockResolvedValue({ id: 1, ...business });

      const result = await service.importBusinesses(1, [business]);

      expect(result.created).toBe(1);
      expect(result.duplicates).toBe(0);
      expect(result.createdIds).toEqual([1]);
      expect(mockProspectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 1,
          companyName: "Test Business",
          status: ProspectStatus.NEW,
          discoverySource: DiscoverySource.GOOGLE_PLACES,
          googlePlaceId: "place_abc123",
        }),
      );
    });

    it("should skip duplicate businesses by external ID", async () => {
      const business = sampleBusiness();
      mockProspectRepository.findOne.mockResolvedValue({ id: 99 });

      const result = await service.importBusinesses(1, [business]);

      expect(result.created).toBe(0);
      expect(result.duplicates).toBe(1);
      expect(mockProspectRepository.create).not.toHaveBeenCalled();
    });

    it("should skip duplicate businesses by phone number", async () => {
      const business = sampleBusiness();
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn()
          .mockResolvedValueOnce({ id: 99 }),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.importBusinesses(1, [business]);

      expect(result.duplicates).toBe(1);
    });

    it("should skip duplicate businesses by name and city", async () => {
      const business = sampleBusiness({ phone: null });
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 99 }),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.importBusinesses(1, [business]);

      expect(result.duplicates).toBe(1);
    });

    it("should set googlePlaceId only for Google Places source", async () => {
      const osmBusiness = sampleBusiness({
        source: DiscoverySource.OSM,
        externalId: "osm_123",
      });
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockProspectRepository.create.mockReturnValue({ id: 2 });
      mockProspectRepository.save.mockResolvedValue({ id: 2 });

      await service.importBusinesses(1, [osmBusiness]);

      expect(mockProspectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          googlePlaceId: null,
          externalId: "osm_123",
        }),
      );
    });

    it("should store website in notes field", async () => {
      const business = sampleBusiness({ website: "https://example.com" });
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockProspectRepository.create.mockReturnValue({ id: 3 });
      mockProspectRepository.save.mockResolvedValue({ id: 3 });

      await service.importBusinesses(1, [business]);

      expect(mockProspectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: "Website: https://example.com",
        }),
      );
    });

    it("should set null notes when no website", async () => {
      const business = sampleBusiness({ website: null });
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockProspectRepository.create.mockReturnValue({ id: 4 });
      mockProspectRepository.save.mockResolvedValue({ id: 4 });

      await service.importBusinesses(1, [business]);

      expect(mockProspectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null,
        }),
      );
    });

    it("should limit tags to 5 business types", async () => {
      const business = sampleBusiness({
        businessTypes: ["type1", "type2", "type3", "type4", "type5", "type6", "type7"],
      });
      mockProspectRepository.findOne.mockResolvedValue(null);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockProspectRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockProspectRepository.create.mockReturnValue({ id: 5 });
      mockProspectRepository.save.mockResolvedValue({ id: 5 });

      await service.importBusinesses(1, [business]);

      expect(mockProspectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["type1", "type2", "type3", "type4", "type5"],
        }),
      );
    });
  });

  describe("quota", () => {
    it("should return current quota information", () => {
      const result = service.quota();

      expect(result.googleDailyLimit).toBeDefined();
      expect(result.googleUsedToday).toBe(0);
      expect(result.googleRemaining).toBe(result.googleDailyLimit);
      expect(result.lastResetAt).toBeDefined();
    });

    it("should reflect usage after searches", async () => {
      mockRepProfileRepository.findOne.mockResolvedValue(null);
      mockGooglePlacesProvider.isConfigured.mockReturnValue(true);
      mockGooglePlacesProvider.search.mockResolvedValue([]);
      mockProspectRepository.find.mockResolvedValue([]);

      const quotaBefore = service.quota();

      await service.search(1, {
        latitude: -26.2041,
        longitude: 28.0473,
        sources: [DiscoverySource.GOOGLE_PLACES],
        searchTerms: ["quota_test_unique"],
      });

      const result = service.quota();

      expect(result.googleUsedToday).toBe(1);
      expect(result.googleRemaining).toBe(quotaBefore.googleDailyLimit - 1);
    });
  });
});
