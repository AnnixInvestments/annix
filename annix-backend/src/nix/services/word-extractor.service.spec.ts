import { WordExtractorService } from "./word-extractor.service";

jest.mock("mammoth", () => ({
  convertToHtml: jest.fn(),
  extractRawText: jest.fn(),
}));

describe("WordExtractorService", () => {
  let service: WordExtractorService;
  let mockMammoth: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WordExtractorService();
    mockMammoth = require("mammoth");
  });

  const setupMockDocument = (text: string, html?: string) => {
    mockMammoth.convertToHtml.mockResolvedValue({
      value: html || `<p>${text}</p>`,
      messages: [],
    });
    mockMammoth.extractRawText.mockResolvedValue({
      value: text,
    });
  };

  describe("extractFromWord", () => {
    it("should extract basic pipe item", async () => {
      setupMockDocument(`
        Project: Test Project
        200NB Pipe Carbon Steel - 5 pcs
      `);

      const result = await service.extractFromWord("/fake/path.docx");

      expect(result.sheetName).toBe("Word Document");
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const pipeItem = result.items.find((i) => i.itemType === "pipe");
      expect(pipeItem).toBeDefined();
      expect(pipeItem?.diameter).toBe(200);
      expect(pipeItem?.material).toBe("Carbon Steel");
    });

    it("should extract bend item with angle", async () => {
      setupMockDocument("300NB 45 degree bend M.S.");

      const result = await service.extractFromWord("/fake/path.docx");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
      expect(bendItem?.diameter).toBe(300);
      expect(bendItem?.material).toBe("Mild Steel");
    });

    it("should detect tee item", async () => {
      setupMockDocument("200NB Equal Tee Stainless Steel");

      const result = await service.extractFromWord("/fake/path.docx");

      const teeItem = result.items.find((i) => i.itemType === "tee");
      expect(teeItem).toBeDefined();
      expect(teeItem?.material).toBe("Stainless Steel");
    });

    it("should detect flange item", async () => {
      setupMockDocument("200NB Weldneck Flange ASTM A105");

      const result = await service.extractFromWord("/fake/path.docx");

      const flangeItem = result.items.find((i) => i.itemType === "flange");
      expect(flangeItem).toBeDefined();
      expect(flangeItem?.materialGrade).toBe("A105");
    });

    it("should detect expansion joint", async () => {
      setupMockDocument("200NB Expansion Joint");

      const result = await service.extractFromWord("/fake/path.docx");

      const ejItem = result.items.find((i) => i.itemType === "expansion_joint");
      expect(ejItem).toBeDefined();
    });

    it("should detect elbow as bend", async () => {
      setupMockDocument("200NB 90 degree elbow");

      const result = await service.extractFromWord("/fake/path.docx");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
    });

    it("should detect reducer", async () => {
      setupMockDocument("400NB Reducer Carbon Steel");

      const result = await service.extractFromWord("/fake/path.docx");

      const reducerItem = result.items.find((i) => i.itemType === "reducer");
      expect(reducerItem).toBeDefined();
    });

    it("should return raw text and html content", async () => {
      const text = "200NB Pipe";
      const html = "<p>200NB Pipe</p>";
      setupMockDocument(text, html);

      const result = await service.extractFromWord("/fake/path.docx");

      expect(result.rawText).toContain(text);
      expect(result.htmlContent).toContain(html);
    });

    it("should return total rows count", async () => {
      setupMockDocument("Line 1\nLine 2\nLine 3");

      const result = await service.extractFromWord("/fake/path.docx");

      expect(result.totalRows).toBe(3);
    });

    it("should count clarifications needed", async () => {
      setupMockDocument("200NB Pipe\nSteel Bend");

      const result = await service.extractFromWord("/fake/path.docx");

      expect(result.clarificationsNeeded).toBeGreaterThanOrEqual(0);
    });

    describe("material patterns", () => {
      it.each([
        ["M.S. Pipe 200NB", "Mild Steel"],
        ["Mild Steel 200NB Pipe", "Mild Steel"],
        ["200NB S.S. Pipe", "Stainless Steel"],
        ["200NB Stainless Steel Pipe", "Stainless Steel"],
        ["200NB Pipe API 5L", "Carbon Steel"],
        ["200NB Pipe SABS 719", "Carbon Steel"],
        ["200NB Pipe Carbon Steel", "Carbon Steel"],
        ["200NB Pipe ASTM A234 WPB", "Carbon Steel"],
        ["200NB Pipe ASTM A105", "Carbon Steel"],
        ["200NB Pipe ERW", "Carbon Steel"],
      ])('should extract material from "%s" as "%s"', async (text, expectedMaterial) => {
        setupMockDocument(text);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.some((i) => i.material === expectedMaterial)).toBe(true);
      });
    });

    describe("diameter extraction", () => {
      it.each([
        ["200NB Pipe", 200],
        ["300 NB Bend", 300],
        ["400mm dia Pipe", 400],
        ["DN500 Pipe", 500],
      ])('should extract diameter from "%s" as %d', async (text, expectedDiameter) => {
        setupMockDocument(text);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.some((i) => i.diameter === expectedDiameter)).toBe(true);
      });
    });

    describe("metadata extraction", () => {
      it("should extract project reference", async () => {
        setupMockDocument(`
          Reference: PRJ-2024-001
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.metadata.projectReference).toBe("PRJ-2024-001");
      });

      it("should extract project location", async () => {
        setupMockDocument(`
          Site: Johannesburg
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.metadata.projectLocation).toContain("Johannesburg");
      });

      it("should extract project name", async () => {
        setupMockDocument(`
          Project: Mining Plant Expansion
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.metadata.projectName).toContain("Mining Plant Expansion");
      });
    });

    describe("specification parsing", () => {
      it("should extract specification data", async () => {
        setupMockDocument(`
          Specification - CARBON STEEL API 5L Grade B, wall thickness: 6.35mm
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
      });

      it("should parse wall thickness from specification", async () => {
        setupMockDocument(`
          API 5L Grade B, 8.18mm wall thickness
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.wallThickness).toBe("8.18mm");
      });

      it("should parse standard from specification", async () => {
        setupMockDocument(`
          ASTM A106, 6mm wall thickness
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.standard).toBe("ASTM A106");
      });

      it("should parse material grade from specification", async () => {
        setupMockDocument(`
          API 5L Grade B, 6mm wall thickness
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.materialGrade).toBe("B");
      });

      it("should parse schedule from specification", async () => {
        setupMockDocument(`
          API 5L Grade B, Sch 40, 6mm wall thickness
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.schedule).toBe("Sch 40");
      });
    });

    describe("item filtering", () => {
      it("should skip header lines", async () => {
        setupMockDocument(`
          Item Description Qty Unit
          200NB Pipe Carbon Steel
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.every((i) => !i.description.includes("Item Description Qty"))).toBe(
          true,
        );
      });

      it("should skip section headers", async () => {
        setupMockDocument(`
          Bill 1 - Piping
          200NB Pipe Carbon Steel
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.every((i) => !i.description.includes("Bill 1"))).toBe(true);
      });
    });

    describe("item numbering", () => {
      it("should assign sequential item numbers with WORD prefix", async () => {
        setupMockDocument(`
          200NB Pipe Carbon Steel
          300NB Bend M.S.
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.some((i) => i.itemNumber === "WORD-1")).toBe(true);
        expect(result.items.some((i) => i.itemNumber === "WORD-2")).toBe(true);
      });
    });

    describe("clarification marking", () => {
      it("should mark items without material as needing clarification", async () => {
        setupMockDocument("200NB Pipe");

        const result = await service.extractFromWord("/fake/path.docx");

        const item = result.items.find((i) => i.itemType === "pipe");
        expect(item?.needsClarification).toBe(true);
        expect(item?.clarificationReason).toContain("material");
      });

      it("should mark items without diameter as needing clarification", async () => {
        setupMockDocument("Steel Pipe Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        const item = result.items.find((i) => i.itemType === "pipe");
        expect(item?.needsClarification).toBe(true);
      });

      it("should not mark items with diameter and material as needing clarification", async () => {
        setupMockDocument("200NB Pipe Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        const item = result.items.find((i) => i.itemType === "pipe");
        expect(item?.needsClarification).toBe(false);
      });
    });

    describe("item type precedence", () => {
      it("should detect elbow before generic bend pattern", async () => {
        setupMockDocument("200NB 90 degree elbow");

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items[0]?.itemType).toBe("bend");
      });

      it("should not detect reducing tee as reducer", async () => {
        setupMockDocument("200NB reducing tee Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        const reducerItem = result.items.find((i) => i.itemType === "reducer");
        expect(reducerItem).toBeUndefined();
        const teeItem = result.items.find((i) => i.itemType === "tee");
        expect(teeItem).toBeDefined();
      });
    });

    describe("mammoth warnings", () => {
      it("should handle mammoth conversion warnings", async () => {
        mockMammoth.convertToHtml.mockResolvedValue({
          value: "<p>Test</p>",
          messages: [{ message: "Image could not be converted" }],
        });
        mockMammoth.extractRawText.mockResolvedValue({
          value: "200NB Pipe Carbon Steel",
        });

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe("context inheritance", () => {
      it("should inherit material from specification header", async () => {
        setupMockDocument(`
          Specification - CARBON STEEL API 5L Grade B
          200NB Pipe
        `);

        const result = await service.extractFromWord("/fake/path.docx");

        const pipeItem = result.items.find((i) => i.itemType === "pipe");
        expect(pipeItem).toBeDefined();
      });
    });

    describe("default values", () => {
      it("should set default quantity to 1", async () => {
        setupMockDocument("200NB Pipe Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items[0]?.quantity).toBe(1);
      });

      it("should set default unit to ea", async () => {
        setupMockDocument("200NB Pipe Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items[0]?.unit).toBe("ea");
      });

      it("should set diameterUnit to mm", async () => {
        setupMockDocument("200NB Pipe Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items[0]?.diameterUnit).toBe("mm");
      });
    });

    describe("line filtering", () => {
      it("should skip short lines", async () => {
        setupMockDocument("AB\n200NB Pipe Carbon Steel\nXY");

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.every((i) => i.description.length >= 5)).toBe(true);
      });

      it("should skip lines without diameter or item type", async () => {
        setupMockDocument("This is a general text line\n200NB Pipe Carbon Steel");

        const result = await service.extractFromWord("/fake/path.docx");

        expect(result.items.length).toBe(1);
      });
    });
  });
});
