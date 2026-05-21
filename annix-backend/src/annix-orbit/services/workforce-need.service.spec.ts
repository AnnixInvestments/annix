import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { Candidate } from "../entities/candidate.entity";
import { CvCredential } from "../entities/cv-credential.entity";
import { GeocodeService } from "./geocode.service";
import { WorkforceNeedService } from "./workforce-need.service";

interface FakeQb {
  where: jest.Mock;
  andWhere: jest.Mock;
  getMany: jest.Mock;
}

function buildQb(rows: unknown[]): FakeQb {
  const qb: FakeQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
}

describe("WorkforceNeedService", () => {
  let service: WorkforceNeedService;
  let rfqRepo: { findOne: jest.Mock; update: jest.Mock };
  let candidateRepo: { createQueryBuilder: jest.Mock };
  let credentialRepo: { createQueryBuilder: jest.Mock };
  let geocodeService: { geocode: jest.Mock };

  beforeEach(async () => {
    rfqRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    candidateRepo = { createQueryBuilder: jest.fn() };
    credentialRepo = { createQueryBuilder: jest.fn() };
    geocodeService = { geocode: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkforceNeedService,
        { provide: getRepositoryToken(Rfq), useValue: rfqRepo },
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
        { provide: getRepositoryToken(CvCredential), useValue: credentialRepo },
        { provide: GeocodeService, useValue: geocodeService },
      ],
    }).compile();
    service = module.get(WorkforceNeedService);
  });

  it("returns reason=no-required-trades when RFQ has no required trades", async () => {
    rfqRepo.findOne.mockResolvedValue({
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
    rfqRepo.findOne.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: null,
      projectLocation: "Kathu",
    });
    const result = await service.calculateForRfq(1);
    expect(result?.reason).toBe("no-radius");
  });

  it("returns reason=no-project-location when location isn't set", async () => {
    rfqRepo.findOne.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: 50,
      projectLocation: null,
    });
    const result = await service.calculateForRfq(1);
    expect(result?.reason).toBe("no-project-location");
  });

  it("counts candidates within radius and tags credentials + availability", async () => {
    rfqRepo.findOne.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: 200,
      estimatedHeadcount: 5,
      projectLocation: "Kathu, Northern Cape",
      projectLocationLat: -27.7,
      projectLocationLon: 23.04,
    });

    candidateRepo.createQueryBuilder.mockReturnValue(
      buildQb([
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
      ]),
    );

    credentialRepo.createQueryBuilder.mockReturnValue(
      buildQb([
        { candidateId: 10, credentialType: "medical", expiresAt: "2027-01-01" },
        { candidateId: 10, credentialType: "mine_induction", expiresAt: "2027-06-01" },
        { candidateId: 11, credentialType: "medical", expiresAt: "2026-12-01" },
      ]),
    );

    const result = await service.calculateForRfq(1);

    expect(result).not.toBeNull();
    expect(result?.counts.totalMatching).toBe(2);
    expect(result?.counts.withValidMedical).toBe(2);
    expect(result?.counts.withValidMineInduction).toBe(1);
    expect(result?.counts.availableNowOr14d).toBe(1);
    expect(result?.unmetHeadcount).toBe(3);
  });

  it("auto-geocodes the project location when coords are missing", async () => {
    rfqRepo.findOne.mockResolvedValue({
      id: 1,
      requiredTrades: ["boilermaker"],
      radiusKm: 50,
      estimatedHeadcount: null,
      projectLocation: "Kathu",
      projectLocationLat: null,
      projectLocationLon: null,
    });
    geocodeService.geocode.mockResolvedValue({ lat: -27.7, lon: 23.04 });
    candidateRepo.createQueryBuilder.mockReturnValue(buildQb([]));

    const result = await service.calculateForRfq(1);

    expect(geocodeService.geocode).toHaveBeenCalledWith("Kathu");
    expect(rfqRepo.update).toHaveBeenCalledWith(1, {
      projectLocationLat: -27.7,
      projectLocationLon: 23.04,
    });
    expect(result?.hasProjectCoords).toBe(true);
  });

  it("returns null when RFQ does not exist", async () => {
    rfqRepo.findOne.mockResolvedValue(null);
    expect(await service.calculateForRfq(9999)).toBeNull();
  });
});
