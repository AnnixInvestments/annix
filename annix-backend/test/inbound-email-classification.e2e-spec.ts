import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { InboundEmailRegistry } from "../src/inbound-email/inbound-email-registry.service";
import { AiChatService } from "../src/nix/ai-providers/ai-chat.service";
import { RubberCompany } from "../src/rubber-lining/entities/rubber-company.entity";
import { RubberDeliveryNote } from "../src/rubber-lining/entities/rubber-delivery-note.entity";
import { RubberTaxInvoice } from "../src/rubber-lining/entities/rubber-tax-invoice.entity";
import { ArEmailAdapterService } from "../src/rubber-lining/services/ar-email-adapter.service";
import { StockControlSupplier } from "../src/stock-control/entities/stock-control-supplier.entity";
import { DeliveryService } from "../src/stock-control/services/delivery.service";
import { InvoiceService } from "../src/stock-control/services/invoice.service";
import { InvoiceExtractionService } from "../src/stock-control/services/invoice-extraction.service";
import { ScEmailAdapterService } from "../src/stock-control/services/sc-email-adapter.service";
import { WorkflowNotificationService } from "../src/stock-control/services/workflow-notification.service";

interface FixtureAttachment {
  filename: string;
  mimeType: string;
  contentText: string;
}

interface EmailFixture {
  app: "stock-control" | "au-rubber" | "cv-assistant";
  subject: string;
  fromEmail: string;
  fromName?: string;
  bodyText?: string;
  attachments: FixtureAttachment[];
  expected: {
    documentType?: string;
    minConfidence?: number;
    source?: string;
    jobReferenceCode?: string;
    candidateEmail?: string;
    candidateName?: string;
    note?: string;
  };
}

const FIXTURES_DIR = join(__dirname, "fixtures", "email");

const loadFixture = (name: string): EmailFixture =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf8"));

const loadAllFixtures = (): { name: string; fixture: EmailFixture }[] =>
  readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: f, fixture: loadFixture(f) }));

