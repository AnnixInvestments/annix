import { createPdfDocument } from "../pdf-builder";
import {
  renderFooter,
  renderHeader,
  renderMetadataBlock,
  renderSignatureBlock,
  renderTable,
} from "./index";
import type { PdfDoc } from "./types";

interface MockDoc {
  calls: string[];
  page: { width: number; height: number };
  rect: jest.Mock;
  fillAndStroke: jest.Mock;
  fill: jest.Mock;
  stroke: jest.Mock;
  strokeColor: jest.Mock;
  fillColor: jest.Mock;
  font: jest.Mock;
  fontSize: jest.Mock;
  text: jest.Mock;
  image: jest.Mock;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  lineWidth: jest.Mock;
  bufferedPageRange: jest.Mock;
  switchToPage: jest.Mock;
}

function createMockDoc(pageWidth = 595.28, pageHeight = 841.89): MockDoc {
  const doc: Partial<MockDoc> = { calls: [], page: { width: pageWidth, height: pageHeight } };
  const chain = () => doc as MockDoc;

  doc.rect = jest.fn(() => chain());
  doc.fillAndStroke = jest.fn(() => chain());
  doc.fill = jest.fn(() => chain());
  doc.stroke = jest.fn(() => chain());
  doc.strokeColor = jest.fn(() => chain());
  doc.fillColor = jest.fn(() => chain());
  doc.font = jest.fn(() => chain());
  doc.fontSize = jest.fn(() => chain());
  doc.text = jest.fn((value: string) => {
    doc.calls!.push(`text:${value}`);
    return chain();
  });
  doc.image = jest.fn(() => chain());
  doc.moveTo = jest.fn(() => chain());
  doc.lineTo = jest.fn(() => chain());
  doc.lineWidth = jest.fn(() => chain());
  doc.bufferedPageRange = jest.fn(() => ({ start: 0, count: 1 }));
  doc.switchToPage = jest.fn(() => chain());

  return doc as MockDoc;
}

