import { Test, TestingModule } from "@nestjs/testing";

import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ClarificationStatus, ClarificationType } from "../entities/invoice-clarification.entity";
import { InvoiceExtractionStatus } from "../entities/supplier-invoice.entity";
import { InvoiceItemMatchStatus } from "../entities/supplier-invoice-item.entity";
import { DeliveryNoteRepository } from "../repositories/delivery-note.repository";
import { InvoiceClarificationRepository } from "../repositories/invoice-clarification.repository";
import { InvoiceExtractionCorrectionRepository } from "../repositories/invoice-extraction-correction.repository";
import { StockItemRepository } from "../repositories/stock-item.repository";
import { StockPriceHistoryRepository } from "../repositories/stock-price-history.repository";
import { SupplierInvoiceRepository } from "../repositories/supplier-invoice.repository";
import { SupplierInvoiceItemRepository } from "../repositories/supplier-invoice-item.repository";
import { InvoiceExtractionService } from "./invoice-extraction.service";

describe("InvoiceExtractionService", () => {
  let service: InvoiceExtractionService;

  const invoiceFindOne = jest.fn();
  const invoiceFind = jest.fn();
  const invoiceItemFind = jest.fn();

  const mockInvoiceRepo = {
    findOne: invoiceFindOne,
    find: invoiceFind,
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    updateById: jest.fn().mockResolvedValue(undefined),
    findOneById: (id: number) => invoiceFindOne({ where: { id } }),
    findOneByIdWithRelations: (id: number) => invoiceFindOne({ where: { id } }),
    findUnlinkedForCompany: (companyId: number) => invoiceFind({ where: { companyId } }),
  };

  const mockInvoiceItemRepo = {
    find: invoiceItemFind,
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    delete: jest.fn(),
    buildMany: jest.fn().mockImplementation((rows) => rows),
    saveMany: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
    deleteByInvoice: jest.fn().mockResolvedValue(undefined),
    findByInvoice: (invoiceId: number) => invoiceItemFind({ where: { invoiceId } }),
    findByInvoiceWithRelations: (invoiceId: number) => invoiceItemFind({ where: { invoiceId } }),
    findOneByIdAndInvoice: jest.fn(),
    findOneByIdAndInvoiceWithRelations: jest.fn(),
  };

  const mockClarificationRepo = {
    findOneByIdWithRelations: jest.fn(),
    findById: jest.fn(),
    findByInvoiceItemAndStatus: jest.fn().mockResolvedValue([]),
    findByInvoiceAndStatus: jest.fn().mockResolvedValue([]),
    findSkippedPriceForInvoice: jest.fn().mockResolvedValue([]),
    findPendingForInvoiceWithItem: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    saveMany: jest.fn().mockImplementation((entities) => Promise.resolve(entities)),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    countByInvoiceAndStatus: jest.fn().mockResolvedValue(0),
    deleteForInvoice: jest.fn().mockResolvedValue(undefined),
  };

  const stockItemFind = jest.fn();
  const stockItemFindOne = jest.fn();

  const mockStockItemRepo = {
    find: stockItemFind,
    findOne: stockItemFindOne,
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 100, ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 100, ...entity })),
    findForCompanySelectMatch: (companyId: number) => stockItemFind({ where: { companyId } }),
    findById: (id: number) => stockItemFindOne({ where: { id } }),
    findOneForCompany: (id: number, companyId: number) =>
      stockItemFindOne({ where: { id, companyId } }),
  };

  const mockPriceHistoryRepo = {
    create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data })),
    save: jest.fn(),
    build: jest.fn().mockImplementation((data) => ({ ...data })),
  };

  const mockDeliveryNoteRepo = {
    findAutoLinkCandidates: jest.fn().mockResolvedValue([]),
  };

  const mockCorrectionRepo = {
    findRecentForSupplier: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    createMany: jest.fn().mockResolvedValue([]),
  };

  const mockAiUsageService = {
    log: jest.fn(),
  };

  const mockAiChatService = {
    chatWithImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceExtractionService,
        { provide: SupplierInvoiceRepository, useValue: mockInvoiceRepo },
        { provide: SupplierInvoiceItemRepository, useValue: mockInvoiceItemRepo },
        { provide: InvoiceClarificationRepository, useValue: mockClarificationRepo },
        { provide: StockItemRepository, useValue: mockStockItemRepo },
        { provide: StockPriceHistoryRepository, useValue: mockPriceHistoryRepo },
        { provide: DeliveryNoteRepository, useValue: mockDeliveryNoteRepo },
        { provide: InvoiceExtractionCorrectionRepository, useValue: mockCorrectionRepo },
        { provide: AiUsageService, useValue: mockAiUsageService },
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<InvoiceExtractionService>(InvoiceExtractionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("extractFromImage", () => {
    const baseInvoice = {
      id: 1,
      companyId: 10,
      supplierName: "Test Supplier",
      extractedData: null,
      extractionStatus: InvoiceExtractionStatus.PENDING,
      deliveryNoteId: null,
      linkedDeliveryNoteIds: null,
    };

    it("extracts invoice data from AI response and updates invoice fields", async () => {
      const aiResponse = {
        invoiceNumber: "INV-001",
        supplierName: "ABC Supplies",
        invoiceDate: "2024-06-15",
        totalAmount: 15000,
        vatAmount: 2250,
        deliveryNoteNumbers: [],
        lineItems: [
          {
            lineNumber: 1,
            description: "Steel Pipe 100NB",
            sku: "SP-100",
            quantity: 5,
            unitPrice: 2500,
            unitType: "each",
            discountPercent: 0,
            isPaintPartA: false,
            isPaintPartB: false,
          },
        ],
      };

      mockInvoiceRepo.findOne.mockResolvedValue({ ...baseInvoice });
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve({ ...entity }));
      mockDeliveryNoteRepo.findAutoLinkCandidates.mockResolvedValue([]);
      mockInvoiceItemRepo.find.mockResolvedValue([]);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockClarificationRepo.countByInvoiceAndStatus.mockResolvedValue(0);

      mockAiChatService.chatWithImage.mockResolvedValue({
        content: JSON.stringify(aiResponse),
        providerUsed: "gemini",
        tokensUsed: 500,
      });

      const result = await service.extractFromImage(1, "base64data", "image/png");

      expect(result.invoiceNumber).toBe("INV-001");
      expect(result.supplierName).toBe("ABC Supplies");
      expect(result.totalAmount).toBe(15000);
      expect(result.vatAmount).toBe(2250);
      expect(result.extractionStatus).toBe(InvoiceExtractionStatus.AWAITING_APPROVAL);
      expect(mockAiUsageService.log).toHaveBeenCalled();
    });

    it("sets status to FAILED when AI returns invalid JSON", async () => {
      mockInvoiceRepo.findOne.mockResolvedValueOnce({ ...baseInvoice }).mockResolvedValueOnce({
        ...baseInvoice,
        extractionStatus: InvoiceExtractionStatus.FAILED,
      });
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve({ ...entity }));

      mockAiChatService.chatWithImage.mockResolvedValue({
        content: "This is not JSON at all",
        providerUsed: "gemini",
        tokensUsed: 100,
      });

      const result = await service.extractFromImage(1, "base64data", "image/png");
      expect(result.extractionStatus).toBe(InvoiceExtractionStatus.FAILED);
    });

    it("throws when invoice is not found", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.extractFromImage(999, "base64data", "image/png")).rejects.toThrow(
        "Invoice 999 not found",
      );
    });

    it("sets status to NEEDS_CLARIFICATION when there are pending clarifications", async () => {
      const aiResponse = {
        invoiceNumber: "INV-002",
        supplierName: "XYZ Co",
        totalAmount: 5000,
        vatAmount: 750,
        deliveryNoteNumbers: [],
        lineItems: [
          {
            lineNumber: 1,
            description: "Unknown Product ABC",
            quantity: 1,
            unitPrice: 5000,
          },
        ],
      };

      mockInvoiceRepo.findOne.mockResolvedValue({ ...baseInvoice });
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve({ ...entity }));
      mockDeliveryNoteRepo.findAutoLinkCandidates.mockResolvedValue([]);
      mockInvoiceItemRepo.find.mockResolvedValue([
        {
          id: 1,
          extractedDescription: "Unknown Product ABC",
          extractedSku: "",
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
          isPartA: false,
          isPartB: false,
          unitPrice: 5000,
        },
      ]);
      mockStockItemRepo.find.mockResolvedValue([]);
      mockClarificationRepo.countByInvoiceAndStatus.mockResolvedValue(1);

      mockAiChatService.chatWithImage.mockResolvedValue({
        content: JSON.stringify(aiResponse),
        providerUsed: "gemini",
        tokensUsed: 300,
      });

      const result = await service.extractFromImage(1, "base64data", "image/png");
      expect(result.extractionStatus).toBe(InvoiceExtractionStatus.NEEDS_CLARIFICATION);
    });
  });

  describe("extractDeliveryNoteFromImage", () => {
    it("parses delivery note JSON from AI response", async () => {
      const dnResponse = {
        deliveryNumber: "DN-100",
        supplierName: "Fast Delivery Co",
        receivedDate: "2024-07-01",
        lineItems: [{ description: "Widget A", quantity: 10, sku: "WA-01" }],
      };

      mockAiChatService.chatWithImage.mockResolvedValue({
        content: JSON.stringify(dnResponse),
        providerUsed: "gemini",
        tokensUsed: 200,
      });

      const result = await service.extractDeliveryNoteFromImage("base64data", "image/png");

      expect(result.deliveryNumber).toBe("DN-100");
      expect(result.supplierName).toBe("Fast Delivery Co");
      expect(result.lineItems).toHaveLength(1);
    });

    it("throws when AI returns no JSON", async () => {
      mockAiChatService.chatWithImage.mockResolvedValue({
        content: "no json here",
        providerUsed: "gemini",
        tokensUsed: 50,
      });

      await expect(service.extractDeliveryNoteFromImage("base64", "image/png")).rejects.toThrow(
        "AI response did not contain valid JSON",
      );
    });
  });

  describe("detectPartAB", () => {
    it("detects Part A in description", () => {
      expect(service.detectPartAB("PENGUARD EXPRESS Part A 20L")).toEqual({
        isPartA: true,
        isPartB: false,
      });
    });

    it("detects Part B in description", () => {
      expect(service.detectPartAB("PENGUARD EXPRESS Part B 5L")).toEqual({
        isPartA: false,
        isPartB: true,
      });
    });

    it("detects Hardener as Part B", () => {
      expect(service.detectPartAB("PENGUARD EXPRESS Hardener 5L")).toEqual({
        isPartA: false,
        isPartB: true,
      });
    });

    it("detects Activator as Part B", () => {
      expect(service.detectPartAB("Paint Activator 2L")).toEqual({
        isPartA: false,
        isPartB: true,
      });
    });

    it("detects Component A as Part A", () => {
      expect(service.detectPartAB("Epoxy Component A 10L")).toEqual({
        isPartA: true,
        isPartB: false,
      });
    });

    it("detects base as Part A", () => {
      expect(service.detectPartAB("Coating Base 20L")).toEqual({
        isPartA: true,
        isPartB: false,
      });
    });

    it("returns false for both when no part indicators", () => {
      expect(service.detectPartAB("Steel Pipe 100NB")).toEqual({
        isPartA: false,
        isPartB: false,
      });
    });
  });

  describe("matchItemsToStock", () => {
    it("matches invoice items to stock with high confidence by exact SKU", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({ id: 1, companyId: 10 });
      mockInvoiceItemRepo.find.mockResolvedValue([
        {
          id: 1,
          invoiceId: 1,
          extractedDescription: "Widget",
          extractedSku: "WDG-001",
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
        },
      ]);
      mockStockItemRepo.find.mockResolvedValue([
        { id: 50, name: "Widget", sku: "WDG-001", costPerUnit: 100 },
      ]);
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.matchItemsToStock(1);

      expect(mockInvoiceItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stockItemId: 50,
          matchConfidence: 100,
          matchStatus: InvoiceItemMatchStatus.MATCHED,
        }),
      );
    });

    it("sets CLARIFICATION_NEEDED for low confidence matches", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({ id: 1, companyId: 10 });
      mockInvoiceItemRepo.find.mockResolvedValue([
        {
          id: 1,
          invoiceId: 1,
          extractedDescription: "Penguard HB Primer Grey",
          extractedSku: "PEN",
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
        },
      ]);
      mockStockItemRepo.find.mockResolvedValue([
        { id: 60, name: "Penguard HB Topcoat Red Oxide", sku: "PEN-HBT", costPerUnit: 500 },
      ]);
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.matchItemsToStock(1);

      const savedItem = mockInvoiceItemRepo.save.mock.calls[0][0];
      expect(savedItem.stockItemId).toBe(60);
      expect(savedItem.matchConfidence).toBeLessThan(80);
      expect(savedItem.matchConfidence).toBeGreaterThanOrEqual(50);
      expect(savedItem.matchStatus).toBe(InvoiceItemMatchStatus.CLARIFICATION_NEEDED);
    });

    it("leaves item as UNMATCHED when no stock items match", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue({ id: 1, companyId: 10 });
      mockInvoiceItemRepo.find.mockResolvedValue([
        {
          id: 1,
          invoiceId: 1,
          extractedDescription: "Completely Unknown Item XYZ",
          extractedSku: "NONE",
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
        },
      ]);
      mockStockItemRepo.find.mockResolvedValue([
        { id: 70, name: "Steel Pipe 200NB", sku: "SP-200", costPerUnit: 800 },
      ]);
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.matchItemsToStock(1);

      expect(mockInvoiceItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
        }),
      );
    });

    it("does nothing when invoice not found", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await service.matchItemsToStock(999);

      expect(mockInvoiceItemRepo.find).not.toHaveBeenCalled();
    });
  });

  describe("linkPartABItems", () => {
    it("links matching Part A and Part B items", async () => {
      const partA = {
        id: 1,
        invoiceId: 1,
        isPartA: true,
        isPartB: false,
        extractedDescription: "PENGUARD EXPRESS Part A 20L",
      };
      const partB = {
        id: 2,
        invoiceId: 1,
        isPartA: false,
        isPartB: true,
        extractedDescription: "PENGUARD EXPRESS Part B 5L",
        linkedItemId: null,
      };

      mockInvoiceItemRepo.find.mockResolvedValue([partA, partB]);
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.linkPartABItems(1);

      expect(mockInvoiceItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, linkedItemId: 1 }),
      );
    });

    it("does not link unrelated Part A and Part B items", async () => {
      const partA = {
        id: 1,
        invoiceId: 1,
        isPartA: true,
        isPartB: false,
        extractedDescription: "PENGUARD EXPRESS Part A 20L",
      };
      const partB = {
        id: 2,
        invoiceId: 1,
        isPartA: false,
        isPartB: true,
        extractedDescription: "HARDTOP XP Hardener 5L",
        linkedItemId: null,
      };

      mockInvoiceItemRepo.find.mockResolvedValue([partA, partB]);

      await service.linkPartABItems(1);

      expect(mockInvoiceItemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("autoLinkAllUnlinked", () => {
    it("returns zero linked when no unlinked invoices exist", async () => {
      mockInvoiceRepo.find.mockResolvedValue([]);

      const result = await service.autoLinkAllUnlinked(10);

      expect(result).toEqual({ linked: 0, details: [] });
    });

    it("links invoices to delivery notes by extracted DN number", async () => {
      mockInvoiceRepo.find.mockResolvedValue([
        {
          id: 1,
          companyId: 10,
          supplierName: "Supplier A",
          invoiceNumber: "INV-01",
          extractedData: { deliveryNoteNumbers: ["DN-500"] },
          deliveryNoteId: null,
          linkedDeliveryNoteIds: null,
        },
      ]);
      mockDeliveryNoteRepo.findAutoLinkCandidates.mockResolvedValue([
        { id: 50, companyId: 10, deliveryNumber: "DN-500", supplierName: "Supplier A" },
      ]);
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.autoLinkAllUnlinked(10);

      expect(result.linked).toBe(1);
      expect(result.details).toHaveLength(1);
    });
  });

  describe("processClarificationResponse", () => {
    it("assigns selected stock item to invoice item", async () => {
      const clarification = {
        id: 1,
        invoiceId: 1,
        invoiceItemId: 10,
        companyId: 10,
        status: ClarificationStatus.PENDING,
        invoiceItem: {
          id: 10,
          stockItemId: null,
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
          previousPrice: null,
        },
        invoice: { id: 1 },
      };

      mockClarificationRepo.findOneByIdWithRelations.mockResolvedValue(clarification);
      mockStockItemRepo.findOne.mockResolvedValue({ id: 200, costPerUnit: 150 });
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.countByInvoiceAndStatus.mockResolvedValue(0);
      mockInvoiceRepo.findOne.mockResolvedValue({ id: 1 });
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.processClarificationResponse(
        1,
        { selectedStockItemId: 200 },
        42,
      );

      expect(result.status).toBe(ClarificationStatus.ANSWERED);
      expect(result.selectedStockItemId).toBe(200);
    });

    it("creates new stock item when requested", async () => {
      const clarification = {
        id: 2,
        invoiceId: 1,
        invoiceItemId: 11,
        companyId: 10,
        status: ClarificationStatus.PENDING,
        invoiceItem: {
          id: 11,
          stockItemId: null,
          matchStatus: InvoiceItemMatchStatus.UNMATCHED,
          unitPrice: 300,
        },
        invoice: { id: 1 },
      };

      mockClarificationRepo.findOneByIdWithRelations.mockResolvedValue(clarification);
      mockStockItemRepo.save.mockResolvedValue({ id: 100, sku: "NEW-01", name: "New Item" });
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.countByInvoiceAndStatus.mockResolvedValue(0);
      mockInvoiceRepo.findOne.mockResolvedValue({ id: 1 });
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.processClarificationResponse(
        2,
        { createNewItem: { sku: "NEW-01", name: "New Item" } },
        42,
      );

      expect(result.status).toBe(ClarificationStatus.ANSWERED);
      expect(mockStockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sku: "NEW-01", name: "New Item", companyId: 10 }),
      );
    });

    it("skips price update when requested", async () => {
      const clarification = {
        id: 3,
        invoiceId: 1,
        invoiceItemId: 12,
        companyId: 10,
        status: ClarificationStatus.PENDING,
        clarificationType: ClarificationType.PRICE_CONFIRMATION,
        invoiceItem: null,
        invoice: { id: 1 },
      };

      mockClarificationRepo.findOneByIdWithRelations.mockResolvedValue(clarification);
      mockClarificationRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.countByInvoiceAndStatus.mockResolvedValue(0);
      mockInvoiceRepo.findOne.mockResolvedValue({ id: 1 });
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.processClarificationResponse(3, { skipPriceUpdate: true }, 42);

      expect(result.status).toBe(ClarificationStatus.SKIPPED);
    });

    it("throws when clarification not found", async () => {
      mockClarificationRepo.findOneByIdWithRelations.mockResolvedValue(null);

      await expect(
        service.processClarificationResponse(999, { confirmed: true }, 42),
      ).rejects.toThrow("Clarification 999 not found");
    });
  });

  describe("applyPriceUpdates", () => {
    it("updates stock prices and creates price history records", async () => {
      const stockItem = { id: 50, costPerUnit: 100, name: "Widget" };
      const invoice = {
        id: 1,
        companyId: 10,
        supplierName: "Supplier A",
        items: [
          {
            id: 10,
            stockItemId: 50,
            unitPrice: 120,
            quantity: 5,
            priceUpdated: false,
            stockItem,
          },
        ],
      };

      mockInvoiceRepo.findOne.mockResolvedValue(invoice);
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockStockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockPriceHistoryRepo.save.mockResolvedValue({});
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.findSkippedPriceForInvoice.mockResolvedValue([]);

      const result = await service.applyPriceUpdates(1, 42);

      expect(mockPriceHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ oldPrice: 100, newPrice: 120 }),
      );
      expect(result.extractionStatus).toBe(InvoiceExtractionStatus.COMPLETED);
    });

    it("skips items flagged as skipped price clarifications", async () => {
      const stockItem = { id: 50, costPerUnit: 100, name: "Widget" };
      const invoice = {
        id: 1,
        companyId: 10,
        supplierName: "Supplier A",
        items: [
          {
            id: 10,
            stockItemId: 50,
            unitPrice: 500,
            quantity: 1,
            priceUpdated: false,
            stockItem,
          },
        ],
      };

      mockInvoiceRepo.findOne.mockResolvedValue(invoice);
      mockClarificationRepo.findSkippedPriceForInvoice.mockResolvedValue([
        {
          invoiceItemId: 10,
          clarificationType: ClarificationType.PRICE_CONFIRMATION,
          status: ClarificationStatus.SKIPPED,
        },
      ]);
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.applyPriceUpdates(1, 42);

      expect(mockPriceHistoryRepo.create).not.toHaveBeenCalled();
    });

    it("loads invoice items separately when approval relations are not populated", async () => {
      const stockItem = { id: 50, costPerUnit: 100, name: "Widget" };
      const invoice = {
        id: 1,
        companyId: 10,
        supplierName: "Supplier A",
      };
      const item = {
        id: 10,
        stockItemId: 50,
        unitPrice: 120,
        quantity: 5,
        priceUpdated: false,
        stockItem,
      };

      mockInvoiceRepo.findOne.mockResolvedValue(invoice);
      invoiceItemFind.mockResolvedValue([item]);
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.findSkippedPriceForInvoice.mockResolvedValue([]);

      await service.applyPriceUpdates(1, 42);

      expect(mockPriceHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ oldPrice: 100, newPrice: 120 }),
      );
      expect(item.priceUpdated).toBe(true);
    });

    it("normalizes string stock item ids before looking up stock records", async () => {
      const stockItem = { id: 50, costPerUnit: 100, name: "Widget" };
      const invoice = {
        id: 1,
        companyId: 10,
        supplierName: "Supplier A",
        items: [
          {
            id: 10,
            stockItemId: "50",
            unitPrice: 120,
            quantity: 5,
            priceUpdated: false,
          },
        ],
      };

      mockInvoiceRepo.findOne.mockResolvedValue(invoice);
      mockStockItemRepo.findOne.mockResolvedValue(stockItem);
      mockInvoiceRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockInvoiceItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));
      mockClarificationRepo.findSkippedPriceForInvoice.mockResolvedValue([]);

      await service.applyPriceUpdates(1, 42);

      expect(mockStockItemRepo.findOne).toHaveBeenCalledWith({ where: { id: 50 } });
      expect(mockPriceHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ oldPrice: 100, newPrice: 120 }),
      );
    });

    it("throws when invoice not found", async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);

      await expect(service.applyPriceUpdates(999, 42)).rejects.toThrow("Invoice 999 not found");
    });
  });
});
