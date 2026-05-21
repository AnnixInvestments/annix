import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CvGeocodeCache } from "../entities/cv-geocode-cache.entity";
import { GeocodeService, haversineKm } from "./geocode.service";

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm({ lat: -26.2, lon: 28.04 }, { lat: -26.2, lon: 28.04 })).toBeCloseTo(0, 2);
  });

  it("returns ~1400km Johannesburg to Cape Town", () => {
    const joburg = { lat: -26.2, lon: 28.04 };
    const capeTown = { lat: -33.92, lon: 18.42 };
    const distance = haversineKm(joburg, capeTown);
    expect(distance).toBeGreaterThan(1250);
    expect(distance).toBeLessThan(1500);
  });

  it("returns ~50km Joburg to Pretoria", () => {
    const joburg = { lat: -26.2, lon: 28.04 };
    const pretoria = { lat: -25.74, lon: 28.19 };
    expect(haversineKm(joburg, pretoria)).toBeGreaterThan(40);
    expect(haversineKm(joburg, pretoria)).toBeLessThan(70);
  });
});

describe("GeocodeService", () => {
  let service: GeocodeService;
  let repo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; clear: jest.Mock };
  let originalFetch: typeof global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => dto),
      clear: jest.fn(),
    };
    fetchMock = jest.fn();
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeocodeService,
        { provide: getRepositoryToken(CvGeocodeCache), useValue: repo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "GOOGLE_PLACES_API_KEY") return "test-api-key";
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    service = module.get(GeocodeService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns cached coords without calling Google when address is cached", async () => {
    repo.findOne.mockResolvedValue({ address: "sandton", lat: -26.1, lon: 28.05 });

    const result = await service.geocode("Sandton");

    expect(result).toEqual({ lat: -26.1, lon: 28.05 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Google when not cached, rounds to 2 decimals, and writes the cache", async () => {
    repo.findOne.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{ geometry: { location: { lat: -26.2041, lng: 28.0473 } } }],
      }),
    });

    const result = await service.geocode("Johannesburg");

    expect(result).toEqual({ lat: -26.2, lon: 28.05 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ address: "johannesburg", lat: -26.2, lon: 28.05 }),
    );
  });

  it("returns null and does NOT cache when Google returns ZERO_RESULTS", async () => {
    repo.findOne.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    });

    const result = await service.geocode("Nowheresville-99");

    expect(result).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("returns null when address is empty", async () => {
    const result = await service.geocode("   ");
    expect(result).toBeNull();
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalises the address (lowercase + collapsed spaces) for cache lookup", async () => {
    repo.findOne.mockResolvedValue({ address: "kathu", lat: -27.7, lon: 23.04 });

    await service.geocode("  Kathu   ");

    expect(repo.findOne).toHaveBeenCalledWith({ where: { address: "kathu" } });
  });
});
