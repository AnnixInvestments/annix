import { Test, TestingModule } from "@nestjs/testing";
import { DocumentVersionStatus } from "./entities/document-version.types";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberAuCocRepository } from "./repositories/rubber-au-coc.repository";
import { RubberDeliveryNoteRepository } from "./repositories/rubber-delivery-note.repository";
import { RubberSupplierCocRepository } from "./repositories/rubber-supplier-coc.repository";
import { RubberTaxInvoiceRepository } from "./repositories/rubber-tax-invoice.repository";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";

describe("RubberDocumentVersioningService.existingActiveSupplierCoc", () => {
  let service: RubberDocumentVersioningService;

  const supplierCocRepo = {
    findOneActiveByNormalizedNumberAndType: jest.fn(),
  };
  const taxInvoiceRepo = {};
  const deliveryNoteRepo = {};
  const auCocRepo = { repointSourceDeliveryNoteId: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberDocumentVersioningService,
        { provide: RubberTaxInvoiceRepository, useValue: taxInvoiceRepo },
        { provide: RubberDeliveryNoteRepository, useValue: deliveryNoteRepo },
        { provide: RubberSupplierCocRepository, useValue: supplierCocRepo },
        { provide: RubberAuCocRepository, useValue: auCocRepo },
      ],
    }).compile();
    service = module.get(RubberDocumentVersioningService);
    jest.clearAllMocks();
    supplierCocRepo.findOneActiveByNormalizedNumberAndType.mockResolvedValue(null);
  });

  it("passes the excludeId option through so a freshly-saved ACTIVE row does not match itself", async () => {
    await service.existingActiveSupplierCoc("B17-28", SupplierCocType.COMPOUNDER, {
      excludeId: 206,
    });

    expect(supplierCocRepo.findOneActiveByNormalizedNumberAndType).toHaveBeenCalledWith(
      "B17-28",
      SupplierCocType.COMPOUNDER,
      { excludeId: 206 },
    );
  });

  it("passes the supplierCompanyId option through so cross-supplier coc numbers do not collide", async () => {
    await service.existingActiveSupplierCoc("B17-28", SupplierCocType.COMPOUNDER, {
      supplierCompanyId: 8,
    });

    expect(supplierCocRepo.findOneActiveByNormalizedNumberAndType).toHaveBeenCalledWith(
      "B17-28",
      SupplierCocType.COMPOUNDER,
      { supplierCompanyId: 8 },
    );
  });

  it("normalizes the coc number before delegating to the repository", async () => {
    await service.existingActiveSupplierCoc("B17 – 28", SupplierCocType.COMPOUNDER);

    expect(supplierCocRepo.findOneActiveByNormalizedNumberAndType).toHaveBeenCalledWith(
      "B17-28",
      SupplierCocType.COMPOUNDER,
      {},
    );
  });

  it("returns null when cocNumber is empty without touching the repository", async () => {
    const result = await service.existingActiveSupplierCoc("", SupplierCocType.COMPOUNDER);
    expect(result).toBeNull();
    expect(supplierCocRepo.findOneActiveByNormalizedNumberAndType).not.toHaveBeenCalled();
  });
});

describe("RubberDocumentVersioningService.authorizeVersion (signed POD)", () => {
  let service: RubberDocumentVersioningService;

  // v2 = the uploaded signed POD; v1 = the unsigned CDN that came from email.
  const v1 = {
    id: 1,
    version: 1,
    versionStatus: DocumentVersionStatus.ACTIVE,
    previousVersionId: null,
    requiresSignedPod: true,
    signedPodReceived: false,
  };
  const v2 = {
    id: 2,
    version: 2,
    versionStatus: DocumentVersionStatus.PENDING_AUTHORIZATION,
    previousVersionId: 1,
    requiresSignedPod: false,
    signedPodReceived: false,
  };

  const deliveryNoteRepo = {
    findById: jest.fn(),
    save: jest.fn((entity) => Promise.resolve(entity)),
  };
  const supplierCocRepo = { repointLinkedDeliveryNoteId: jest.fn() };
  const auCocRepo = { repointSourceDeliveryNoteId: jest.fn().mockResolvedValue(1) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberDocumentVersioningService,
        { provide: RubberTaxInvoiceRepository, useValue: {} },
        { provide: RubberDeliveryNoteRepository, useValue: deliveryNoteRepo },
        { provide: RubberSupplierCocRepository, useValue: supplierCocRepo },
        { provide: RubberAuCocRepository, useValue: auCocRepo },
      ],
    }).compile();
    service = module.get(RubberDocumentVersioningService);
    jest.clearAllMocks();
    v1.versionStatus = DocumentVersionStatus.ACTIVE;
    v1.signedPodReceived = false;
    v2.versionStatus = DocumentVersionStatus.PENDING_AUTHORIZATION;
    v2.signedPodReceived = false;
    v2.requiresSignedPod = false;
    deliveryNoteRepo.findById.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? v1 : id === 2 ? v2 : null),
    );
  });

  it("supersedes the unsigned CDN and marks the signed version as POD-received", async () => {
    const result = await service.authorizeVersion("delivery-note", 2);

    expect(result).toEqual({ authorizedId: 2, supersededId: 1 });
    expect(v1.versionStatus).toBe(DocumentVersionStatus.SUPERSEDED);
    expect(v2.versionStatus).toBe(DocumentVersionStatus.ACTIVE);
    // The newly-active version carries the satisfied POD obligation so it drops
    // out of the "awaiting signed POD" worklist.
    expect(v2.requiresSignedPod).toBe(true);
    expect(v2.signedPodReceived).toBe(true);
  });

  it("repoints any AU CoC issued off the unsigned CDN onto the signed version", async () => {
    await service.authorizeVersion("delivery-note", 2);

    expect(auCocRepo.repointSourceDeliveryNoteId).toHaveBeenCalledWith(1, 2);
  });
});
