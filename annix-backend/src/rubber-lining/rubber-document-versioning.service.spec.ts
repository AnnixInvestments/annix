import { Test, TestingModule } from "@nestjs/testing";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberDocumentVersioningService,
        { provide: RubberTaxInvoiceRepository, useValue: taxInvoiceRepo },
        { provide: RubberDeliveryNoteRepository, useValue: deliveryNoteRepo },
        { provide: RubberSupplierCocRepository, useValue: supplierCocRepo },
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
