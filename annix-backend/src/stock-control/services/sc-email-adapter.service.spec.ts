import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { CertificateService } from "./certificate.service";
import { DeliveryService } from "./delivery.service";
import { InvoiceService } from "./invoice.service";
import { InvoiceExtractionService } from "./invoice-extraction.service";
import { ScDocumentType, ScEmailAdapterService } from "./sc-email-adapter.service";
import { WorkflowNotificationService } from "./workflow-notification.service";

describe("ScEmailAdapterService (classification)", () => {
  let service: ScEmailAdapterService;

  const mockAiChatService = {
    chat: jest.fn(),
    chatWithImage: jest.fn(),
    isAvailable: jest.fn(),
  };

  const noopRegistry = { registerAdapter: jest.fn() };
  const noopInvoiceService = {};
  const noopDeliveryService = {};
  const noopExtractionService = {};
  const noopNotificationService = {};
  const noopCertificateService = {};
  const noopSupplierRepo = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScEmailAdapterService,
        { provide: InboundEmailRegistry, useValue: noopRegistry },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: InvoiceService, useValue: noopInvoiceService },
        { provide: DeliveryService, useValue: noopDeliveryService },
        { provide: InvoiceExtractionService, useValue: noopExtractionService },
        { provide: WorkflowNotificationService, useValue: noopNotificationService },
        { provide: CertificateService, useValue: noopCertificateService },
        { provide: getRepositoryToken(StockControlSupplier), useValue: noopSupplierRepo },
      ],
    }).compile();

    service = module.get<ScEmailAdapterService>(ScEmailAdapterService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("exposes correct appName", () => {
    expect(service.appName()).toBe("stock-control");
  });

  describe("classifyFromSubject", () => {
    it("classifies invoice from subject keywords", () => {
      const result = service.classifyFromSubject("Your tax invoice attached", "INV-001.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.SUPPLIER_INVOICE);
      expect(result!.confidence).toBe(0.7);
      expect(result!.source).toBe("subject");
    });

    it("classifies delivery note from subject", () => {
      const result = service.classifyFromSubject("Delivery confirmation", "DN-500.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.DELIVERY_NOTE);
    });

    it("classifies purchase order from subject", () => {
      const result = service.classifyFromSubject("Purchase order PO-123", "order.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.PURCHASE_ORDER);
    });

    it("classifies certificate from filename", () => {
      const result = service.classifyFromSubject("Documents attached", "COC-batch-42.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.SUPPLIER_CERTIFICATE);
    });

    it("classifies drawing from filename", () => {
      const result = service.classifyFromSubject("See attached", "drawing-GPW-017.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.JOB_CARD_DRAWING);
    });

    it("classifies amendment as supporting document", () => {
      const result = service.classifyFromSubject("Amendment to order", "amendment.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.SUPPORTING_DOCUMENT);
    });

    it("returns null when no keywords match", () => {
      const result = service.classifyFromSubject("Hello there", "document.pdf");
      expect(result).toBeNull();
    });

    it("matches case-insensitively", () => {
      const result = service.classifyFromSubject("TAX INVOICE ATTACHED", "file.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.SUPPLIER_INVOICE);
    });

    it("classifies despatch as delivery note", () => {
      const result = service.classifyFromSubject("Despatch note", "despatch.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.DELIVERY_NOTE);
    });

    it("classifies DN abbreviation as delivery note", () => {
      const result = service.classifyFromSubject("DN attached", "file.pdf");
      expect(result).not.toBeNull();
      expect(result!.documentType).toBe(ScDocumentType.DELIVERY_NOTE);
    });
  });

  describe("classifyFromContent - text content", () => {
    it("classifies text content using AI", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({
          documentType: "supplier_invoice",
          supplierName: "ABC Supplies",
          confidence: 0.95,
        }),
      });

      const result = await service.classifyFromContent(
        "Invoice #12345\nTotal: R15,000\nVAT: R2,250",
        "text/plain",
        "invoice.txt",
        "accounts@example.com",
        "Invoice attached",
      );

      expect(result.documentType).toBe(ScDocumentType.SUPPLIER_INVOICE);
      expect(result.confidence).toBe(0.95);
      expect(result.supplierName).toBe("ABC Supplies");
      expect(result.source).toBe("content_ai");
    });

    it("returns UNKNOWN when AI service is not available", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(false);

      const result = await service.classifyFromContent(
        "some content",
        "text/plain",
        "file.txt",
        "test@example.com",
        "Subject",
      );

      expect(result.documentType).toBe(ScDocumentType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it("returns UNKNOWN when AI returns invalid document type", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({ documentType: "invalid_type", confidence: 0.5 }),
      });

      const result = await service.classifyFromContent(
        "content",
        "text/plain",
        "file.txt",
        "test@example.com",
        "Subject",
      );

      expect(result.documentType).toBe(ScDocumentType.UNKNOWN);
    });

    it("returns UNKNOWN when AI returns no JSON", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockResolvedValue({ content: "I cannot classify this document" });

      const result = await service.classifyFromContent(
        "content",
        "text/plain",
        "file.txt",
        "test@example.com",
        "Subject",
      );

      expect(result.documentType).toBe(ScDocumentType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it("handles AI service errors gracefully", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockRejectedValue(new Error("AI timeout"));

      const result = await service.classifyFromContent(
        "content",
        "text/plain",
        "file.txt",
        "test@example.com",
        "Subject",
      );

      expect(result.documentType).toBe(ScDocumentType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it("truncates long content to 5000 characters", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({ documentType: "delivery_note", confidence: 0.8 }),
      });

      const longContent = "A".repeat(10000);

      await service.classifyFromContent(
        longContent,
        "text/plain",
        "file.txt",
        "test@example.com",
        "Subject",
      );

      const chatCall = mockAiChatService.chat.mock.calls[0];
      const userMessage = chatCall[0][0].content;
      expect(userMessage.length).toBeLessThan(10000);
    });

    it("defaults confidence to 0.8 when AI omits it", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({ documentType: "purchase_order" }),
      });

      const result = await service.classifyFromContent(
        "PO content",
        "text/plain",
        "po.txt",
        "test@example.com",
        "PO",
      );

      expect(result.documentType).toBe(ScDocumentType.PURCHASE_ORDER);
      expect(result.confidence).toBe(0.8);
    });
  });

  describe("classifyFromContent - image content", () => {
    it("uses chatWithImage for image mime types", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chatWithImage.mockResolvedValue({
        content: JSON.stringify({
          documentType: "supplier_invoice",
          supplierName: "XYZ Corp",
          confidence: 0.9,
        }),
      });

      const imageBuffer = Buffer.from("fake-image-data");

      const result = await service.classifyFromContent(
        imageBuffer,
        "image/jpeg",
        "invoice-scan.jpg",
        "scan@example.com",
        "Scanned invoice",
      );

      expect(result.documentType).toBe(ScDocumentType.SUPPLIER_INVOICE);
      expect(result.supplierName).toBe("XYZ Corp");
      expect(mockAiChatService.chatWithImage).toHaveBeenCalledWith(
        imageBuffer.toString("base64"),
        "image/jpeg",
        expect.stringContaining("invoice-scan.jpg"),
        expect.any(String),
      );
    });

    it("handles PNG images", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chatWithImage.mockResolvedValue({
        content: JSON.stringify({ documentType: "delivery_note", confidence: 0.85 }),
      });

      const result = await service.classifyFromContent(
        Buffer.from("png-data"),
        "image/png",
        "dn.png",
        "test@example.com",
        "Subject",
      );

      expect(result.documentType).toBe(ScDocumentType.DELIVERY_NOTE);
    });

    it("handles WebP images", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chatWithImage.mockResolvedValue({
        content: JSON.stringify({ documentType: "supplier_certificate", confidence: 0.75 }),
      });

      const result = await service.classifyFromContent(
        Buffer.from("webp-data"),
        "image/webp",
        "cert.webp",
        "test@example.com",
        "Subject",
      );

      expect(result.documentType).toBe(ScDocumentType.SUPPLIER_CERTIFICATE);
    });

    it("treats non-image buffers as text", async () => {
      mockAiChatService.isAvailable.mockResolvedValue(true);
      mockAiChatService.chat.mockResolvedValue({
        content: JSON.stringify({ documentType: "purchase_order", confidence: 0.8 }),
      });

      const result = await service.classifyFromContent(
        Buffer.from("PO-12345 Widget order"),
        "application/pdf",
        "po.pdf",
        "test@example.com",
        "PO attached",
      );

      expect(result.documentType).toBe(ScDocumentType.PURCHASE_ORDER);
      expect(mockAiChatService.chat).toHaveBeenCalled();
      expect(mockAiChatService.chatWithImage).not.toHaveBeenCalled();
    });
  });

  describe("classifyFromContent - all document types", () => {
    const docTypes = [
      ScDocumentType.SUPPLIER_INVOICE,
      ScDocumentType.DELIVERY_NOTE,
      ScDocumentType.PURCHASE_ORDER,
      ScDocumentType.SUPPLIER_CERTIFICATE,
      ScDocumentType.JOB_CARD_DRAWING,
      ScDocumentType.SUPPORTING_DOCUMENT,
    ];

    docTypes.forEach((docType) => {
      it(`accepts valid document type: ${docType}`, async () => {
        mockAiChatService.isAvailable.mockResolvedValue(true);
        mockAiChatService.chat.mockResolvedValue({
          content: JSON.stringify({ documentType: docType, confidence: 0.9 }),
        });

        const result = await service.classifyFromContent(
          "content",
          "text/plain",
          "file.txt",
          "test@example.com",
          "Subject",
        );

        expect(result.documentType).toBe(docType);
      });
    });
  });
});