describe("Inbound Email Classification (regression harness)", () => {
  let scClassifier: ScEmailAdapterService;
  let arClassifier: ArEmailAdapterService;

  const aiChatMock = {
    isAvailable: jest.fn().mockResolvedValue(false),
    chat: jest.fn(),
    chatWithImage: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ScEmailAdapterService,
        ArEmailAdapterService,
        { provide: AiChatService, useValue: aiChatMock },
        { provide: InboundEmailRegistry, useValue: { registerAdapter: jest.fn() } },
        { provide: InvoiceService, useValue: {} },
        { provide: DeliveryService, useValue: {} },
        { provide: InvoiceExtractionService, useValue: {} },
        { provide: WorkflowNotificationService, useValue: {} },
        { provide: getRepositoryToken(StockControlSupplier), useValue: {} },
        { provide: getRepositoryToken(RubberDeliveryNote), useValue: {} },
        { provide: getRepositoryToken(RubberTaxInvoice), useValue: {} },
        { provide: getRepositoryToken(RubberCompany), useValue: {} },
      ],
    }).compile();

    scClassifier = moduleFixture.get(ScEmailAdapterService);
    arClassifier = moduleFixture.get(ArEmailAdapterService);
  });

  it("fixtures directory contains the expected files", () => {
    const files = loadAllFixtures()
      .map((f) => f.name)
      .sort();
    expect(files).toEqual(
      [
        "ar-coc-default.json",
        "ar-credit-note.json",
        "ar-tax-invoice.json",
        "cv-candidate-application.json",
        "sc-delivery-note.json",
        "sc-supplier-coc.json",
        "sc-supplier-invoice.json",
      ].sort(),
    );
  });

  describe("Stock Control classifier (subject regex)", () => {
    const scFixtures = [
      "sc-supplier-invoice.json",
      "sc-delivery-note.json",
      "sc-supplier-coc.json",
    ];

    scFixtures.forEach((name) => {
      it(`${name} → ${loadFixture(name).expected.documentType}`, () => {
        const fixture = loadFixture(name);
        const attachment = fixture.attachments[0];
        const result = scClassifier.classifyFromSubject(fixture.subject, attachment.filename);

        expect(result).not.toBeNull();
        if (result) {
          expect(result.documentType).toBe(fixture.expected.documentType);
          expect(result.source).toBe("subject");
          const minConfidence = fixture.expected.minConfidence ?? 0;
          expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
        }
      });
    });
  });

  describe("AU Rubber classifier (subject regex + defaults)", () => {
    const arKeywordFixtures = ["ar-tax-invoice.json", "ar-credit-note.json"];

    arKeywordFixtures.forEach((name) => {
      it(`${name} → ${loadFixture(name).expected.documentType}`, () => {
        const fixture = loadFixture(name);
        const attachment = fixture.attachments[0];
        const result = arClassifier.classifyFromSubject(fixture.subject, attachment.filename);

        expect(result).not.toBeNull();
        if (result) {
          expect(result.documentType).toBe(fixture.expected.documentType);
          const minConfidence = fixture.expected.minConfidence ?? 0;
          expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
        }
      });
    });

    it("ar-coc-default.json → defaults unknown subjects to coc", () => {
      const fixture = loadFixture("ar-coc-default.json");
      const attachment = fixture.attachments[0];
      const result = arClassifier.classifyFromSubject(fixture.subject, attachment.filename);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.documentType).toBe("coc");
        expect(result.confidence).toBeCloseTo(0.5, 1);
      }
    });

    it("proforma subjects are not auto-classified (null result)", () => {
      const result = arClassifier.classifyFromSubject("Proforma 1234", "proforma.pdf");
      expect(result).toBeNull();
    });
  });

  describe("SC content fallback when AI unavailable", () => {
    it("returns UNKNOWN with zero confidence", async () => {
      aiChatMock.isAvailable.mockResolvedValueOnce(false);
      const result = await scClassifier.classifyFromContent(
        "some text",
        "text/plain",
        "unknown.txt",
        "someone@example.com",
        "random subject",
      );
      expect(result.documentType).toBe("unknown");
      expect(result.confidence).toBe(0);
    });
  });

  describe("AR content refinement (pre-AI keyword pass)", () => {
    it("CREDIT NOTE marker in body → credit_note (no AI call)", async () => {
      aiChatMock.isAvailable.mockClear();
      const fixture = loadFixture("ar-credit-note.json");
      const attachment = fixture.attachments[0];
      const result = await arClassifier.classifyFromContent(
        attachment.contentText,
        attachment.mimeType,
        attachment.filename,
        fixture.fromEmail,
        fixture.subject,
      );
      expect(result.documentType).toBe("credit_note");
      expect(aiChatMock.isAvailable).not.toHaveBeenCalled();
    });

    it("TAX INVOICE marker in body → tax_invoice (no AI call)", async () => {
      aiChatMock.isAvailable.mockClear();
      const fixture = loadFixture("ar-tax-invoice.json");
      const attachment = fixture.attachments[0];
      const result = await arClassifier.classifyFromContent(
        attachment.contentText,
        attachment.mimeType,
        attachment.filename,
        fixture.fromEmail,
        fixture.subject,
      );
      expect(result.documentType).toBe("tax_invoice");
      expect(aiChatMock.isAvailable).not.toHaveBeenCalled();
    });
  });

  describe("CV Assistant fixture (different shape)", () => {
    it("exposes reference code + candidate info for later adapter parity test", () => {
      const fixture = loadFixture("cv-candidate-application.json");
      expect(fixture.app).toBe("cv-assistant");
      expect(fixture.expected.jobReferenceCode).toBe("REF-2026-0408");
      expect(fixture.expected.candidateEmail).toBe("candidate@example.com");
      expect(fixture.attachments[0].mimeType).toBe("application/pdf");
    });
  });
});
