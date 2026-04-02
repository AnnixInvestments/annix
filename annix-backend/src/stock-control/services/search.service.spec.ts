import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { DeliveryNote } from "../entities/delivery-note.entity";
import { JobCard } from "../entities/job-card.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockItem } from "../entities/stock-item.entity";
import { SupplierInvoice } from "../entities/supplier-invoice.entity";
import { SearchService } from "./search.service";

const createMockQueryBuilder = (rows: unknown[] = []) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(rows),
});

const makeJobCard = (overrides: Partial<JobCard> = {}): Partial<JobCard> => ({
  id: 1,
  jobNumber: "JC-001",
  jcNumber: "JC-001-A",
  jobName: "Test Job",
  customerName: "Example Corp",
  description: "Steel fabrication",
  status: "in_progress",
  updatedAt: new Date("2026-03-01T12:00:00Z"),
  ...overrides,
});

const makeStockItem = (overrides: Partial<StockItem> = {}): Partial<StockItem> => ({
  id: 2,
  sku: "SKU-100",
  name: "Flange 150NB",
  description: "Slip-on flange",
  category: "Flanges",
  quantity: 50,
  unitOfMeasure: "EA",
  updatedAt: new Date("2026-03-02T12:00:00Z"),
  ...overrides,
});

const makeStaff = (overrides: Partial<StaffMember> = {}): Partial<StaffMember> => ({
  id: 3,
  name: "John Doe",
  employeeNumber: "EMP-001",
  department: "Workshop",
  active: true,
  updatedAt: new Date("2026-03-03T12:00:00Z"),
  ...overrides,
});

const makeDeliveryNote = (overrides: Partial<DeliveryNote> = {}): Partial<DeliveryNote> => ({
  id: 4,
  deliveryNumber: "DN-2001",
  supplierName: "Sample Industries",
  notes: "Pipe delivery",
  createdAt: new Date("2026-03-04T12:00:00Z"),
  ...overrides,
});

const makeInvoice = (overrides: Partial<SupplierInvoice> = {}): Partial<SupplierInvoice> => ({
  id: 5,
  invoiceNumber: "INV-5001",
  supplierName: "Sample Industries",
  totalAmount: 12500.0,
  extractionStatus: "completed",
  updatedAt: new Date("2026-03-05T12:00:00Z"),
  ...overrides,
});

const makeCpo = (
  overrides: Partial<CustomerPurchaseOrder> = {},
): Partial<CustomerPurchaseOrder> => ({
  id: 6,
  cpoNumber: "CPO-300",
  jobNumber: "JC-001",
  jobName: "Test Job",
  customerName: "Example Corp",
  poNumber: "PO-9001",
  status: "open",
  updatedAt: new Date("2026-03-06T12:00:00Z"),
  ...overrides,
});

