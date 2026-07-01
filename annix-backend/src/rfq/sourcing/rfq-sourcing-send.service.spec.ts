import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ForbiddenException } from "@nestjs/common";
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
const RESOLVED_EMAIL = "resolved-server@example.com";

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

function planWithBucket(overrides?: { description?: string; draftBody?: string | null }) {
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
            description: overrides?.description ?? "600NB pipe",
            quantity: 2,
            unit: "ea",
            category: "fabricated_steel",
          },
        ],
        draftBody: overrides?.draftBody ?? null,
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
    findActiveByCompanyAndSupplier: jest
      .fn()
      .mockResolvedValue({ id: 11, supplierEmail: "plan-side@example.com" }),
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
        user: { email: RESOLVED_EMAIL },
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
    extractionRepo,
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

function enableSending(configService: ConfigService) {
  (configService.get as jest.Mock).mockImplementation((key: string) =>
    key === "RFQ_SOURCING_SEND_ENABLED" ? "true" : undefined,
  );
}

describe("RfqSourcingDistributionService send happy path", () => {
  it("dispatches once and writes a single audit with the server-resolved recipient", async () => {
    const { service, session, companyEmailService, auditRepo, configService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;
    enableSending(configService);

    const result = await service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, false);

    expect(result.skipped).toBe(false);
    expect(result.reason).toBeNull();
    expect(companyEmailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(auditRepo.create).toHaveBeenCalledTimes(1);

    const auditArg = (auditRepo.create as jest.Mock).mock.calls[0][0];
    expect(auditArg.recipientEmail).toBe(RESOLVED_EMAIL);
    expect(auditArg.recipientEmail).not.toBe("plan-side@example.com");
    expect(auditArg.approverUserId).toBe(7);
    expect(auditArg.supplierProfileId).toBe(10);
    expect(auditArg.preferredSupplierId).toBe(11);
    expect(auditArg.itemRowNumbers).toEqual([1]);
    expect(auditArg.companyId).toBe(COMPANY_ID);
    expect(auditArg.sessionId).toBe(SESSION_ID);
  });

  it("routes the resolved recipient into the email envelope", async () => {
    const { service, session, companyEmailService, configService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;
    enableSending(configService);

    await service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, false);

    const envelope = (companyEmailService.sendEmail as jest.Mock).mock.calls[0][1];
    expect(envelope.to).toBe(RESOLVED_EMAIL);
  });
});

describe("RfqSourcingDistributionService send skipped when flag off", () => {
  it("returns feature-disabled and dispatches nothing", async () => {
    const { service, session, companyEmailService, auditRepo } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;

    const result = await service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, false);

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("feature-disabled");
    expect(result.audit).toBeNull();
    expect(companyEmailService.sendEmail).not.toHaveBeenCalled();
    expect(auditRepo.create).not.toHaveBeenCalled();
  });
});

describe("RfqSourcingDistributionService html escaping", () => {
  it("escapes injected item and body content before sending", async () => {
    const { service, session, companyEmailService, configService } = serviceWithMocks();
    session.sourcingPlan = planWithBucket({
      description: "<script>alert(1)</script>",
      draftBody: "</td></tr><h1>x</h1>",
    }) as unknown;
    enableSending(configService);

    await service.send(SESSION_ID, BUCKET_REF, 7, COMPANY_ID, false);

    const envelope = (companyEmailService.sendEmail as jest.Mock).mock.calls[0][1];
    const html = envelope.html as string;

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;h1&gt;x&lt;/h1&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<h1>");
  });
});

describe("RfqSourcingDistributionService currentPlan", () => {
  it("returns the stored plan when present", async () => {
    const { service, session } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;

    const plan = await service.currentPlan(SESSION_ID, COMPANY_ID);

    expect(plan).not.toBeNull();
    expect(plan?.autoBuckets).toHaveLength(1);
    expect(plan?.autoBuckets[0].bucketRef).toBe(BUCKET_REF);
  });

  it("returns null when the session has no sourcing plan", async () => {
    const { service } = serviceWithMocks();

    const plan = await service.currentPlan(SESSION_ID, COMPANY_ID);

    expect(plan).toBeNull();
  });

  it("rejects a caller whose company does not own the session", async () => {
    const { service, session } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;

    await expect(service.currentPlan(SESSION_ID, COMPANY_ID + 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe("RfqSourcingDistributionService sendingEnabled", () => {
  it("is true only when the flag is the string true", async () => {
    const { service, configService } = serviceWithMocks();

    (configService.get as jest.Mock).mockReturnValue("true");
    expect(service.sendingEnabled()).toBe(true);

    (configService.get as jest.Mock).mockReturnValue(undefined);
    expect(service.sendingEnabled()).toBe(false);

    (configService.get as jest.Mock).mockReturnValue("false");
    expect(service.sendingEnabled()).toBe(false);

    (configService.get as jest.Mock).mockReturnValue("1");
    expect(service.sendingEnabled()).toBe(false);
  });
});

describe("RfqSourcingDistributionService planSourcing draft bodies", () => {
  it("pre-populates a non-null draft body on every auto bucket", async () => {
    const { service } = serviceWithMocks();

    const plan = await service.planSourcing(SESSION_ID, COMPANY_ID);

    expect(plan.autoBuckets.length).toBeGreaterThan(0);
    expect(plan.autoBuckets.every((bucket) => bucket.draftBody !== null)).toBe(true);
    expect(plan.autoBuckets.every((bucket) => bucket.draftBody !== undefined)).toBe(true);
  });
});

describe("RfqSourcingDistributionService mutation ownership", () => {
  it("rejects a foreign caller reassigning an item", async () => {
    const { service, session } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;

    await expect(
      service.reassignItem(SESSION_ID, 1, BUCKET_REF, COMPANY_ID + 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a foreign caller updating a draft body", async () => {
    const { service, session } = serviceWithMocks();
    session.sourcingPlan = planWithBucket() as unknown;

    await expect(
      service.updateDraftBody(SESSION_ID, BUCKET_REF, "edited", COMPANY_ID + 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("rfq-sourcing send-audit index migration", () => {
  const migrationPath = resolve(
    __dirname,
    "../../../migrations-mongo/20260701130000-rfq-sourcing-send-audit-indexes.ts",
  );

  it("exports up and down functions", async () => {
    const migration = await import(migrationPath);
    expect(typeof migration.up).toBe("function");
    expect(typeof migration.down).toBe("function");
  });

  it("targets the core send-audit collection with no orbit references", () => {
    const source = readFileSync(migrationPath, "utf8");
    expect(source).toContain("rfq_sourcing_send_audits");
    expect(source).not.toContain("orbit_");
    expect(source).not.toContain("cv_assistant_");
  });
});
