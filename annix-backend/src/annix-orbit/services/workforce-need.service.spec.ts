import { Test, TestingModule } from "@nestjs/testing";
import { RfqRepository } from "../../rfq/rfq.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CvCredentialRepository } from "../repositories/cv-credential.repository";
import { GeocodeService } from "./geocode.service";
import { WorkforceNeedService } from "./workforce-need.service";

describe("WorkforceNeedService", () => {
  let service: WorkforceNeedService;
  let rfqRepo: { findById: jest.Mock; updateById: jest.Mock };
  let candidateRepo: { candidatesMatchingTrades: jest.Mock };
  let credentialRepo: { validForCandidates: jest.Mock };
  let geocodeService: { geocode: jest.Mock };

  beforeEach(async () => {
    rfqRepo = { findById: jest.fn(), updateById: jest.fn().mockResolvedValue(undefined) };
    candidateRepo = { candidatesMatchingTrades: jest.fn().mockResolvedValue([]) };
    credentialRepo = { validForCandidates: jest.fn().mockResolvedValue([]) };
    geocodeService = { geocode: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkforceNeedService,
        { provide: RfqRepository, useValue: rfqRepo },
        { provide: CandidateRepository, useValue: candidateRepo },
        { provide: CvCredentialRepository, useValue: credentialRepo },
        { provide: GeocodeService, useValue: geocodeService },
      ],
    }).compile();
    service = module.get(WorkforceNeedService);
  });

  it("returns reason=no-required-trades when RFQ has no required trades", async () => {
    rfqRepo.findById.mockResolvedValue({
      id: 1,
      requiredTrades: null,
      radiusKm: 50,
      projectLocation: "Kathu",
    });
    const result = await service.calculateForRfq(1);
    expect(result?.reason).toBe("no-required-trades");
    expect(result?.counts.totalMatching).toBe(0);
  });

  it("returns reason=no-radius when radius isn't set", async () => {
    rfqRepo.findById.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: null,
      projectLocation: "Kathu",
    });
    const result = await service.calculateForRfq(1);
    expect(result?.reason).toBe("no-radius");
  });

  it("returns reason=no-project-location when location isn't set", async () => {
    rfqRepo.findById.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: 50,
      projectLocation: null,
    });
    const result = await service.calculateForRfq(1);
    expect(result?.reason).toBe("no-project-location");
  });

  it("counts candidates within radius and tags credentials + availability", async () => {
    rfqRepo.findById.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: 200,
      estimatedHeadcount: 5,
      projectLocation: "Kathu, Northern Cape",
      projectLocationLat: -27.7,
      projectLocationLon: 23.04,
    });

    candidateRepo.candidatesMatchingTrades.mockResolvedValue([
      {
        id: 10,
        locationLat: -27.71,
        locationLon: 23.05,
        tradeProfile: { shared: { availability: "available_now" }, perTrade: {} },
      },
      {
        id: 11,
        locationLat: -27.72,
        locationLon: 23.06,
        tradeProfile: { shared: { availability: "30d_notice" }, perTrade: {} },
      },
      {
        id: 12,
        locationLat: -26.2,
        locationLon: 28.04,
        tradeProfile: { shared: { availability: "available_now" }, perTrade: {} },
      },
    ]);

    credentialRepo.validForCandidates.mockResolvedValue([
      { candidateId: 10, credentialType: "medical", expiresAt: "2027-01-01" },
      { candidateId: 10, credentialType: "mine_induction", expiresAt: "2027-06-01" },
      { candidateId: 11, credentialType: "medical", expiresAt: "2026-12-01" },
    ]);

    const result = await service.calculateForRfq(1);

    expect(result).not.toBeNull();
    expect(result?.counts.totalMatching).toBe(2);
    expect(result?.counts.withValidMedical).toBe(2);
    expect(result?.counts.withValidMineInduction).toBe(1);
    expect(result?.counts.availableNowOr14d).toBe(1);
    expect(result?.unmetHeadcount).toBe(3);
  });

  it("auto-geocodes the project location when coords are missing", async () => {
    rfqRepo.findById.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: 50,
      estimatedHeadcount: null,
      projectLocation: "Kathu",
      projectLocationLat: null,
      projectLocationLon: null,
    });
    geocodeService.geocode.mockResolvedValue({ lat: -27.7, lon: 23.04 });
    candidateRepo.candidatesMatchingTrades.mockResolvedValue([]);

    const result = await service.calculateForRfq(1);

    expect(geocodeService.geocode).toHaveBeenCalledWith("Kathu");
    expect(rfqRepo.updateById).toHaveBeenCalledWith(1, {
      projectLocationLat: -27.7,
      projectLocationLon: 23.04,
    });
    expect(result?.hasProjectCoords).toBe(true);
  });

  it("returns null when RFQ does not exist", async () => {
    rfqRepo.findById.mockResolvedValue(null);
    expect(await service.calculateForRfq(9999)).toBeNull();
  });
});
