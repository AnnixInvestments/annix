import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { BoqRepository } from "../../boq/boq.repository";
import type { BoqSectionRepository } from "../../boq/boq-section.repository";
import type { BoqSupplierAccessRepository } from "../../boq/boq-supplier-access.repository";
import type { NixExtractionSessionRepository } from "../../nix/nix-extraction-session.repository";
import { SourcingBoqBridgeService } from "./sourcing-boq-bridge.service";

const COMPANY_ID = 100;
const SESSION_ID = 5;
const BUCKET_REF = "10::fabricated_steel";
const CREATED_BOQ_ID = 500;

function bucketFixture(overrides: Record<string, unknown> = {}) {
  return {
    bucketRef: BUCKET_REF,
    supplierProfileId: 10,
    category: "fabricated_steel",
    name: "Steel Co",
    email: "s10@example.com",
    draftBody: null,
    items: [
      {
        rowNumber: 1,
        description: "600NB pipe",
        quantity: 2,
        unit: "ea",
        category: "fabricated_steel",
        score: 1,
        warnings: [],
        reasons: [],
        dualRoute: false,
      },
      {
        rowNumber: 4,
        description: "300NB bend",
        quantity: 6,
        unit: "ea",
        category: "fabricated_steel",
        score: 1,
        warnings: [],
        reasons: [],
        dualRoute: false,
      },
    ],
    ...overrides,
  };
}

function planFixture(overrides: Record<string, unknown> = {}) {
  return {
    autoBuckets: [bucketFixture(overrides)],
    manualCandidates: [],
    unmatchedItems: [],
    categoriesWithoutSupplier: [],
    generatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function serviceWithMocks(options: { flagOn?: boolean; plan?: unknown } = {}) {
  const session = {
    id: SESSION_ID,
    customerCompanyId: COMPANY_ID,
    title: "Pump Station Upgrade",
    externalReference: null,
    customerSnapshot: { name: "Acme Mining", email: "buyer@example.com", phone: "+27 11 000 1234" },
    sourcingPlan: (options.plan ?? planFixture()) as unknown,
  };

  const sessionRepo = {
    findById: jest.fn().mockResolvedValue(session),
    setSourcingPlan: jest.fn().mockImplementation((_id: number, plan: unknown) => {
      session.sourcingPlan = plan;
      return Promise.resolve();
    }),
  } as unknown as NixExtractionSessionRepository;

  const boqRepo = {
    findLastByNumberPrefix: jest.fn().mockResolvedValue(null),
    findBySourceBucket: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: CREATED_BOQ_ID, ...data }),
      ),
  } as unknown as BoqRepository;

  const sectionRepo = {
    create: jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) => Promise.resolve({ id: 900, ...data })),
  } as unknown as BoqSectionRepository;

  const accessRepo = {
    create: jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) => Promise.resolve({ id: 700, ...data })),
  } as unknown as BoqSupplierAccessRepository;

  const configService = {
    get: jest.fn().mockReturnValue(options.flagOn ? "true" : undefined),
  } as unknown as ConfigService;

  const service = new SourcingBoqBridgeService(
    sessionRepo,
    boqRepo,
    sectionRepo,
    accessRepo,
    configService,
  );

  return { service, session, sessionRepo, boqRepo, sectionRepo, accessRepo, configService };
}

