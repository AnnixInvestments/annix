import { Test, TestingModule } from "@nestjs/testing";
import { SageExportService } from "../../sage-export/sage-export.service";
import { IdempotencyService } from "../../shared/services/idempotency.service";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { InvoiceService } from "../services/invoice.service";
import { InvoiceExtractionService } from "../services/invoice-extraction.service";
import { SageInvoiceAdapterService } from "../services/sage-invoice-adapter.service";
import { InvoicesController } from "./invoices.controller";

describe("InvoicesController", () => {
  let controller: InvoicesController;
  let invoiceService: jest.Mocked<InvoiceService>;
  let extractionService: jest.Mocked<InvoiceExtractionService>;
  let sageAdapter: jest.Mocked<SageInvoiceAdapterService>;
  let sageExportService: jest.Mocked<SageExportService>;

  const mockReq = (companyId = 1) => ({
    user: { id: 10, companyId, name: "Test User", email: "test@example.com", uid: "uid-123" },
  });

  beforeEach(async () => {
    const mockInvoiceService = {
      findAll: jest.fn(),
      findUnlinked: jest.fn(),
      findById: jest.fn(),
      suggestDeliveryNoteMatches: jest.fn(),
      linkToDeliveryNote: jest.fn(),
      create: jest.fn(),
      uploadScan: jest.fn(),
      reExtract: jest.fn(),
      pendingClarifications: jest.fn(),
      submitClarification: jest.fn(),
      skipClarification: jest.fn(),
      priceChangeSummary: jest.fn(),
      approve: jest.fn(),
      remove: jest.fn(),
      autoLinkAllUnlinked: jest.fn(),
      reExtractAllFailed: jest.fn(),
    };

    const mockExtractionService = {
      updateInvoiceItem: jest.fn(),
    };

    const mockSageAdapter = {
      previewCount: jest.fn(),
      exportableInvoices: jest.fn(),
      markExported: jest.fn(),
    };

    const mockSageExportService = {
      generateCsv: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: InvoiceService, useValue: mockInvoiceService },
        { provide: InvoiceExtractionService, useValue: mockExtractionService },
        { provide: SageInvoiceAdapterService, useValue: mockSageAdapter },
        { provide: SageExportService, useValue: mockSageExportService },
        { provide: IdempotencyService, useValue: { check: jest.fn(), store: jest.fn() } },
      ],
    })
      .overrideGuard(StockControlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(StockControlRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvoicesController>(InvoicesController);
    invoiceService = module.get(InvoiceService);
    extractionService = module.get(InvoiceExtractionService);
    sageAdapter = module.get(SageInvoiceAdapterService);
    sageExportService = module.get(SageExportService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET / (list)", () => {
    it("should parse pagination and delegate to invoiceService.findAll", async () => {
      const expected = { data: [], total: 0 };
      invoiceService.findAll.mockResolvedValue(expected as any);

      const result = await controller.list(mockReq(), "2", "25");

      expect(invoiceService.findAll).toHaveBeenCalledWith(1, 2, 25);
      expect(result).toBe(expected);
    });

    it("should default to page 1 and limit 50", async () => {
      invoiceService.findAll.mockResolvedValue({ data: [] } as any);

      await controller.list(mockReq());

      expect(invoiceService.findAll).toHaveBeenCalledWith(1, 1, 50);
    });

    it("should clamp page to minimum 1 and limit to max 100", async () => {
      invoiceService.findAll.mockResolvedValue({ data: [] } as any);

      await controller.list(mockReq(), "-5", "500");

      expect(invoiceService.findAll).toHaveBeenCalledWith(1, 1, 100);
    });
  });

  describe("GET /unlinked (listUnlinked)", () => {
    it("should delegate to invoiceService.findUnlinked", async () => {
      const unlinked = [{ id: 1 }];
      invoiceService.findUnlinked.mockResolvedValue(unlinked as any);

      const result = await controller.listUnlinked(mockReq());

      expect(invoiceService.findUnlinked).toHaveBeenCalledWith(1);
      expect(result).toBe(unlinked);
    });
  });

  describe("GET /export/sage-preview", () => {
    it("should delegate to sageAdapter.previewCount with filters", async () => {
      const filters = { from: "2026-01-01", to: "2026-01-31" } as any;
      const preview = { count: 5, total: 10000 };
      sageAdapter.previewCount.mockResolvedValue(preview as any);

      const result = await controller.sageExportPreview(mockReq(), filters);

      expect(sageAdapter.previewCount).toHaveBeenCalledWith(1, filters);
      expect(result).toBe(preview);
    });
  });

  describe("GET /export/sage-csv", () => {
    it("should generate CSV, mark exported, and send response", async () => {
      const filters = {} as any;
      const invoices = [{ id: 1 }];
      const invoiceIds = [1];
      sageAdapter.exportableInvoices.mockResolvedValue({ invoices, invoiceIds } as any);
      sageExportService.generateCsv.mockReturnValue("csv-data");

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any;

      await controller.sageExportCsv(mockReq(), filters, res);

      expect(sageAdapter.exportableInvoices).toHaveBeenCalledWith(1, filters);
      expect(sageExportService.generateCsv).toHaveBeenCalledWith(invoices);
      expect(sageAdapter.markExported).toHaveBeenCalledWith(1, invoiceIds);
      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="sage-export.csv"',
      );
      expect(res.send).toHaveBeenCalledWith("csv-data");
    });
  });

  describe("POST /auto-link (autoLinkAll)", () => {
    it("should delegate to invoiceService.autoLinkAllUnlinked", async () => {
      const expected = { linked: 3 };
      invoiceService.autoLinkAllUnlinked.mockResolvedValue(expected as any);

      const result = await controller.autoLinkAll(mockReq());

      expect(invoiceService.autoLinkAllUnlinked).toHaveBeenCalledWith(1);
      expect(result).toBe(expected);
    });
  });

  describe("POST /re-extract-all-failed", () => {
    it("should delegate to invoiceService.reExtractAllFailed", async () => {
      const expected = { reExtracted: 2 };
      invoiceService.reExtractAllFailed.mockResolvedValue(expected as any);

      const result = await controller.reExtractAllFailed(mockReq());

      expect(invoiceService.reExtractAllFailed).toHaveBeenCalledWith(1);
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id (findById)", () => {
    it("should delegate to invoiceService.findById", async () => {
      const invoice = { id: 5, invoiceNumber: "INV-001" };
      invoiceService.findById.mockResolvedValue(invoice as any);

      const result = await controller.findById(mockReq(), 5);

      expect(invoiceService.findById).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(invoice);
    });
  });

  describe("GET /:id/suggested-delivery-notes", () => {
    it("should delegate to invoiceService.suggestDeliveryNoteMatches", async () => {
      const suggestions = [{ deliveryNoteId: 1, score: 0.9 }];
      invoiceService.suggestDeliveryNoteMatches.mockResolvedValue(suggestions as any);

      const result = await controller.suggestedDeliveryNotes(mockReq(), 5);

      expect(invoiceService.suggestDeliveryNoteMatches).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(suggestions);
    });
  });

  describe("POST /:id/link-delivery-note", () => {
    it("should delegate to invoiceService.linkToDeliveryNote", async () => {
      const expected = { linked: true };
      invoiceService.linkToDeliveryNote.mockResolvedValue(expected as any);
      const dto = { deliveryNoteId: 10 };

      const result = await controller.linkToDeliveryNote(mockReq(), 5, dto as any);

      expect(invoiceService.linkToDeliveryNote).toHaveBeenCalledWith(1, 5, 10);
      expect(result).toBe(expected);
    });
  });

  describe("POST / (create)", () => {
    it("should delegate to invoiceService.create", async () => {
      const dto = { invoiceNumber: "INV-001" } as any;
      const created = { id: 1, ...dto };
      invoiceService.create.mockResolvedValue(created as any);

      const result = await controller.create(dto, mockReq());

      expect(invoiceService.create).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(created);
    });
  });

  describe("POST /:id/scan (uploadScan)", () => {
    it("should delegate to invoiceService.uploadScan", async () => {
      const file = { buffer: Buffer.from("scan") } as Express.Multer.File;
      const expected = { status: "processing" };
      invoiceService.uploadScan.mockResolvedValue(expected as any);

      const result = await controller.uploadScan(mockReq(), 5, file);

      expect(invoiceService.uploadScan).toHaveBeenCalledWith(1, 5, file);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/re-extract", () => {
    it("should delegate to invoiceService.reExtract", async () => {
      const expected = { status: "processing" };
      invoiceService.reExtract.mockResolvedValue(expected as any);

      const result = await controller.reExtract(mockReq(), 5);

      expect(invoiceService.reExtract).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id/clarifications", () => {
    it("should delegate to invoiceService.pendingClarifications", async () => {
      const clarifications = [{ id: 1, question: "Which item?" }];
      invoiceService.pendingClarifications.mockResolvedValue(clarifications as any);

      const result = await controller.clarifications(mockReq(), 5);

      expect(invoiceService.pendingClarifications).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(clarifications);
    });
  });

  describe("POST /:id/clarifications/:clarificationId", () => {
    it("should delegate to invoiceService.submitClarification", async () => {
      const dto = { answer: "Item A" } as any;
      const expected = { resolved: true };
      invoiceService.submitClarification.mockResolvedValue(expected as any);

      const result = await controller.submitClarification(mockReq(), 5, 20, dto);

      expect(invoiceService.submitClarification).toHaveBeenCalledWith(1, 5, 20, dto, 10);
      expect(result).toBe(expected);
    });
  });

  describe("POST /:id/clarifications/:clarificationId/skip", () => {
    it("should delegate to invoiceService.skipClarification", async () => {
      const expected = { skipped: true };
      invoiceService.skipClarification.mockResolvedValue(expected as any);

      const result = await controller.skipClarification(mockReq(), 5, 20);

      expect(invoiceService.skipClarification).toHaveBeenCalledWith(1, 5, 20, 10);
      expect(result).toBe(expected);
    });
  });

  describe("GET /:id/price-summary", () => {
    it("should delegate to invoiceService.priceChangeSummary", async () => {
      const summary = { changes: [] };
      invoiceService.priceChangeSummary.mockResolvedValue(summary as any);

      const result = await controller.priceSummary(mockReq(), 5);

      expect(invoiceService.priceChangeSummary).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(summary);
    });
  });

  describe("POST /:id/approve", () => {
    it("should delegate to invoiceService.approve", async () => {
      const expected = { approved: true };
      invoiceService.approve.mockResolvedValue(expected as any);

      const result = await controller.approve(mockReq(), 5);

      expect(invoiceService.approve).toHaveBeenCalledWith(1, 5, 10);
      expect(result).toBe(expected);
    });
  });

  describe("PATCH /:id/items/:itemId (updateItem)", () => {
    it("should verify invoice exists then delegate to extractionService", async () => {
      invoiceService.findById.mockResolvedValue({ id: 5 } as any);
      const dto = { quantity: 10 } as any;
      const expected = { id: 30, quantity: 10 };
      extractionService.updateInvoiceItem.mockResolvedValue(expected as any);

      const result = await controller.updateItem(mockReq(), 5, 30, dto);

      expect(invoiceService.findById).toHaveBeenCalledWith(1, 5);
      expect(extractionService.updateInvoiceItem).toHaveBeenCalledWith(5, 30, dto, 10);
      expect(result).toBe(expected);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delegate to invoiceService.remove", async () => {
      invoiceService.remove.mockResolvedValue(undefined as any);

      await controller.remove(mockReq(), 5);

      expect(invoiceService.remove).toHaveBeenCalledWith(1, 5);
    });
  });
});