describe("SearchService", () => {
  let service: SearchService;

  const mockJobCardRepo = { createQueryBuilder: jest.fn() };
  const mockStockItemRepo = { createQueryBuilder: jest.fn() };
  const mockStaffRepo = { createQueryBuilder: jest.fn() };
  const mockDeliveryNoteRepo = { createQueryBuilder: jest.fn() };
  const mockInvoiceRepo = { createQueryBuilder: jest.fn() };
  const mockCpoRepo = { createQueryBuilder: jest.fn() };

  const allRepos = [
    mockJobCardRepo,
    mockStockItemRepo,
    mockStaffRepo,
    mockDeliveryNoteRepo,
    mockInvoiceRepo,
    mockCpoRepo,
  ];

  const configureAllReposEmpty = () => {
    allRepos.forEach((repo) => {
      repo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]));
    });
  };

  beforeEach(async () => {
    configureAllReposEmpty();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(JobCard), useValue: mockJobCardRepo },
        { provide: getRepositoryToken(StockItem), useValue: mockStockItemRepo },
        { provide: getRepositoryToken(StaffMember), useValue: mockStaffRepo },
        { provide: getRepositoryToken(DeliveryNote), useValue: mockDeliveryNoteRepo },
        { provide: getRepositoryToken(SupplierInvoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(CustomerPurchaseOrder), useValue: mockCpoRepo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
    configureAllReposEmpty();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("search", () => {
    describe("returns results from all entity types", () => {
      it("includes job cards, stock items, staff, delivery notes, invoices, and CPOs for privileged roles", async () => {
        const jobCard = makeJobCard();
        const stockItem = makeStockItem();
        const staff = makeStaff();
        const deliveryNote = makeDeliveryNote();
        const invoice = makeInvoice();
        const cpo = makeCpo();

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([jobCard]));
        mockStockItemRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([stockItem]));
        mockStaffRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([staff]));
        mockDeliveryNoteRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([deliveryNote]),
        );
        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([invoice]));
        mockCpoRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([cpo]));

        const result = await service.search(1, "test", "admin", 20);

        const resultTypes = result.results.map((r) => r.type);
        expect(resultTypes).toContain("job_card");
        expect(resultTypes).toContain("stock_item");
        expect(resultTypes).toContain("staff");
        expect(resultTypes).toContain("delivery_note");
        expect(resultTypes).toContain("invoice");
        expect(resultTypes).toContain("purchase_order");
        expect(result.totalCount).toBe(6);
        expect(result.query).toBe("test");
      });

      it("formats job card titles with jobNumber, jcNumber, and jobName", async () => {
        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeJobCard()]));

        const result = await service.search(1, "JC-001", "admin", 20);

        const jcResult = result.results.find((r) => r.type === "job_card");
        expect(jcResult).toBeDefined();
        expect(jcResult!.title).toBe("JC-001 / JC-001-A — Test Job");
        expect(jcResult!.href).toBe("/stock-control/portal/job-cards/1");
      });

      it("formats stock item titles with sku and name", async () => {
        mockStockItemRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([makeStockItem()]),
        );

        const result = await service.search(1, "SKU", "admin", 20);

        const siResult = result.results.find((r) => r.type === "stock_item");
        expect(siResult).toBeDefined();
        expect(siResult!.title).toBe("SKU-100 — Flange 150NB");
        expect(siResult!.subtitle).toBe("Flanges · 50 EA");
      });

      it("formats staff results with active/inactive status", async () => {
        mockStaffRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([makeStaff({ active: false })]),
        );

        const result = await service.search(1, "John", "admin", 20);

        const staffResult = result.results.find((r) => r.type === "staff");
        expect(staffResult).toBeDefined();
        expect(staffResult!.status).toBe("inactive");
      });

      it("formats delivery note titles with DN prefix", async () => {
        mockDeliveryNoteRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([makeDeliveryNote()]),
        );

        const result = await service.search(1, "DN", "admin", 20);

        const dnResult = result.results.find((r) => r.type === "delivery_note");
        expect(dnResult).toBeDefined();
        expect(dnResult!.title).toBe("DN DN-2001");
        expect(dnResult!.subtitle).toBe("Sample Industries");
      });

      it("formats invoice results with amount and extraction status", async () => {
        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeInvoice()]));

        const result = await service.search(1, "INV", "admin", 20);

        const invResult = result.results.find((r) => r.type === "invoice");
        expect(invResult).toBeDefined();
        expect(invResult!.title).toBe("Invoice INV-5001");
        expect(invResult!.subtitle).toBe("Sample Industries · R 12500.00");
        expect(invResult!.status).toBe("completed");
      });

      it("formats CPO results with cpoNumber and jobName", async () => {
        mockCpoRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeCpo()]));

        const result = await service.search(1, "CPO", "admin", 20);

        const cpoResult = result.results.find((r) => r.type === "purchase_order");
        expect(cpoResult).toBeDefined();
        expect(cpoResult!.title).toBe("CPO CPO-300 — Test Job");
        expect(cpoResult!.subtitle).toBe("Example Corp · PO: PO-9001");
      });
    });

    describe("role-based visibility", () => {
      it("excludes invoices for viewer role", async () => {
        const jobCard = makeJobCard();
        const invoice = makeInvoice();

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([jobCard]));
        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([invoice]));

        const result = await service.search(1, "test", "viewer", 20);

        const resultTypes = result.results.map((r) => r.type);
        expect(resultTypes).not.toContain("invoice");
        expect(mockInvoiceRepo.createQueryBuilder).not.toHaveBeenCalled();
      });

      it("excludes invoices for operator role", async () => {
        const result = await service.search(1, "test", "operator", 20);

        const resultTypes = result.results.map((r) => r.type);
        expect(resultTypes).not.toContain("invoice");
        expect(mockInvoiceRepo.createQueryBuilder).not.toHaveBeenCalled();
      });

      it("includes invoices for accounts role", async () => {
        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeInvoice()]));

        const result = await service.search(1, "test", "accounts", 20);

        const resultTypes = result.results.map((r) => r.type);
        expect(resultTypes).toContain("invoice");
      });

      it("includes invoices for manager role", async () => {
        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeInvoice()]));

        const result = await service.search(1, "test", "manager", 20);

        const resultTypes = result.results.map((r) => r.type);
        expect(resultTypes).toContain("invoice");
      });

      it("includes invoices for admin role", async () => {
        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeInvoice()]));

        const result = await service.search(1, "test", "admin", 20);

        const resultTypes = result.results.map((r) => r.type);
        expect(resultTypes).toContain("invoice");
      });
    });

    describe("empty query handling", () => {
      it("returns empty results for empty string", async () => {
        const result = await service.search(1, "", "admin", 20);

        expect(result).toEqual({ results: [], totalCount: 0, query: "" });
        expect(mockJobCardRepo.createQueryBuilder).not.toHaveBeenCalled();
      });

      it("returns empty results for whitespace-only query", async () => {
        const result = await service.search(1, "   ", "admin", 20);

        expect(result).toEqual({ results: [], totalCount: 0, query: "   " });
        expect(mockJobCardRepo.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe("result limiting", () => {
      it("respects the limit parameter", async () => {
        const jobCards = Array.from({ length: 5 }, (_, i) =>
          makeJobCard({
            id: i + 1,
            jobNumber: `JC-${String(i + 1).padStart(3, "0")}`,
            updatedAt: new Date(`2026-03-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
          }),
        );

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(jobCards));

        const result = await service.search(1, "JC", "admin", 3);

        expect(result.results.length).toBeLessThanOrEqual(3);
        expect(result.totalCount).toBe(5);
      });

      it("uses default limit of 20 when not specified", async () => {
        const jobCards = Array.from({ length: 25 }, (_, i) =>
          makeJobCard({
            id: i + 1,
            jobNumber: `JC-${String(i + 1).padStart(3, "0")}`,
            updatedAt: new Date("2026-03-01T12:00:00Z"),
          }),
        );

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(jobCards));

        const result = await service.search(1, "JC", "admin");

        expect(result.results.length).toBeLessThanOrEqual(20);
        expect(result.totalCount).toBe(25);
      });

      it("returns all results when total is under the limit", async () => {
        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([makeJobCard()]));
        mockStockItemRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([makeStockItem()]),
        );

        const result = await service.search(1, "test", "viewer", 50);

        expect(result.results.length).toBe(2);
        expect(result.totalCount).toBe(2);
      });
    });

    describe("exact match vs pattern match ranking", () => {
      it("ranks exact matches higher than pattern matches", async () => {
        const exactMatch = makeJobCard({
          id: 1,
          jobNumber: "JC-001",
          jcNumber: null,
          jobName: "JC-001",
          updatedAt: new Date("2026-01-01T12:00:00Z"),
        });
        const patternMatch = makeJobCard({
          id: 2,
          jobNumber: "JC-001-EXT",
          jcNumber: null,
          jobName: "Extended JC-001 Project",
          updatedAt: new Date("2026-03-01T12:00:00Z"),
        });

        mockJobCardRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([exactMatch, patternMatch]),
        );

        const result = await service.search(1, "JC-001", "admin", 20);

        const jobCards = result.results.filter((r) => r.type === "job_card");
        expect(jobCards[0].matchRank).toBe(1);
        expect(jobCards[1].matchRank).toBe(2);
      });

      it("sorts by updatedAt within the same match rank", async () => {
        const older = makeJobCard({
          id: 1,
          jobNumber: "JC-OLD",
          jcNumber: null,
          jobName: "Older Job",
          updatedAt: new Date("2026-01-01T12:00:00Z"),
        });
        const newer = makeJobCard({
          id: 2,
          jobNumber: "JC-NEW",
          jcNumber: null,
          jobName: "Newer Job",
          updatedAt: new Date("2026-03-15T12:00:00Z"),
        });

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([older, newer]));

        const result = await service.search(1, "JC", "admin", 20);

        const jobCards = result.results.filter((r) => r.type === "job_card");
        expect(jobCards.length).toBe(2);
        expect(jobCards[0].id).toBe(2);
        expect(jobCards[1].id).toBe(1);
      });

      it("assigns matchRank 1 for exact SKU match on stock items", async () => {
        const exactSku = makeStockItem({ id: 10, sku: "BOLT-M12" });

        mockStockItemRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([exactSku]));

        const result = await service.search(1, "BOLT-M12", "admin", 20);

        const siResult = result.results.find((r) => r.type === "stock_item");
        expect(siResult).toBeDefined();
        expect(siResult!.matchRank).toBe(1);
      });

      it("assigns matchRank 1 for exact delivery number match", async () => {
        const exactDn = makeDeliveryNote({ id: 20, deliveryNumber: "DN-5000" });

        mockDeliveryNoteRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([exactDn]));

        const result = await service.search(1, "DN-5000", "admin", 20);

        const dnResult = result.results.find((r) => r.type === "delivery_note");
        expect(dnResult).toBeDefined();
        expect(dnResult!.matchRank).toBe(1);
      });

      it("assigns matchRank 1 for exact invoice number match", async () => {
        const exactInv = makeInvoice({ id: 30, invoiceNumber: "INV-9999" });

        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([exactInv]));

        const result = await service.search(1, "INV-9999", "admin", 20);

        const invResult = result.results.find((r) => r.type === "invoice");
        expect(invResult).toBeDefined();
        expect(invResult!.matchRank).toBe(1);
      });

      it("assigns matchRank 1 for exact CPO number match", async () => {
        const exactCpo = makeCpo({ id: 40, cpoNumber: "CPO-100" });

        mockCpoRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([exactCpo]));

        const result = await service.search(1, "CPO-100", "admin", 20);

        const cpoResult = result.results.find((r) => r.type === "purchase_order");
        expect(cpoResult).toBeDefined();
        expect(cpoResult!.matchRank).toBe(1);
      });

      it("assigns matchRank 2 for pattern-only matches", async () => {
        const partialMatch = makeJobCard({
          id: 1,
          jobNumber: "JC-001-LONG",
          jcNumber: null,
          jobName: "Some Long Name",
        });

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([partialMatch]));

        const result = await service.search(1, "JC-001", "admin", 20);

        const jcResult = result.results.find((r) => r.type === "job_card");
        expect(jcResult).toBeDefined();
        expect(jcResult!.matchRank).toBe(2);
      });
    });

    describe("edge cases", () => {
      it("handles null subtitle fields gracefully", async () => {
        const jobCard = makeJobCard({
          customerName: null,
          description: null,
        });

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([jobCard]));

        const result = await service.search(1, "test", "admin", 20);

        const jcResult = result.results.find((r) => r.type === "job_card");
        expect(jcResult).toBeDefined();
        expect(jcResult!.subtitle).toBeNull();
      });

      it("handles job card without jcNumber", async () => {
        const jobCard = makeJobCard({ jcNumber: null });

        mockJobCardRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([jobCard]));

        const result = await service.search(1, "test", "admin", 20);

        const jcResult = result.results.find((r) => r.type === "job_card");
        expect(jcResult).toBeDefined();
        expect(jcResult!.title).toBe("JC-001 — Test Job");
      });

      it("handles CPO without jobName falling back to jobNumber", async () => {
        const cpo = makeCpo({ jobName: null, jobNumber: "JC-FALLBACK" });

        mockCpoRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([cpo]));

        const result = await service.search(1, "CPO", "admin", 20);

        const cpoResult = result.results.find((r) => r.type === "purchase_order");
        expect(cpoResult).toBeDefined();
        expect(cpoResult!.title).toBe("CPO CPO-300 — JC-FALLBACK");
      });

      it("handles invoice with null totalAmount", async () => {
        const invoice = makeInvoice({ totalAmount: null });

        mockInvoiceRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([invoice]));

        const result = await service.search(1, "INV", "admin", 20);

        const invResult = result.results.find((r) => r.type === "invoice");
        expect(invResult).toBeDefined();
        expect(invResult!.subtitle).toBe("Sample Industries");
      });

      it("handles null updatedAt by treating as epoch 0 for sorting", async () => {
        const withDate = makeJobCard({
          id: 1,
          jobNumber: "JC-WITH",
          jcNumber: null,
          jobName: "With Date",
          updatedAt: new Date("2026-03-01T12:00:00Z"),
        });
        const withoutDate = makeJobCard({
          id: 2,
          jobNumber: "JC-WITHOUT",
          jcNumber: null,
          jobName: "Without Date",
          updatedAt: null,
        });

        mockJobCardRepo.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder([withDate, withoutDate]),
        );

        const result = await service.search(1, "JC", "admin", 20);

        const jobCards = result.results.filter((r) => r.type === "job_card");
        expect(jobCards[0].id).toBe(1);
        expect(jobCards[1].id).toBe(2);
        expect(jobCards[1].updatedAt).toBeNull();
      });

      it("trims whitespace from query before searching", async () => {
        const qb = createMockQueryBuilder([makeJobCard()]);
        mockJobCardRepo.createQueryBuilder.mockReturnValue(qb);

        await service.search(1, "  JC-001  ", "admin", 20);

        expect(qb.andWhere).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ pattern: "%JC-001%" }),
        );
      });

      it("preserves original query in response even when trimmed internally", async () => {
        const result = await service.search(1, "  test  ", "admin", 20);

        expect(result.query).toBe("  test  ");
      });
    });
  });
});
