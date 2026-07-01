import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CustomerBlockedSupplierRepository } from "../../customer/customer-blocked-supplier.repository";
import type { CustomerPreferredSupplierRepository } from "../../customer/customer-preferred-supplier.repository";
import type { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import type { NixExtractionRepository } from "../../nix/nix-extraction.repository";
import type { NixExtractionSessionRepository } from "../../nix/nix-extraction-session.repository";
import type { CompanyEmailService } from "../../stock-control/services/company-email.service";
import type { SupplierCapabilityRepository } from "../../supplier/supplier-capability.repository";
import type { SupplierProfileRepository } from "../../supplier/supplier-profile.repository";
import { RfqSourcingDistributionService } from "./rfq-sourcing-distribution.service";
import type { RfqSourcingSendAuditRepository } from "./rfq-sourcing-send-audit.repository";

const COMPANY_ID = 100;
const SESSION_ID = 5;
const BUCKET_REF = "10::fabricated_steel";

function buildExtraction() {
  return {
    id: 1,
    extractedItems: [
      {
        rowNumber: 1,
        itemNumber: "1",
        description: "600NB mild steel pipe",
        itemType: "pipe",
        actionType: "supply",
        material: null,
        materialGrade: null,
        diameter: 600,
        diameterUnit: "mm",
        secondaryDiameter: null,
        length: null,
        wallThickness: null,
        schedule: null,
        angle: null,
        flangeConfig: null,
        pressureClass: null,
        sdr: null,
        productType: null,
        quantity: 2,
        unit: "ea",
        confidence: 1,
        needsClarification: false,
        clarificationReason: null,
        rawData: {},
      },
    ],
    extractedData: { profileMetadata: { supplierBundles: [] } },
  };
}

function planWithBucket() {
  return {
    autoBuckets: [
      {
        bucketRef: BUCKET_REF,
        supplierProfileId: 10,
        category: "fabricated_steel",
        name: "Steel Co",
        priority: 1,
        items: [
          {
            rowNumber: 1,
            description: "600NB pipe",
            quantity: 2,
            unit: "ea",
            category: "fabricated_steel",
          },
        ],
        draftBody: null,
      },
    ],
    manualCandidates: [],
    unmatchedItems: [],
    categoriesWithoutSupplier: [],
    generatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function serviceWithMocks() {
  const session = {
    id: SESSION_ID,
    customerCompanyId: COMPANY_ID,
    sourcingPlan: undefined as unknown,
  };

  const sessionRepo = {
    findById: jest.fn().mockResolvedValue(session),
    setSourcingPlan: jest.fn().mockResolvedValue(undefined),
  } as unknown as NixExtractionSessionRepository;

  const extractionRepo = {
    findBySessionOrderedAsc: jest.fn().mockResolvedValue([buildExtraction()]),
  } as unknown as NixExtractionRepository;

  const preferredRows = [
    { id: 11, supplierProfileId: 10, supplierName: null, supplierEmail: null, priority: 1 },
    {
      id: 12,
      supplierProfileId: null,
      supplierName: "Ext Co",
      supplierEmail: "ext@example.com",
      priority: 2,
    },
    { id: 13, supplierProfileId: 20, supplierName: null, supplierEmail: null, priority: 3 },
  ];

  const preferredSupplierRepo = {
    findActiveByCompany: jest.fn().mockResolvedValue(preferredRows),
    findActiveByCompanyAndSupplier: jest.fn().mockResolvedValue({ id: 11, supplierEmail: null }),
  } as unknown as CustomerPreferredSupplierRepository;

  const blockedSupplierRepo = {
    findActiveByCompany: jest.fn().mockResolvedValue([{ supplierProfileId: 20 }]),
    findActiveByCompanyAndSupplier: jest.fn().mockResolvedValue(null),
  } as unknown as CustomerBlockedSupplierRepository;

  const capabilityRepo = {
    findActiveBySupplierIdsWithRelations: jest
      .fn()
      .mockResolvedValue([{ supplierProfileId: 10, productCategory: "fabricated_steel" }]),
  } as unknown as SupplierCapabilityRepository;

  const supplierProfileRepo = {
    findByIdsWithUserAndCompany: jest.fn().mockResolvedValue([
      {
        id: 10,
        firstName: "Sam",
        lastName: "Steel",
        user: { email: "s10@example.com" },
        company: { tradingName: "Steel Co", legalName: "Steel Co Pty" },
      },
    ]),
  } as unknown as SupplierProfileRepository;

  const companyEmailService = {
    sendEmail: jest.fn().mockResolvedValue(true),
  } as unknown as CompanyEmailService;

  const auditRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    findBySession: jest.fn().mockResolvedValue([]),
  } as unknown as RfqSourcingSendAuditRepository;

  const configService = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

  const aiChatService = {
    chat: jest.fn().mockResolvedValue({ content: "", providerUsed: "gemini" }),
  } as unknown as AiChatService;

  const service = new RfqSourcingDistributionService(
    sessionRepo,
    extractionRepo,
    preferredSupplierRepo,
    blockedSupplierRepo,
    capabilityRepo,
    supplierProfileRepo,
    companyEmailService,
    auditRepo,
    configService,
    aiChatService,
  );

  return {
    service,
    session,
    sessionRepo,
    aiChatService,
    capabilityRepo,
    preferredSupplierRepo,
    blockedSupplierRepo,
    supplierProfileRepo,
    companyEmailService,
    auditRepo,
    configService,
  };
}

describe("RfqSourcingDistributionService tenant scoping", () => {
  it("splits registered vs external candidates and routes matched items into a registered bucket", async () => {
    const { service } = serviceWithMocks();

    const plan = await service.planSourcing(SESSION_ID, COMPANY_ID);

    expect(plan.autoBuckets).toHaveLength(1);
    expect(plan.autoBuckets[0].supplierProfileId).toBe(10);
    expect(plan.autoBuckets[0].category).toBe("fabricated_steel");
    expect(plan.autoBuckets[0].items.map((item) => item.rowNumber)).toEqual([1]);

    expect(plan.manualCandidates).toHaveLength(1);
    expect(plan.manualCandidates[0].preferredSupplierId).toBe(12);
    expect(plan.manualCandidates[0].email).toBe("ext@example.com");
  });

  it("excludes blocked suppliers from the candidate universe", async () => {
    const { service, capabilityRepo } = serviceWithMocks();

    const plan = await service.planSourcing(SESSION_ID, COMPANY_ID);

    expect(capabilityRepo.findActiveBySupplierIdsWithRelations).toHaveBeenCalledWith([10]);
    expect(plan.autoBuckets.some((bucket) => bucket.supplierProfileId === 20)).toBe(false);
    expect(plan.manualCandidates.some((candidate) => candidate.preferredSupplierId === 13)).toBe(
      false,
    );
  });

  it("persists the generated plan onto the session with a field-scoped write", async () => {
    const { service, sessionRepo } = serviceWithMocks();

    await service.planSourcing(SESSION_ID, COMPANY_ID);

    expect(sessionRepo.setSourcingPlan).toHaveBeenCalledTimes(1);
    const [persistedSessionId, persistedPlan] = (sessionRepo.setSourcingPlan as jest.Mock).mock
      .calls[0];
    expect(persistedSessionId).toBe(SESSION_ID);
    expect(persistedPlan.autoBuckets).toHaveLength(1);
  });
});

describe("RfqSourcingDistributionService ownership enforcement", () => {
  it("rejects a caller whose company does not own the session", async () => {
    const { service } = serviceWithMocks();

    await expect(service.planSourcing(SESSION_ID, COMPANY_ID + 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("rejects a send from a foreign company before any dispatch", async () => {
    const { service, session, companyEmailService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;

    await expect(
      service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID + 1, false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(companyEmailService.sendEmail).not.toHaveBeenCalled();
  });
});

describe("RfqSourcingDistributionService recipient validation", () => {
  it("rejects a resolved recipient containing multiple addresses or CRLF", async () => {
    const { service, session, supplierProfileRepo, configService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;
    (configService.get as jest.Mock).mockReturnValue("true");
    (supplierProfileRepo.findByIdsWithUserAndCompany as jest.Mock).mockResolvedValue([
      { id: 10, user: { email: "good@example.com, evil@example.com" } },
    ]);

    await expect(service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, false)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("RfqSourcingDistributionService send idempotency", () => {
  it("rejects a second send for the same bucket unless force is passed", async () => {
    const { service, session, auditRepo, companyEmailService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;
    (auditRepo.findBySession as jest.Mock).mockResolvedValue([
      { id: 99, supplierProfileId: 10, category: "fabricated_steel" },
    ]);

    await expect(service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, false)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(companyEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it("allows a forced re-send past an existing audit", async () => {
    const { service, session, auditRepo, configService, companyEmailService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;
    (configService.get as jest.Mock).mockReturnValue("true");
    (auditRepo.findBySession as jest.Mock).mockResolvedValue([
      { id: 99, supplierProfileId: 10, category: "fabricated_steel" },
    ]);

    const result = await service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, true);

    expect(result.skipped).toBe(false);
    expect(companyEmailService.sendEmail).toHaveBeenCalledTimes(1);
  });
});
