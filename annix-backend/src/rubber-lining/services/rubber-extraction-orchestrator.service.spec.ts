import { Test, TestingModule } from "@nestjs/testing";
import { DeliveryNoteType } from "../entities/rubber-delivery-note.entity";
import { SupplierCocType } from "../entities/rubber-supplier-coc.entity";
import { RubberAuCocReadinessService } from "../rubber-au-coc-readiness.service";
import { RubberCocService } from "../rubber-coc.service";
import { RubberCocExtractionService } from "../rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "../rubber-delivery-note.service";
import { RubberTaxInvoiceService } from "../rubber-tax-invoice.service";
import { RubberExtractionOrchestratorService } from "./rubber-extraction-orchestrator.service";

jest.mock("../../lib/document-extraction", () => ({
  extractTextFromPdf: jest
    .fn()
    .mockResolvedValue("sample pdf text with enough characters for extraction threshold"),
  extractTextFromWord: jest.fn().mockResolvedValue("sample word document text content"),
}));

describe("RubberExtractionOrchestratorService", () => {
  let service: RubberExtractionOrchestratorService;

  const cocServiceMock = {
    correctionHintsForCoc: jest.fn().mockResolvedValue(null),
    setExtractedData: jest.fn().mockResolvedValue(undefined),
  };

  const cocExtractionMock = {
    extractByType: jest
      .fn()
      .mockResolvedValue({ data: { batchNumber: "B100" }, processingTimeMs: 150 }),
    extractTaxInvoice: jest
      .fn()
      .mockResolvedValue({ data: { invoiceNumber: "INV-1" }, processingTimeMs: 200 }),
    extractTaxInvoiceFromImages: jest.fn().mockResolvedValue({
      data: { invoiceNumber: "INV-OCR" },
      invoices: [{ invoiceNumber: "INV-OCR" }],
      processingTimeMs: 300,
    }),
    extractDeliveryNote: jest
      .fn()
      .mockResolvedValue({ data: { rolls: [] }, processingTimeMs: 100 }),
    extractDeliveryNoteFromImages: jest
      .fn()
      .mockResolvedValue({ data: { rolls: [] }, processingTimeMs: 100 }),
    extractCustomerDeliveryNoteFromImages: jest.fn().mockResolvedValue({
      deliveryNotes: [{ deliveryNoteNumber: "DN-1", lineItems: [], supplierName: "Test Supplier" }],
      podPages: [],
    }),
  };

  const taxInvoiceMock = {
    correctionHintsForSupplier: jest.fn().mockResolvedValue(null),
    setExtractedData: jest.fn().mockResolvedValue(undefined),
    splitTaxInvoiceExtraction: jest.fn().mockResolvedValue({ taxInvoiceIds: [10] }),
    taxInvoiceById: jest.fn().mockResolvedValue({ invoiceType: "SUPPLIER" }),
  };

  const deliveryNoteMock = {
    setExtractedData: jest.fn().mockResolvedValue(undefined),
    setPodPageNumbers: jest.fn().mockResolvedValue(undefined),
    acceptExtractAndSplit: jest.fn().mockResolvedValue({ deliveryNoteIds: [1] }),
  };

  const readinessMock = {
    checkAndAutoGenerateForCoc: jest.fn().mockResolvedValue(undefined),
    checkAndAutoGenerateForDeliveryNote: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberExtractionOrchestratorService,
        { provide: RubberCocService, useValue: cocServiceMock },
        { provide: RubberCocExtractionService, useValue: cocExtractionMock },
        { provide: RubberTaxInvoiceService, useValue: taxInvoiceMock },
        { provide: RubberDeliveryNoteService, useValue: deliveryNoteMock },
        { provide: RubberAuCocReadinessService, useValue: readinessMock },
      ],
    }).compile();

    service = module.get<RubberExtractionOrchestratorService>(RubberExtractionOrchestratorService);
    jest.clearAllMocks();

    // Re-apply document extraction mocks after clearAllMocks resets them
    const docExtraction = require("../../lib/document-extraction");
    (docExtraction.extractTextFromPdf as jest.Mock).mockResolvedValue(
      "sample pdf text with enough characters for extraction threshold",
    );
    (docExtraction.extractTextFromWord as jest.Mock).mockResolvedValue(
      "sample word document text content",
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("triggerCocExtraction", () => {
    it("calls correctionHintsForCoc then extractByType then setExtractedData", async () => {
      service.triggerCocExtraction(42, SupplierCocType.COMPOUNDER, "sample pdf text");

      await new Promise((r) => setTimeout(r, 50));

      expect(cocServiceMock.correctionHintsForCoc).toHaveBeenCalledWith(42);
      expect(cocExtractionMock.extractByType).toHaveBeenCalledWith(
        SupplierCocType.COMPOUNDER,
        "sample pdf text",
        null,
        undefined,
      );
      expect(cocServiceMock.setExtractedData).toHaveBeenCalledWith(42, { batchNumber: "B100" });
    });

    it("does not throw when extraction returns null data", async () => {
      cocExtractionMock.extractByType.mockResolvedValueOnce({ data: null, processingTimeMs: 50 });

      service.triggerCocExtraction(42, SupplierCocType.CALENDARER, "text");

      await new Promise((r) => setTimeout(r, 50));

      expect(cocServiceMock.setExtractedData).not.toHaveBeenCalled();
    });
  });

  describe("triggerTaxInvoiceExtraction", () => {
    it("extracts text from PDF and calls extractTaxInvoice for text-rich PDFs", async () => {
      service.triggerTaxInvoiceExtraction(
        10,
        Buffer.from("pdf content"),
        "invoice.pdf",
        "Supplier Co",
      );

      await new Promise((r) => setTimeout(r, 200));

      expect(taxInvoiceMock.correctionHintsForSupplier).toHaveBeenCalledWith("Supplier Co");
      expect(cocExtractionMock.extractTaxInvoiceFromImages).toHaveBeenCalled();
      expect(taxInvoiceMock.setExtractedData).toHaveBeenCalledWith(10, {
        invoiceNumber: "INV-OCR",
      });
    });

    it("skips correction hints when companyName is null", async () => {
      service.triggerTaxInvoiceExtraction(10, Buffer.from("pdf"), "invoice.pdf", null);

      await new Promise((r) => setTimeout(r, 50));

      expect(taxInvoiceMock.correctionHintsForSupplier).not.toHaveBeenCalled();
    });

    it("uses extractTextFromWord for non-PDF files", async () => {
      const { extractTextFromWord } = require("../../lib/document-extraction");
      (extractTextFromWord as jest.Mock).mockResolvedValueOnce("word doc content with enough text");

      service.triggerTaxInvoiceExtraction(10, Buffer.from("doc"), "invoice.docx", null);

      await new Promise((r) => setTimeout(r, 50));

      expect(extractTextFromWord).toHaveBeenCalled();
    });
  });

  describe("triggerDeliveryNoteExtraction", () => {
    it("extracts compound delivery note and calls acceptExtractAndSplit", async () => {
      service.triggerDeliveryNoteExtraction(20, Buffer.from("pdf"), DeliveryNoteType.COMPOUND);

      await new Promise((r) => setTimeout(r, 50));

      expect(cocExtractionMock.extractDeliveryNote).toHaveBeenCalled();
      expect(deliveryNoteMock.setExtractedData).toHaveBeenCalledWith(20, { rolls: [] });
      expect(deliveryNoteMock.acceptExtractAndSplit).toHaveBeenCalledWith(20);
    });

    it("uses image extraction for roll delivery notes", async () => {
      service.triggerDeliveryNoteExtraction(20, Buffer.from("pdf"), DeliveryNoteType.ROLL);

      await new Promise((r) => setTimeout(r, 50));

      expect(cocExtractionMock.extractCustomerDeliveryNoteFromImages).toHaveBeenCalled();
      expect(deliveryNoteMock.setExtractedData).toHaveBeenCalled();
    });
  });

  describe("triggerReadinessCheckForCoc", () => {
    it("delegates to auCocReadinessService", () => {
      service.triggerReadinessCheckForCoc(5);

      expect(readinessMock.checkAndAutoGenerateForCoc).toHaveBeenCalledWith(5);
    });
  });

  describe("triggerReadinessCheckForDeliveryNote", () => {
    it("delegates to auCocReadinessService", () => {
      service.triggerReadinessCheckForDeliveryNote(7);

      expect(readinessMock.checkAndAutoGenerateForDeliveryNote).toHaveBeenCalledWith(7);
    });
  });
});
