import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { STORAGE_SERVICE } from "../storage/storage.interface";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberInboundEmailService } from "./rubber-inbound-email.service";
import { RubberTaxInvoiceService } from "./rubber-tax-invoice.service";
import { RubberExtractionOrchestratorService } from "./services/rubber-extraction-orchestrator.service";

describe("RubberInboundEmailService", () => {
  let service: RubberInboundEmailService;

  const mockRepo = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((data: unknown) => data),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubberInboundEmailService,
        { provide: getRepositoryToken(RubberCompany), useValue: mockRepo() },
        { provide: getRepositoryToken(RubberProductCoding), useValue: mockRepo() },
        { provide: STORAGE_SERVICE, useValue: {} },
        { provide: RubberCocService, useValue: {} },
        { provide: RubberDeliveryNoteService, useValue: {} },
        { provide: RubberTaxInvoiceService, useValue: {} },
        { provide: AiChatService, useValue: {} },
        { provide: RubberCocExtractionService, useValue: {} },
        { provide: RubberExtractionOrchestratorService, useValue: {} },
      ],
    }).compile();

    service = module.get<RubberInboundEmailService>(RubberInboundEmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseSnCompoundCode", () => {
    it("should parse a valid S&N compound code", () => {
      const result = service.parseSnCompoundCode("AUA60BSC01");

      expect(result).not.toBeNull();
      expect(result!.brand).toBe("AU");
      expect(result!.grade).toBe("A");
      expect(result!.shoreHardness).toBe(60);
      expect(result!.color).toBe("B");
      expect(result!.colorName).toBe("Black");
      expect(result!.curingMethod).toBe("SC");
      expect(result!.curingMethodName).toBe("Steam Cured");
      expect(result!.supplierCode).toBe("01");
      expect(result!.rubberType).toBe("SNR");
    });

    it("should parse compound code with 2-char color (GR = Green)", () => {
      const result = service.parseSnCompoundCode("AUB45GRAC02");

      expect(result).not.toBeNull();
      expect(result!.color).toBe("GR");
      expect(result!.colorName).toBe("Green");
      expect(result!.curingMethod).toBe("AC");
      expect(result!.curingMethodName).toBe("Autoclave Cured");
    });

    it("should parse all color codes", () => {
      const colors: Record<string, string> = {
        R: "Red",
        B: "Black",
        G: "Grey",
        W: "White",
        N: "Natural",
        Y: "Yellow",
        O: "Orange",
      };

      Object.entries(colors).forEach(([code, name]) => {
        const result = service.parseSnCompoundCode(`AUA50${code}SC01`);
        expect(result).not.toBeNull();
        expect(result!.colorName).toBe(name);
      });
    });

    it("should parse all curing methods", () => {
      const methods: Record<string, string> = {
        SC: "Steam Cured",
        AC: "Autoclave Cured",
        PC: "Press Cured",
        RC: "Rotocure",
      };

      Object.entries(methods).forEach(([code, name]) => {
        const result = service.parseSnCompoundCode(`AUA50B${code}01`);
        expect(result).not.toBeNull();
        expect(result!.curingMethodName).toBe(name);
      });
    });

    it("should handle lowercase input", () => {
      const result = service.parseSnCompoundCode("aua60bsc01");

      expect(result).not.toBeNull();
      expect(result!.brand).toBe("AU");
      expect(result!.grade).toBe("A");
    });

    it("should handle input with whitespace", () => {
      const result = service.parseSnCompoundCode("  AUA60BSC01  ");

      expect(result).not.toBeNull();
      expect(result!.brand).toBe("AU");
    });

    it("should return null for invalid codes", () => {
      expect(service.parseSnCompoundCode("INVALID")).toBeNull();
      expect(service.parseSnCompoundCode("")).toBeNull();
      expect(service.parseSnCompoundCode("AU")).toBeNull();
      expect(service.parseSnCompoundCode("XYZ60BSC01")).toBeNull();
    });

    it("should parse 3-char supplier code", () => {
      const result = service.parseSnCompoundCode("AUA60BSC001");

      expect(result).not.toBeNull();
      expect(result!.supplierCode).toBe("001");
    });
  });

  describe("parseFilenameForCocInfo", () => {
    const parse = (filename: string) => (service as any).parseFilenameForCocInfo(filename);

    it("should extract batch numbers with B prefix", () => {
      const result = parse("AUA60BSC01-B123.pdf");

      expect(result.batchNumbers).toContain("B123");
    });

    it("should extract multiple batch numbers", () => {
      const result = parse("COC-B100-B101-B102.pdf");

      expect(result.batchNumbers).toEqual(["B100", "B101", "B102"]);
    });

    it("should extract batch range from end of filename", () => {
      const result = parse("COC_100-105.pdf");

      expect(result.batchNumbers).toContain("100-105");
    });

    it("should extract single batch number from end of filename", () => {
      const result = parse("COC_456.pdf");

      expect(result.batchNumbers).toContain("456");
    });

    it("should strip .pdf extension", () => {
      const result = parse("AUA60BSC01-B500.pdf");

      expect(result.batchNumbers).toContain("B500");
    });

    it("should strip -GRAPH suffix before parsing", () => {
      const result = parse("AUA60BSC01-B200-GRAPH.pdf");

      expect(result.batchNumbers).toContain("B200");
    });

    it("should extract compound code from filename", () => {
      const result = parse("AUA60BSC01-B123.pdf");

      expect(result.compoundCode).not.toBeNull();
    });

    it("should return null compoundCode when no match", () => {
      const result = parse("random-document.pdf");

      expect(result.compoundCode).toBeNull();
    });

    it("should return empty batchNumbers when none found", () => {
      const result = parse("document.pdf");

      expect(result.batchNumbers).toHaveLength(0);
    });

    it("should not treat -MDR suffix as compound code", () => {
      const result = parse("test-MDR.pdf");

      expect(result.compoundCode).toBeNull();
    });
  });

  describe("formatBatchRange", () => {
    it("should return empty string for empty array", () => {
      expect(service.formatBatchRange([])).toBe("");
    });

    it("should return single batch as-is", () => {
      expect(service.formatBatchRange(["B100"])).toBe("B100");
    });

    it("should format consecutive batches as range", () => {
      const result = service.formatBatchRange(["B100", "B101", "B102"]);

      expect(result).toBe("B100-102");
    });

    it("should handle non-consecutive batches separately", () => {
      const result = service.formatBatchRange(["B100", "B101", "B105"]);

      expect(result).toBe("B100-101, B105");
    });

    it("should sort batches numerically", () => {
      const result = service.formatBatchRange(["B105", "B100", "B101"]);

      expect(result).toBe("B100-101, B105");
    });

    it("should handle single-value ranges", () => {
      const result = service.formatBatchRange(["B100", "B200", "B300"]);

      expect(result).toBe("B100, B200, B300");
    });

    it("should handle batches without B prefix", () => {
      const result = service.formatBatchRange(["100", "101", "102"]);

      expect(result).toBe("B100-102");
    });

    it("should return comma-joined when no numeric values found", () => {
      const result = service.formatBatchRange(["abc", "def"]);

      expect(result).toBe("abc, def");
    });
  });

  describe("detectIfGraph", () => {
    const detect = (pdfText: string, filename: string) =>
      (service as any).detectIfGraph(pdfText, filename);

    it("should detect graph from filename containing 'graph'", () => {
      const result = detect("some text", "AUA60BSC01-GRAPH.pdf");

      expect(result.isGraph).toBe(true);
    });

    it("should detect graph from filename containing 'rheometer'", () => {
      const result = detect("some text", "rheometer-B100.pdf");

      expect(result.isGraph).toBe(true);
    });

    it("should not detect graph if PDF has data sheet indicators", () => {
      const result = detect("Shore A hardness: 60, tensile strength: 20 MPa", "regular-coc.pdf");

      expect(result.isGraph).toBe(false);
    });

    it("should prioritize graph filename even when PDF has data indicators", () => {
      const result = detect("Shore A: 60, specific gravity: 1.15", "coc-B100-graph.pdf");

      expect(result.isGraph).toBe(true);
    });

    it("should extract 3-digit batch numbers from graph PDF text", () => {
      const result = detect("Batch 456 test data 789", "rheometer-chart.pdf");

      expect(result.isGraph).toBe(true);
      expect(result.batchNumbers).toContain("456");
      expect(result.batchNumbers).toContain("789");
    });

    it("should return empty batchNumbers for non-graph", () => {
      const result = detect("regular document text", "coc-document.pdf");

      expect(result.isGraph).toBe(false);
      expect(result.batchNumbers).toHaveLength(0);
    });

    it("should not flag a regular filename as graph", () => {
      const result = detect("no indicators", "AUA60BSC01-B100.pdf");

      expect(result.isGraph).toBe(false);
    });
  });

  describe("determineDocumentType", () => {
    const determine = (subject: string) => (service as any).determineDocumentType(subject);

    it("should detect delivery note from subject with 'delivery'", () => {
      expect(determine("Delivery Note DN-001")).toBe("delivery_note");
    });

    it("should classify bare 'DN' subject as coc to avoid misclassification", () => {
      expect(determine("DN attached")).toBe("coc");
    });

    it("should detect delivery note from subject with 'despatch'", () => {
      expect(determine("Despatch advice")).toBe("delivery_note");
    });

    it("should detect delivery note from subject with 'dispatch'", () => {
      expect(determine("Dispatch confirmation")).toBe("delivery_note");
    });

    it("should detect tax invoice from subject with 'invoice'", () => {
      expect(determine("Tax Invoice attached")).toBe("tax_invoice");
      expect(determine("Invoice IN177200")).toBe("tax_invoice");
    });

    it("should detect tax invoice from subject with 'tax inv'", () => {
      expect(determine("Tax Inv #12345")).toBe("tax_invoice");
    });

    it("should exclude proforma invoices from tax invoice detection", () => {
      expect(determine("Proforma Invoice")).toBe("coc");
    });

    it("should prioritize tax invoice over delivery note", () => {
      expect(determine("Invoice for delivery")).toBe("tax_invoice");
    });

    it("should default to coc for other subjects", () => {
      expect(determine("Certificate of Conformance")).toBe("coc");
      expect(determine("Test results attached")).toBe("coc");
      expect(determine("")).toBe("coc");
    });

    it("should be case insensitive", () => {
      expect(determine("DELIVERY NOTE")).toBe("delivery_note");
      expect(determine("Delivery")).toBe("delivery_note");
      expect(determine("INVOICE")).toBe("tax_invoice");
    });
  });
});
