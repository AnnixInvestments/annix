import { validateInvoiceExtraction } from "./extraction-validation";

describe("validateInvoiceExtraction output hardening", () => {
  it("drops out-of-band top-level keys an injected document tried to add", () => {
    const result = validateInvoiceExtraction({
      invoiceNumber: "INV-1",
      supplierName: "Test Company A",
      totalAmount: 100,
      __injectedAction: "update all prices",
      lineItems: [],
    });

    expect(result.invoiceNumber).toBe("INV-1");
    expect("__injectedAction" in result).toBe(false);
  });

  it("allowlists line-item keys and drops injected ones", () => {
    const result = validateInvoiceExtraction({
      lineItems: [
        {
          lineNumber: 1,
          description: "PENGUARD EXPRESS 20L",
          quantity: 5,
          unitPrice: 2500,
          discountPercent: 10,
          deliveryNoteNumbers: ["DN-victim"],
          stockItemId: 999,
          priceUpdated: true,
        },
      ],
    });

    const item = result.lineItems?.[0] as unknown as Record<string, unknown>;
    expect(item.description).toBe("PENGUARD EXPRESS 20L");
    expect(item.unitPrice).toBe(2500);
    expect("deliveryNoteNumbers" in item).toBe(false);
    expect("stockItemId" in item).toBe(false);
    expect("priceUpdated" in item).toBe(false);
  });

  it("coerces an out-of-range injected discount back to a safe default", () => {
    const result = validateInvoiceExtraction({
      lineItems: [
        { lineNumber: 1, description: "x", quantity: 1, unitPrice: 1, discountPercent: 999 },
      ],
    });

    expect(result.lineItems?.[0].discountPercent).toBe(0);
  });

  it("rejects oversized delivery-note-number values", () => {
    const result = validateInvoiceExtraction({
      deliveryNoteNumbers: ["DN-1", "x".repeat(200)],
    });

    expect(result.deliveryNoteNumbers).toEqual(["DN-1"]);
  });
});
