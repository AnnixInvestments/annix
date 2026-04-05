import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { InboundEmailAttachment } from "../../inbound-email/entities/inbound-email-attachment.entity";
import { InboundEmailRegistry } from "../../inbound-email/inbound-email-registry.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { RubberCompany } from "../entities/rubber-company.entity";
import { RubberDeliveryNote } from "../entities/rubber-delivery-note.entity";
import { RubberTaxInvoice } from "../entities/rubber-tax-invoice.entity";
import { ArDocumentType, ArEmailAdapterService } from "./ar-email-adapter.service";

describe("ArEmailAdapterService", () => {
  let service: ArEmailAdapterService;

  const aiChatMock = {
    isAvailable: jest.fn(),
    chat: jest.fn(),
    chatWithImage: jest.fn(),
  };

  const deliveryNoteRepo = {
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: 101 })),
  };

  const taxInvoiceRepo = {
    save: jest.fn((entity) => Promise.resolve({ ...entity, id: 202 })),
  };

  const companyRepo = {
    find: jest.fn(),
  };

  const registry = { registerAdapter: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArEmailAdapterService,
        { provide: InboundEmailRegistry, useValue: registry },
        { provide: AiChatService, useValue: aiChatMock },
        { provide: getRepositoryToken(RubberDeliveryNote), useValue: deliveryNoteRepo },
        { provide: getRepositoryToken(RubberTaxInvoice), useValue: taxInvoiceRepo },
        { provide: getRepositoryToken(RubberCompany), useValue: companyRepo },
      ],
    }).compile();

    service = module.get<ArEmailAdapterService>(ArEmailAdapterService);
    jest.clearAllMocks();
  });

  it("exposes correct appName", () => {
    expect(service.appName()).toBe("au-rubber");
  });

  it("registers adapter on module init", () => {
    service.onModuleInit();
    expect(registry.registerAdapter).toHaveBeenCalledWith(service);
  });

  describe("classifyFromSubject", () => {
    it("classifies tax invoice from subject", () => {
      const result = service.classifyFromSubject("Tax Invoice 12345", "inv.pdf");
      expect(result?.documentType).toBe(ArDocumentType.TAX_INVOICE);
      expect(result?.confidence).toBe(0.7);
      expect(result?.source).toBe("subject");
    });

    it("classifies credit note from subject", () => {
      const result = service.classifyFromSubject("Credit Note CN-001", "cn.pdf");
      expect(result?.documentType).toBe(ArDocumentType.CREDIT_NOTE);
    });

    it("classifies delivery note from subject", () => {
      const result = service.classifyFromSubject("Delivery Note DN-500", "dn.pdf");
      expect(result?.documentType).toBe(ArDocumentType.DELIVERY_NOTE);
    });

    it("classifies order from subject", () => {
      const result = service.classifyFromSubject("Purchase Order PO-77", "po.pdf");
      expect(result?.documentType).toBe(ArDocumentType.ORDER);
    });

    it("classifies CoC from certificate keyword", () => {
      const result = service.classifyFromSubject("Certificate of Conformance", "coc.pdf");
      expect(result?.documentType).toBe(ArDocumentType.COC);
    });

    it("defaults unknown subjects to CoC with 0.5 confidence", () => {
      const result = service.classifyFromSubject("Random subject", "file.pdf");
      expect(result?.documentType).toBe(ArDocumentType.COC);
      expect(result?.confidence).toBe(0.5);
    });

    it("returns null for proforma subjects", () => {
      expect(service.classifyFromSubject("Proforma Invoice", "proforma.pdf")).toBeNull();
    });

    it("returns null when filename contains proforma even with matching keyword", () => {
      expect(service.classifyFromSubject("Tax Invoice", "proforma-advance.pdf")).toBeNull();
    });
  });

  describe("classifyFromContent - content refinement (no AI)", () => {
    it("CREDIT NOTE in body → credit_note, no AI call", async () => {
      aiChatMock.isAvailable.mockClear();
      const result = await service.classifyFromContent(
        "This document is a CREDIT NOTE for returned goods",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "Documents attached",
      );
      expect(result.documentType).toBe(ArDocumentType.CREDIT_NOTE);
      expect(result.confidence).toBe(0.85);
      expect(aiChatMock.isAvailable).not.toHaveBeenCalled();
    });

    it("TAX INVOICE in body → tax_invoice, no AI call", async () => {
      aiChatMock.isAvailable.mockClear();
      const result = await service.classifyFromContent(
        "TAX INVOICE 12345 R15,000",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "subject",
      );
      expect(result.documentType).toBe(ArDocumentType.TAX_INVOICE);
      expect(aiChatMock.isAvailable).not.toHaveBeenCalled();
    });

    it("DELIVERY NOTE marker → delivery_note", async () => {
      const result = await service.classifyFromContent(
        "DELIVERY NOTE ref 456",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "subject",
      );
      expect(result.documentType).toBe(ArDocumentType.DELIVERY_NOTE);
    });
  });

  describe("classifyFromContent - AI fallback", () => {
    it("falls back to CoC when AI unavailable", async () => {
      aiChatMock.isAvailable.mockResolvedValue(false);
      const result = await service.classifyFromContent(
        "Some unclassifiable content",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "subject",
      );
      expect(result.documentType).toBe(ArDocumentType.COC);
      expect(result.confidence).toBe(0.3);
    });

    it("uses AI chat for text content", async () => {
      aiChatMock.isAvailable.mockResolvedValue(true);
      aiChatMock.chat.mockResolvedValue({
        content: JSON.stringify({
          documentType: "tax_invoice",
          supplierName: "ACME",
          confidence: 0.92,
        }),
      });

      const result = await service.classifyFromContent(
        "Some content requiring AI",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "subject",
      );

      expect(result.documentType).toBe(ArDocumentType.TAX_INVOICE);
      expect(result.confidence).toBe(0.92);
      expect(result.supplierName).toBe("ACME");
    });

    it("uses chatWithImage for image buffers", async () => {
      aiChatMock.isAvailable.mockResolvedValue(true);
      aiChatMock.chatWithImage.mockResolvedValue({
        content: JSON.stringify({ documentType: "coc", confidence: 0.88 }),
      });

      const result = await service.classifyFromContent(
        Buffer.from("fake-image"),
        "image/jpeg",
        "scan.jpg",
        "supplier@example.com",
        "subject",
      );

      expect(result.documentType).toBe(ArDocumentType.COC);
      expect(aiChatMock.chatWithImage).toHaveBeenCalled();
      expect(aiChatMock.chat).not.toHaveBeenCalled();
    });

    it("falls back to CoC on AI errors", async () => {
      aiChatMock.isAvailable.mockResolvedValue(true);
      aiChatMock.chat.mockRejectedValue(new Error("AI timeout"));

      const result = await service.classifyFromContent(
        "Content",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "subject",
      );

      expect(result.documentType).toBe(ArDocumentType.COC);
      expect(result.confidence).toBe(0.3);
    });

    it("returns UNKNOWN when AI responds with invalid JSON", async () => {
      aiChatMock.isAvailable.mockResolvedValue(true);
      aiChatMock.chat.mockResolvedValue({ content: "cannot classify" });

      const result = await service.classifyFromContent(
        "Content",
        "text/plain",
        "file.txt",
        "supplier@example.com",
        "subject",
      );

      expect(result.documentType).toBe(ArDocumentType.UNKNOWN);
    });
  });

  describe("route - tax invoice", () => {
    it("creates RubberTaxInvoice and returns linked entity", async () => {
      companyRepo.find.mockResolvedValue([
        { id: 10, emailConfig: { primary: "supplier@example.com" } } as unknown as RubberCompany,
      ]);

      const attachment = {
        documentType: ArDocumentType.TAX_INVOICE,
        s3Path: "au-rubber/inbound/10/inv.pdf",
      } as InboundEmailAttachment;

      const result = await service.route(
        attachment,
        Buffer.from(""),
        null,
        "supplier@example.com",
        "Tax Invoice INV-123",
      );

      expect(result.linkedEntityType).toBe("RubberTaxInvoice");
      expect(result.linkedEntityId).toBe(202);
      expect(taxInvoiceRepo.save).toHaveBeenCalled();
      const savedInvoice = taxInvoiceRepo.save.mock.calls[0][0];
      expect(savedInvoice.companyId).toBe(10);
      expect(savedInvoice.documentPath).toBe("au-rubber/inbound/10/inv.pdf");
    });

    it("extracts invoice number from subject", async () => {
      companyRepo.find.mockResolvedValue([]);

      const attachment = {
        documentType: ArDocumentType.TAX_INVOICE,
        s3Path: "path",
      } as InboundEmailAttachment;

      await service.route(
        attachment,
        Buffer.from(""),
        null,
        "unknown@example.com",
        "Invoice INV-789",
      );

      const savedInvoice = taxInvoiceRepo.save.mock.calls[0][0];
      expect(savedInvoice.invoiceNumber).toBe("INV-789");
    });
  });

  describe("route - delivery note", () => {
    it("creates RubberDeliveryNote", async () => {
      companyRepo.find.mockResolvedValue([]);

      const attachment = {
        documentType: ArDocumentType.DELIVERY_NOTE,
        s3Path: "au-rubber/inbound/dn.pdf",
      } as InboundEmailAttachment;

      const result = await service.route(
        attachment,
        Buffer.from(""),
        null,
        "supplier@example.com",
        "DN attached",
      );

      expect(result.linkedEntityType).toBe("RubberDeliveryNote");
      expect(result.linkedEntityId).toBe(101);
      expect(deliveryNoteRepo.save).toHaveBeenCalled();
    });
  });

  describe("route - CoC and unroutable", () => {
    it("CoC returns no linked entity (manual upload required)", async () => {
      const attachment = {
        documentType: ArDocumentType.COC,
        s3Path: "path",
      } as InboundEmailAttachment;

      const result = await service.route(
        attachment,
        Buffer.from(""),
        null,
        "supplier@example.com",
        "CoC",
      );

      expect(result.linkedEntityType).toBeNull();
      expect(result.linkedEntityId).toBeNull();
      expect(result.extractionTriggered).toBe(false);
    });

    it("unknown document type returns no linked entity", async () => {
      const attachment = {
        documentType: ArDocumentType.UNKNOWN,
        s3Path: "path",
      } as InboundEmailAttachment;

      const result = await service.route(
        attachment,
        Buffer.from(""),
        null,
        "supplier@example.com",
        "Unknown",
      );

      expect(result.linkedEntityType).toBeNull();
    });
  });

  describe("supplier resolution via emailConfig", () => {
    it("finds supplier by email domain in emailConfig values", async () => {
      companyRepo.find.mockResolvedValue([
        { id: 1, isCompoundOwner: false, emailConfig: { po: "other@different.com" } },
        { id: 2, isCompoundOwner: false, emailConfig: { notify: "ap@example.com" } },
      ] as unknown as RubberCompany[]);

      const attachment = {
        documentType: ArDocumentType.TAX_INVOICE,
        s3Path: "path",
      } as InboundEmailAttachment;

      await service.route(attachment, Buffer.from(""), null, "accounts@example.com", "Invoice");

      const savedInvoice = taxInvoiceRepo.save.mock.calls[0][0];
      expect(savedInvoice.companyId).toBe(2);
    });

    it("returns companyId=0 when no supplier match", async () => {
      companyRepo.find.mockResolvedValue([]);

      const attachment = {
        documentType: ArDocumentType.TAX_INVOICE,
        s3Path: "path",
      } as InboundEmailAttachment;

      await service.route(attachment, Buffer.from(""), null, "unknown@nowhere.com", "Invoice");

      const savedInvoice = taxInvoiceRepo.save.mock.calls[0][0];
      expect(savedInvoice.companyId).toBe(0);
    });
  });

  describe("resolveCompanyId", () => {
    it("returns configCompanyId unchanged", async () => {
      await expect(service.resolveCompanyId("any@example.com", 99)).resolves.toBe(99);
      await expect(service.resolveCompanyId("any@example.com", null)).resolves.toBeNull();
    });
  });

  describe("supportedMimeTypes", () => {
    it("includes PDF and common image/spreadsheet types", () => {
      const mimes = service.supportedMimeTypes();
      expect(mimes).toContain("application/pdf");
      expect(mimes).toContain("image/jpeg");
      expect(mimes).toContain("image/png");
    });
  });
});
