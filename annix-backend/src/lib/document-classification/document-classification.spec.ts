import {
  buildClassificationPrompt,
  buildClassificationUserMessage,
  DOCUMENT_TYPE_METADATA,
  documentTypesForNamespace,
  isClassificationImageMime,
  parseClassificationResponse,
  SharedDocumentType,
  truncateClassificationText,
} from "./index";

describe("document-classification", () => {
  describe("SharedDocumentType metadata", () => {
    it("has metadata for every enum value", () => {
      const missing = Object.values(SharedDocumentType).filter(
        (key) => !DOCUMENT_TYPE_METADATA[key],
      );
      expect(missing).toEqual([]);
    });

    it("documentTypesForNamespace returns only types for that app", () => {
      const scTypes = documentTypesForNamespace("stock-control").map((m) => m.key);
      expect(scTypes).toContain(SharedDocumentType.SUPPLIER_INVOICE);
      expect(scTypes).toContain(SharedDocumentType.JOB_CARD_DRAWING);
      expect(scTypes).not.toContain(SharedDocumentType.COC);
      expect(scTypes).not.toContain(SharedDocumentType.CV_APPLICATION);
    });

    it("shared types appear in multiple namespaces", () => {
      const meta = DOCUMENT_TYPE_METADATA[SharedDocumentType.DELIVERY_NOTE];
      expect(meta.namespaces).toContain("stock-control");
      expect(meta.namespaces).toContain("au-rubber");
    });

    it("UNKNOWN is present in every namespace", () => {
      const meta = DOCUMENT_TYPE_METADATA[SharedDocumentType.UNKNOWN];
      expect(meta.namespaces).toEqual(
        expect.arrayContaining(["stock-control", "au-rubber", "cv-assistant"]),
      );
    });
  });

  describe("buildClassificationPrompt", () => {
    it("includes system description and numbered types", () => {
      const prompt = buildClassificationPrompt({
        systemDescription: "Test classifier",
        documentTypes: [
          { key: "invoice", description: "An invoice doc" },
          { key: "unknown", description: "Cannot classify" },
        ],
        responseSchema: '{"documentType": "..."}',
      });

      expect(prompt).toContain("Test classifier");
      expect(prompt).toContain("1. invoice - An invoice doc");
      expect(prompt).toContain("2. unknown - Cannot classify");
      expect(prompt).toContain("Respond ONLY with JSON:");
      expect(prompt).toContain('{"documentType": "..."}');
    });

    it("appends additionalSections when provided", () => {
      const prompt = buildClassificationPrompt({
        systemDescription: "Sys",
        documentTypes: [{ key: "a", description: "A" }],
        additionalSections: ["Extra rule one", "Extra rule two"],
        responseSchema: "{}",
      });
      expect(prompt).toContain("Extra rule one");
      expect(prompt).toContain("Extra rule two");
    });

    it("omits additional section block when no extras provided", () => {
      const prompt = buildClassificationPrompt({
        systemDescription: "Sys",
        documentTypes: [{ key: "a", description: "A" }],
        responseSchema: "{}",
      });
      expect(prompt).not.toMatch(/\n\n\nRespond/);
    });
  });

  describe("truncateClassificationText", () => {
    it("returns text unchanged when shorter than max", () => {
      expect(truncateClassificationText("short", 100)).toBe("short");
    });

    it("truncates text longer than max", () => {
      const long = "x".repeat(6000);
      expect(truncateClassificationText(long, 5000)).toHaveLength(5000);
    });

    it("defaults to 5000 char limit", () => {
      const long = "y".repeat(6000);
      expect(truncateClassificationText(long)).toHaveLength(5000);
    });
  });

  describe("buildClassificationUserMessage", () => {
    it("formats filename/from/subject/content in fixed layout", () => {
      const msg = buildClassificationUserMessage({
        filename: "doc.pdf",
        fromEmail: "a@example.com",
        subject: "Hi",
        content: "body text",
      });
      expect(msg).toContain("Filename: doc.pdf");
      expect(msg).toContain("From email: a@example.com");
      expect(msg).toContain("Subject: Hi");
      expect(msg).toContain("body text");
    });
  });

  describe("isClassificationImageMime", () => {
    it.each(["image/jpeg", "image/png", "image/webp"])("returns true for %s", (mime) => {
      expect(isClassificationImageMime(mime)).toBe(true);
    });

    it.each(["application/pdf", "text/plain", "image/gif"])("returns false for %s", (mime) => {
      expect(isClassificationImageMime(mime)).toBe(false);
    });
  });

  describe("parseClassificationResponse", () => {
    const options = {
      validTypes: ["invoice", "delivery_note", "unknown"],
      unknownType: "unknown",
    };

    it("returns parsed result for valid JSON", () => {
      const result = parseClassificationResponse(
        '{"documentType": "invoice", "confidence": 0.95, "supplierName": "ACME"}',
        options,
      );
      expect(result.documentType).toBe("invoice");
      expect(result.confidence).toBe(0.95);
      expect(result.supplierName).toBe("ACME");
      expect(result.source).toBe("content_ai");
    });

    it("extracts JSON from surrounding text", () => {
      const result = parseClassificationResponse(
        'Here is the answer: {"documentType": "delivery_note", "confidence": 0.8} end.',
        options,
      );
      expect(result.documentType).toBe("delivery_note");
    });

    it("returns unknown when no JSON found", () => {
      const result = parseClassificationResponse("no json here", options);
      expect(result.documentType).toBe("unknown");
      expect(result.confidence).toBe(0);
    });

    it("returns unknown when documentType is invalid", () => {
      const result = parseClassificationResponse(
        '{"documentType": "bogus", "confidence": 0.9}',
        options,
      );
      expect(result.documentType).toBe("unknown");
    });

    it("returns unknown when JSON is malformed", () => {
      const result = parseClassificationResponse('{"documentType": "invoice"', options);
      expect(result.documentType).toBe("unknown");
    });

    it("defaults confidence to 0.8 when missing", () => {
      const result = parseClassificationResponse('{"documentType": "invoice"}', options);
      expect(result.confidence).toBe(0.8);
    });

    it("uses custom default confidence when provided", () => {
      const result = parseClassificationResponse('{"documentType": "invoice"}', {
        ...options,
        defaultConfidence: 0.5,
      });
      expect(result.confidence).toBe(0.5);
    });

    it("nulls supplierName when absent", () => {
      const result = parseClassificationResponse(
        '{"documentType": "invoice", "confidence": 0.9}',
        options,
      );
      expect(result.supplierName).toBeNull();
    });
  });
});