describe("SourcingBoqBridgeService publish", () => {
  it("materializes a BOQ, section and supplier-access with the correct field mapping", async () => {
    const { service, boqRepo, sectionRepo, accessRepo } = serviceWithMocks({ flagOn: true });

    const result = await service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID);

    expect(result).toEqual({ skipped: false, reason: null, boqId: CREATED_BOQ_ID });

    const boqPayload = (boqRepo.create as jest.Mock).mock.calls[0][0];
    expect(boqPayload.status).toBe("submitted");
    expect(boqPayload.sourceSessionId).toBe(SESSION_ID);
    expect(boqPayload.sourceBucketRef).toBe(BUCKET_REF);
    expect(boqPayload.boqNumber).toMatch(/^BOQ-\d{4}-0001$/);
    expect(boqPayload.title).toBe("Sourcing: Straight Pipes — Steel Co");

    const sectionPayload = (sectionRepo.create as jest.Mock).mock.calls[0][0];
    expect(sectionPayload.boqId).toBe(CREATED_BOQ_ID);
    expect(sectionPayload.capabilityKey).toBe("fabricated_steel");
    expect(sectionPayload.sectionType).toBe("straight_pipes");
    expect(sectionPayload.sectionTitle).toBe("Straight Pipes");
    expect(sectionPayload.itemCount).toBe(2);
    expect(sectionPayload.totalWeightKg).toBe(0);
    expect(sectionPayload.items).toEqual([
      { description: "600NB pipe", qty: 2, unit: "ea", weightKg: 0, entries: [1] },
      { description: "300NB bend", qty: 6, unit: "ea", weightKg: 0, entries: [4] },
    ]);

    const accessPayload = (accessRepo.create as jest.Mock).mock.calls[0][0];
    expect(accessPayload.boqId).toBe(CREATED_BOQ_ID);
    expect(accessPayload.supplierProfileId).toBe(10);
    expect(accessPayload.allowedSections).toEqual(["straight_pipes"]);
    expect(accessPayload.status).toBe("pending");
    expect(accessPayload.reminderSent).toBe(false);
    expect(accessPayload.accessOrigin).toBe("sourcing");
    expect(accessPayload.sourceSessionId).toBe(SESSION_ID);
    expect(accessPayload.bucketRef).toBe(BUCKET_REF);
    expect(accessPayload.customerInfo).toEqual({
      name: "Acme Mining",
      email: "buyer@example.com",
      phone: "+27 11 000 1234",
      company: "Acme Mining",
    });
    expect(accessPayload.projectInfo).toEqual({ name: "Pump Station Upgrade" });
  });

  it("persists publishedBoqId onto the bucket and is idempotent on a second publish", async () => {
    const { service, boqRepo, sectionRepo, accessRepo, sessionRepo } = serviceWithMocks({
      flagOn: true,
    });

    const first = await service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID);
    expect(first.boqId).toBe(CREATED_BOQ_ID);
    expect(sessionRepo.setSourcingPlan).toHaveBeenCalledTimes(1);
    const persistedPlan = (sessionRepo.setSourcingPlan as jest.Mock).mock.calls[0][1];
    expect(persistedPlan.autoBuckets[0].publishedBoqId).toBe(CREATED_BOQ_ID);
    expect(persistedPlan.autoBuckets[0].publishState).toBe("published");

    const second = await service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID);
    expect(second).toEqual({ skipped: true, reason: "already-published", boqId: CREATED_BOQ_ID });
    expect(boqRepo.create).toHaveBeenCalledTimes(1);
    expect(sectionRepo.create).toHaveBeenCalledTimes(1);
    expect(accessRepo.create).toHaveBeenCalledTimes(1);
  });

  it("rejects an external bucket with no supplierProfileId", async () => {
    const { service, boqRepo } = serviceWithMocks({
      flagOn: true,
      plan: planFixture({ supplierProfileId: null }),
    });

    await expect(service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(boqRepo.create).not.toHaveBeenCalled();
  });

  it("skips with no writes when the feature flag is off", async () => {
    const { service, boqRepo, sectionRepo, accessRepo, sessionRepo } = serviceWithMocks({
      flagOn: false,
    });

    const result = await service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID);

    expect(result).toEqual({ skipped: true, reason: "feature-disabled", boqId: null });
    expect(boqRepo.create).not.toHaveBeenCalled();
    expect(sectionRepo.create).not.toHaveBeenCalled();
    expect(accessRepo.create).not.toHaveBeenCalled();
    expect(sessionRepo.setSourcingPlan).not.toHaveBeenCalled();
  });

  it("rejects a caller whose company does not own the session", async () => {
    const { service, boqRepo } = serviceWithMocks({ flagOn: true });

    await expect(
      service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID + 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(boqRepo.create).not.toHaveBeenCalled();
  });

  it("returns an idempotent skip (not a 500) when a concurrent publish hits the unique index", async () => {
    const { service, boqRepo, sectionRepo, accessRepo } = serviceWithMocks({ flagOn: true });
    (boqRepo.create as jest.Mock).mockRejectedValueOnce({ code: 11000 });
    (boqRepo.findBySourceBucket as jest.Mock).mockResolvedValueOnce({ id: 555 });

    const result = await service.publishBucket(SESSION_ID, BUCKET_REF, COMPANY_ID);

    expect(result).toEqual({ skipped: true, reason: "already-published", boqId: 555 });
    expect(sectionRepo.create).not.toHaveBeenCalled();
    expect(accessRepo.create).not.toHaveBeenCalled();
  });
});
