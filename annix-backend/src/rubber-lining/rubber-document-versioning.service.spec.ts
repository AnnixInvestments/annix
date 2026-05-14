import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DocumentVersionStatus } from "./entities/document-version.types";
import { RubberDeliveryNote } from "./entities/rubber-delivery-note.entity";
import { RubberSupplierCoc, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { RubberTaxInvoice } from "./entities/rubber-tax-invoice.entity";
import { RubberDocumentVersioningService } from "./rubber-document-versioning.service";

describe("RubberDocumentVersioningService.existingActiveSupplierCoc", () => {
  let service: RubberDocumentVersioningService;

  const andWhere = jest.fn().mockReturnThis();
  const where = jest.fn().mockReturnThis();
  const orderBy = jest.fn().mockReturnThis();
  const getOne = jest.fn();
  const qb = { where, andWhere, orderBy, getOne };

  const supplierCocRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  };
  const taxInvoiceRepo = { createQueryBuilder: jest.fn() };
  const deliveryNoteRepo = { createQueryBuilder: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberDocumentVersioningService,
        { provide: getRepositoryToken(RubberTaxInvoice), useValue: taxInvoiceRepo },
        { provide: getRepositoryToken(RubberDeliveryNote), useValue: deliveryNoteRepo },
        { provide: getRepositoryToken(RubberSupplierCoc), useValue: supplierCocRepo },
      ],
    }).compile();
    service = module.get(RubberDocumentVersioningService);
    jest.clearAllMocks();
    where.mockReturnThis();
    andWhere.mockReturnThis();
    orderBy.mockReturnThis();
    getOne.mockResolvedValue(null);
  });

  it("excludes the given id so a freshly-saved ACTIVE row does not match itself", async () => {
    await service.existingActiveSupplierCoc("B17-28", SupplierCocType.COMPOUNDER, {
      excludeId: 206,
    });

    const excludeCall = andWhere.mock.calls.find(([clause]) =>
      String(clause).includes("coc.id != :excludeId"),
    );
    expect(excludeCall).toBeDefined();
    expect(excludeCall?.[1]).toEqual({ excludeId: 206 });
  });

  it("filters by supplier_company_id when supplied so cross-supplier coc numbers do not collide", async () => {
    await service.existingActiveSupplierCoc("B17-28", SupplierCocType.COMPOUNDER, {
      supplierCompanyId: 8,
    });

    const supplierCall = andWhere.mock.calls.find(([clause]) =>
      String(clause).includes("coc.supplier_company_id = :supplierCompanyId"),
    );
    expect(supplierCall).toBeDefined();
    expect(supplierCall?.[1]).toEqual({ supplierCompanyId: 8 });
  });

  it("omits the new filters when options are not provided (backwards-compatible)", async () => {
    await service.existingActiveSupplierCoc("B17-28", SupplierCocType.COMPOUNDER);

    const hasExclude = andWhere.mock.calls.some(([clause]) =>
      String(clause).includes("coc.id != :excludeId"),
    );
    const hasSupplier = andWhere.mock.calls.some(([clause]) =>
      String(clause).includes("coc.supplier_company_id"),
    );
    expect(hasExclude).toBe(false);
    expect(hasSupplier).toBe(false);
  });

  it("always filters by coc_type and version_status = ACTIVE", async () => {
    await service.existingActiveSupplierCoc("B17-28", SupplierCocType.COMPOUNDER);

    const cocTypeCall = andWhere.mock.calls.find(([clause]) =>
      String(clause).includes("coc.coc_type"),
    );
    const versionStatusCall = andWhere.mock.calls.find(([clause]) =>
      String(clause).includes("coc.version_status"),
    );
    expect(cocTypeCall?.[1]).toEqual({ cocType: SupplierCocType.COMPOUNDER });
    expect(versionStatusCall?.[1]).toEqual({ status: DocumentVersionStatus.ACTIVE });
  });

  it("returns null when cocNumber is empty without touching the repository", async () => {
    const result = await service.existingActiveSupplierCoc("", SupplierCocType.COMPOUNDER);
    expect(result).toBeNull();
    expect(supplierCocRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