describe("pdf-templates", () => {
  describe("renderHeader", () => {
    it("renders title and subtitle without a logo", () => {
      const doc = createMockDoc();
      const nextY = renderHeader(doc as unknown as PdfDoc, {
        title: "Monthly Report",
        subtitle: "March 2026",
      });

      expect(doc.text).toHaveBeenCalledWith(
        "Monthly Report",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "March 2026",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.image).not.toHaveBeenCalled();
      expect(nextY).toBeGreaterThan(40);
    });

    it("renders logo buffer when provided", () => {
      const doc = createMockDoc();
      const logoBuf = Buffer.from("fake-png-bytes");
      renderHeader(doc as unknown as PdfDoc, {
        title: "Job Card",
        logoBuf,
        brandColor: "#0d9488",
      });

      expect(doc.image).toHaveBeenCalledWith(
        logoBuf,
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.fillColor).toHaveBeenCalledWith("#0d9488");
    });

    it("renders right-side image with caption", () => {
      const doc = createMockDoc();
      const qrBuf = Buffer.from("qr-data");
      renderHeader(doc as unknown as PdfDoc, {
        title: "Dispatch",
        rightImage: { buffer: qrBuf, width: 48, height: 48, caption: "Scan" },
      });

      expect(doc.image).toHaveBeenCalledWith(
        qrBuf,
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ width: 48, height: 48 }),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "Scan",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("draws a divider line below the header", () => {
      const doc = createMockDoc();
      renderHeader(doc as unknown as PdfDoc, { title: "Test" });

      expect(doc.moveTo).toHaveBeenCalled();
      expect(doc.lineTo).toHaveBeenCalled();
      expect(doc.stroke).toHaveBeenCalled();
    });
  });

  describe("renderFooter", () => {
    it("switches to every buffered page and writes page N of M", () => {
      const doc = createMockDoc();
      doc.bufferedPageRange = jest.fn(() => ({ start: 0, count: 3 }));

      renderFooter(doc as unknown as PdfDoc, {
        companyName: "Acme",
      });

      expect(doc.switchToPage).toHaveBeenCalledTimes(3);
      expect(doc.switchToPage).toHaveBeenNthCalledWith(1, 0);
      expect(doc.switchToPage).toHaveBeenNthCalledWith(2, 1);
      expect(doc.switchToPage).toHaveBeenNthCalledWith(3, 2);

      const pageTextCalls = (doc.text as jest.Mock).mock.calls.filter(
        ([v]) => typeof v === "string" && v.startsWith("Page "),
      );
      expect(pageTextCalls).toHaveLength(3);
      expect(pageTextCalls[0][0]).toBe("Page 1 of 3");
      expect(pageTextCalls[2][0]).toBe("Page 3 of 3");
    });

    it("writes company name and optional extra center text on every page", () => {
      const doc = createMockDoc();
      doc.bufferedPageRange = jest.fn(() => ({ start: 0, count: 2 }));

      renderFooter(doc as unknown as PdfDoc, {
        companyName: "PLS",
        extraCenterText: "Job: JC-001",
      });

      const textCalls = (doc.text as jest.Mock).mock.calls.map((c) => c[0]);
      expect(textCalls.filter((t) => t === "PLS")).toHaveLength(2);
      expect(textCalls.filter((t) => t === "Job: JC-001")).toHaveLength(2);
    });

    it("draws brand bar rectangle by default", () => {
      const doc = createMockDoc();
      renderFooter(doc as unknown as PdfDoc, { companyName: "X", brandColor: "#ff0000" });
      expect(doc.rect).toHaveBeenCalled();
      expect(doc.fill).toHaveBeenCalledWith("#ff0000");
    });

    it("omits brand bar when showBrandBar is false", () => {
      const doc = createMockDoc();
      renderFooter(doc as unknown as PdfDoc, { companyName: "X", showBrandBar: false });
      expect(doc.fill).not.toHaveBeenCalled();
    });

    it("uses landscape margin when page is wider than tall", () => {
      const doc = createMockDoc(841.89, 595.28);
      renderFooter(doc as unknown as PdfDoc, { companyName: "X" });
      expect(doc.switchToPage).toHaveBeenCalledTimes(1);
    });
  });

  describe("renderTable", () => {
    interface InvoiceRow {
      invoice: string;
      amount: number;
    }

    const columns = [
      { key: "invoice", header: "Invoice", width: 100 },
      {
        key: "amount",
        header: "Amount",
        width: 80,
        align: "right" as const,
        format: (r: InvoiceRow) => r.amount.toFixed(2),
      },
    ];

    it("writes the header row and one row per data item", () => {
      const doc = createMockDoc();
      renderTable<InvoiceRow>(doc as unknown as PdfDoc, {
        columns,
        rows: [
          { invoice: "INV-1", amount: 100 },
          { invoice: "INV-2", amount: 250.5 },
        ],
        startX: 40,
        startY: 100,
      });

      expect(doc.text).toHaveBeenCalledWith(
        "Invoice",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "Amount",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "INV-1",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "INV-2",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "100.00",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
      expect(doc.text).toHaveBeenCalledWith(
        "250.50",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("returns a Y coordinate past the last row", () => {
      const doc = createMockDoc();
      const nextY = renderTable<InvoiceRow>(doc as unknown as PdfDoc, {
        columns,
        rows: [{ invoice: "A", amount: 1 }],
        startX: 40,
        startY: 100,
        rowHeight: 20,
        headerHeight: 20,
      });
      expect(nextY).toBe(140);
    });

    it("falls back to empty string when row has no value for a column", () => {
      const doc = createMockDoc();
      renderTable(doc as unknown as PdfDoc, {
        columns: [{ key: "missing", header: "Missing", width: 50 }],
        rows: [{ other: "value" }],
        startX: 40,
        startY: 100,
      });
      expect(doc.text).toHaveBeenCalledWith(
        "",
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("invokes onOverflow callback and continues at returned Y", () => {
      const doc = createMockDoc();
      const onOverflow = jest.fn(() => 60);
      const rows = Array.from({ length: 50 }, (_, i) => ({ invoice: `I${i}`, amount: i }));

      renderTable<InvoiceRow>(doc as unknown as PdfDoc, {
        columns,
        rows,
        startX: 40,
        startY: 100,
        rowHeight: 20,
        onOverflow,
      });

      expect(onOverflow).toHaveBeenCalled();
    });
  });

  describe("renderSignatureBlock", () => {
    it("renders N signature lines for N parties", () => {
      const doc = createMockDoc();
      renderSignatureBlock(doc as unknown as PdfDoc, {
        parties: [
          { label: "Customer", name: "Alice", date: "2026-04-05" },
          { label: "Supplier", name: "Bob", date: "2026-04-05" },
        ],
        startX: 40,
        startY: 200,
        width: 500,
      });

      expect(doc.moveTo).toHaveBeenCalledTimes(2);
      expect(doc.lineTo).toHaveBeenCalledTimes(2);

      const textCalls = (doc.text as jest.Mock).mock.calls.map((c) => c[0]);
      expect(textCalls).toContain("Customer");
      expect(textCalls).toContain("Supplier");
      expect(textCalls).toContain("Alice");
      expect(textCalls).toContain("Bob");
      expect(textCalls).toContain("Date: 2026-04-05");
    });

    it("returns startY unchanged when no parties provided", () => {
      const doc = createMockDoc();
      const nextY = renderSignatureBlock(doc as unknown as PdfDoc, {
        parties: [],
        startX: 40,
        startY: 200,
        width: 500,
      });
      expect(nextY).toBe(200);
      expect(doc.text).not.toHaveBeenCalled();
    });

    it("renders signature image when provided", () => {
      const doc = createMockDoc();
      const sigBuf = Buffer.from("sig-png");
      renderSignatureBlock(doc as unknown as PdfDoc, {
        parties: [{ label: "Signed", signatureImg: sigBuf }],
        startX: 40,
        startY: 200,
        width: 200,
      });
      expect(doc.image).toHaveBeenCalledWith(
        sigBuf,
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
      );
    });

    it("skips date line when date is null", () => {
      const doc = createMockDoc();
      renderSignatureBlock(doc as unknown as PdfDoc, {
        parties: [{ label: "Director", name: "C" }],
        startX: 40,
        startY: 200,
        width: 200,
      });
      const textCalls = (doc.text as jest.Mock).mock.calls.map((c) => c[0]);
      expect(textCalls.some((t) => typeof t === "string" && t.startsWith("Date:"))).toBe(false);
    });
  });

  describe("renderMetadataBlock", () => {
    it("writes label and value for each item in single column mode", () => {
      const doc = createMockDoc();
      renderMetadataBlock(doc as unknown as PdfDoc, {
        items: [
          { label: "PO Number", value: "PO-001" },
          { label: "Customer", value: "Acme" },
        ],
        startX: 40,
        startY: 200,
        width: 500,
      });

      const textCalls = (doc.text as jest.Mock).mock.calls.map((c) => c[0]);
      expect(textCalls).toContain("PO Number");
      expect(textCalls).toContain("PO-001");
      expect(textCalls).toContain("Customer");
      expect(textCalls).toContain("Acme");
    });

    it("lays out items across two columns when columns=2", () => {
      const doc = createMockDoc();
      const nextY = renderMetadataBlock(doc as unknown as PdfDoc, {
        items: [
          { label: "A", value: "1" },
          { label: "B", value: "2" },
          { label: "C", value: "3" },
          { label: "D", value: "4" },
        ],
        startX: 40,
        startY: 200,
        width: 500,
        columns: 2,
        lineHeight: 16,
      });
      expect(nextY).toBe(232);
    });
  });

  describe("integration with real PDFKit document", () => {
    it("produces a non-empty PDF buffer using all helpers together", async () => {
      const { doc, toBuffer } = createPdfDocument({ margin: 40 });

      renderHeader(doc, {
        title: "Integration Test",
        subtitle: "Full pipeline",
        x: 40,
        y: 40,
        width: 515,
      });

      renderMetadataBlock(doc, {
        items: [
          { label: "Ref", value: "INT-001" },
          { label: "Date", value: "2026-04-05" },
        ],
        startX: 40,
        startY: 140,
        width: 515,
        columns: 2,
      });

      renderTable(doc, {
        columns: [
          { key: "name", header: "Name", width: 200 },
          { key: "qty", header: "Qty", width: 100, align: "right" },
        ],
        rows: [
          { name: "Widget A", qty: 5 },
          { name: "Widget B", qty: 12 },
        ],
        startX: 40,
        startY: 200,
      });

      renderSignatureBlock(doc, {
        parties: [{ label: "Approved By", name: "Test User", date: "2026-04-05" }],
        startX: 40,
        startY: 400,
        width: 400,
      });

      renderFooter(doc, { companyName: "Integration Co", brandColor: "#0d9488" });

      const buffer = await toBuffer();
      expect(buffer.length).toBeGreaterThan(100);
      expect(buffer.slice(0, 4).toString()).toBe("%PDF");
    });
  });
});
