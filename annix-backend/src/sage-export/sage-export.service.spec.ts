import type { SageExportInvoice } from "./interfaces/sage-invoice";
import { SageExportService } from "./sage-export.service";

describe("SageExportService", () => {
  const service = new SageExportService();

  const invoice = (overrides: Partial<SageExportInvoice> = {}): SageExportInvoice => ({
    invoiceNumber: "INV-001",
    supplierName: "Acme Supplies",
    invoiceDate: new Date("2026-01-15"),
    dueDate: new Date("2026-02-15"),
    totalAmount: 1150,
    vatAmount: 150,
    reference: "PO-123",
    lineItems: [
      {
        description: "Steel pipe 50NB",
        quantity: 10,
        unitPrice: 100,
        vatRate: 15,
        accountCode: "5000",
      },
    ],
    ...overrides,
  });

  const parseCsv = (buffer: Buffer): string[][] => {
    const text = buffer.toString("utf-8");
    return text
      .trim()
      .split("\r\n")
      .map((line) => parseCsvLine(line));
  };

  describe("generateCsv", () => {
    it("should produce correct header row", () => {
      const rows = parseCsv(service.generateCsv([invoice()]));

      expect(rows[0]).toEqual([
        "InvoiceNumber",
        "SupplierName",
        "InvoiceDate",
        "DueDate",
        "Reference",
        "LineDescription",
        "Quantity",
        "UnitPrice",
        "VatRate",
        "LineTotal",
        "AccountCode",
      ]);
    });

    it("should produce one data row per line item", () => {
      const inv = invoice({
        lineItems: [
          { description: "Item A", quantity: 2, unitPrice: 50, vatRate: 15, accountCode: "5000" },
          { description: "Item B", quantity: 1, unitPrice: 200, vatRate: 15, accountCode: "5100" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows.length).toBe(3);
      expect(rows[1][5]).toBe("Item A");
      expect(rows[2][5]).toBe("Item B");
    });

    it("should repeat header fields on each row", () => {
      const inv = invoice({
        lineItems: [
          { description: "Item A", quantity: 1, unitPrice: 10, vatRate: 15, accountCode: "5000" },
          { description: "Item B", quantity: 1, unitPrice: 20, vatRate: 15, accountCode: "5000" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][0]).toBe("INV-001");
      expect(rows[2][0]).toBe("INV-001");
      expect(rows[1][1]).toBe("Acme Supplies");
      expect(rows[2][1]).toBe("Acme Supplies");
    });

    it("should format dates as DD/MM/YYYY", () => {
      const rows = parseCsv(service.generateCsv([invoice()]));

      expect(rows[1][2]).toBe("15/01/2026");
      expect(rows[1][3]).toBe("15/02/2026");
    });

    it("should calculate line total as quantity * unitPrice", () => {
      const inv = invoice({
        lineItems: [
          { description: "Pipe", quantity: 5, unitPrice: 120.5, vatRate: 15, accountCode: "5000" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][9]).toBe("602.50");
    });

    it("should format amounts to 2 decimal places", () => {
      const inv = invoice({
        lineItems: [
          { description: "Item", quantity: 3, unitPrice: 33.333, vatRate: 15, accountCode: "5000" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][7]).toBe("33.33");
      expect(rows[1][9]).toBe("100.00");
    });

    it("should handle null dates as empty strings", () => {
      const inv = invoice({ invoiceDate: null, dueDate: null });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][2]).toBe("");
      expect(rows[1][3]).toBe("");
    });

    it("should handle null unitPrice as 0.00", () => {
      const inv = invoice({
        lineItems: [
          { description: "Unknown", quantity: 1, unitPrice: null, vatRate: 15, accountCode: "5000" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][7]).toBe("0.00");
      expect(rows[1][9]).toBe("0.00");
    });

    it("should handle null reference as empty string", () => {
      const inv = invoice({ reference: null });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][4]).toBe("");
    });

    it("should escape fields containing commas", () => {
      const inv = invoice({
        supplierName: "Smith, Jones & Co",
        lineItems: [
          { description: "Pipe, 50NB", quantity: 1, unitPrice: 100, vatRate: 15, accountCode: "5000" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][1]).toBe("Smith, Jones & Co");
      expect(rows[1][5]).toBe("Pipe, 50NB");
    });

    it("should escape fields containing double quotes", () => {
      const inv = invoice({
        lineItems: [
          {
            description: 'Steel pipe 2" OD',
            quantity: 1,
            unitPrice: 100,
            vatRate: 15,
            accountCode: "5000",
          },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][5]).toBe('Steel pipe 2" OD');
    });

    it("should escape fields containing newlines", () => {
      const inv = invoice({
        lineItems: [
          {
            description: "Line 1\nLine 2",
            quantity: 1,
            unitPrice: 50,
            vatRate: 15,
            accountCode: "5000",
          },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows[1][5]).toBe("Line 1\nLine 2");
    });

    it("should return empty body for empty invoice array", () => {
      const rows = parseCsv(service.generateCsv([]));

      expect(rows.length).toBe(1);
      expect(rows[0][0]).toBe("InvoiceNumber");
    });

    it("should handle invoice with zero line items", () => {
      const inv = invoice({ lineItems: [] });
      const rows = parseCsv(service.generateCsv([inv]));

      expect(rows.length).toBe(1);
    });

    it("should handle multiple invoices", () => {
      const inv1 = invoice({ invoiceNumber: "INV-001" });
      const inv2 = invoice({
        invoiceNumber: "INV-002",
        supplierName: "Other Supplier",
        lineItems: [
          { description: "Item X", quantity: 3, unitPrice: 75, vatRate: 15, accountCode: "5200" },
          { description: "Item Y", quantity: 1, unitPrice: 150, vatRate: 0, accountCode: "5200" },
        ],
      });
      const rows = parseCsv(service.generateCsv([inv1, inv2]));

      expect(rows.length).toBe(4);
      expect(rows[1][0]).toBe("INV-001");
      expect(rows[2][0]).toBe("INV-002");
      expect(rows[3][0]).toBe("INV-002");
    });

    it("should use CRLF line endings", () => {
      const buffer = service.generateCsv([invoice()]);
      const text = buffer.toString("utf-8");

      expect(text).toContain("\r\n");
      const withoutQuoted = text.replace(/"[^"]*"/g, "");
      expect(withoutQuoted).not.toMatch(/[^\r]\n/);
    });

    it("should return a Buffer", () => {
      const result = service.generateCsv([invoice()]);

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    if (inQuotes) {
      if (line[i] === '"' && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else if (line[i] === '"') {
        inQuotes = false;
        i++;
      } else {
        current += line[i];
        i++;
      }
    } else if (line[i] === '"') {
      inQuotes = true;
      i++;
    } else if (line[i] === ",") {
      fields.push(current);
      current = "";
      i++;
    } else {
      current += line[i];
      i++;
    }
  }

  fields.push(current);
  return fields;
}
