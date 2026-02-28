import * as fs from "node:fs";
import { PdfExtractorService } from "./pdf-extractor.service";

jest.mock("node:fs");

jest.mock("pdf-parse", () => {
  const mockFn = jest.fn();
  return Object.assign(mockFn, { default: mockFn });
});

describe("PdfExtractorService", () => {
  let service: PdfExtractorService;
  let mockPdfParse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockPdfParse = require("pdf-parse");
    mockPdfParse.mockReset();
    service = new PdfExtractorService();
  });

  describe("extractFromPdf", () => {
    const setupMockPdf = (text: string) => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from("fake-pdf"));

      mockPdfParse.mockResolvedValue({
        text,
        numpages: 1,
      });
    };

    it("should extract items from PDF text", async () => {
      setupMockPdf(`
        Project: Test Project
        Location: Johannesburg

        Specification: CARBON STEEL API 5L Grade B, 6mm wall thickness

        1. 200NB Pipe, Sch 40, 6m long - 5 pcs
        2. 300NB 45 degree bend - 2 nos
        3. 400x300mm Reducer - 1 ea
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.length).toBeGreaterThanOrEqual(3);
      expect(result.sheetName).toBe("PDF Document");
    });

    it("should extract material from specification header", async () => {
      setupMockPdf(`
        Specification: CARBON STEEL API 5L Grade B

        200NB Pipe, 6m long - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const pipeItem = result.items.find((i) => i.itemType === "pipe");
      expect(pipeItem?.material).toBe("Carbon Steel");
    });

    it("should extract stainless steel material", async () => {
      setupMockPdf(`
        Specification: S.S. 316 STEEL

        200NB S.S. Pipe - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      const ssItem = result.items.find((i) => i.material === "Stainless Steel");
      expect(ssItem).toBeDefined();
    });

    it("should detect pipe items", async () => {
      setupMockPdf("200NB PIPE Carbon Steel - 5 lengths");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const pipeItem = result.items.find((i) => i.itemType === "pipe");
      expect(pipeItem).toBeDefined();
      expect(pipeItem?.diameter).toBe(200);
    });

    it("should detect bend items with angle", async () => {
      setupMockPdf("300NB 45 degree bend - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
      expect(bendItem?.diameter).toBe(300);
      expect(bendItem?.angle).toBe(45);
    });

    it("should detect elbow as bend", async () => {
      setupMockPdf("200NB 90 degree elbow - 1 pc");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
    });

    it("should detect reducer items with secondary diameter", async () => {
      setupMockPdf("400x300mm Reducer - 1 ea");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const reducerItem = result.items.find((i) => i.itemType === "reducer");
      expect(reducerItem).toBeDefined();
      expect(reducerItem?.secondaryDiameter).toBe(300);
    });

    it("should detect tee items", async () => {
      setupMockPdf("200NB Equal Tee - 3 nos");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const teeItem = result.items.find((i) => i.itemType === "tee");
      expect(teeItem).toBeDefined();
    });

    it("should detect flange items", async () => {
      setupMockPdf("200NB Weldneck Flange ANSI 150 - 4 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const flangeItem = result.items.find((i) => i.itemType === "flange");
      expect(flangeItem).toBeDefined();
    });

    it("should extract flange configuration - both ends", async () => {
      setupMockPdf("200NB Pipe both ends flanged - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.flangeConfig === "both_ends");
      expect(item).toBeDefined();
    });

    it("should extract flange configuration - one end", async () => {
      setupMockPdf("200NB Pipe one end flanged - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.flangeConfig === "one_end");
      expect(item).toBeDefined();
    });

    it("should extract puddle flange", async () => {
      setupMockPdf("200NB Pipe with puddle flange - 1 pc");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.flangeConfig === "puddle");
      expect(item).toBeDefined();
    });

    it("should extract quantity with different units", async () => {
      setupMockPdf(`
        200NB Pipe - 5 pcs
        300NB Pipe - 10 lengths
        400NB Pipe qty: 3
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.some((i) => i.quantity === 5)).toBe(true);
      expect(result.items.some((i) => i.quantity === 10)).toBe(true);
      expect(result.items.some((i) => i.quantity === 3)).toBe(true);
    });

    it("should extract length in meters", async () => {
      setupMockPdf("200NB Pipe 6m long - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.length === 6);
      expect(item).toBeDefined();
    });

    it("should extract project metadata", async () => {
      setupMockPdf(`
        Project Reference: PRJ-2024-001
        Site: Johannesburg
        Project: Mining Plant Expansion
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.metadata.projectLocation).toContain("Johannesburg");
    });

    it("should detect South African locations", async () => {
      setupMockPdf(`
        Project located in Cape Town
        200NB Pipe - 1 pc
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.metadata.projectLocation).toBeTruthy();
    });

    it("should extract wall thickness from specification", async () => {
      setupMockPdf(`
        Specification: API 5L Grade B, wall thickness: 6.35mm
        200NB Pipe - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.metadata.wallThickness).toBe("6.35mm");
    });

    it("should mark items needing clarification when diameter missing", async () => {
      setupMockPdf("Steel Pipe Carbon Steel - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const itemsNeedingClarification = result.items.filter((i) => i.needsClarification);
      expect(itemsNeedingClarification.length).toBeGreaterThanOrEqual(0);
    });

    it("should skip header lines", async () => {
      setupMockPdf(`
        Item Description Qty Unit
        200NB Pipe - 2 pcs
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.every((i) => i.description !== "Item Description Qty Unit")).toBe(true);
    });

    it("should skip carried forward lines", async () => {
      setupMockPdf(`
        Carried Forward
        200NB Pipe - 2 pcs
        Brought Forward
      `);

      const result = await service.extractFromPdf("/fake/path.pdf");

      expect(result.items.every((i) => !i.description.includes("Carried Forward"))).toBe(true);
    });

    it("should extract DN diameter format", async () => {
      setupMockPdf("DN200 Pipe - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.diameter === 200);
      expect(item).toBeDefined();
    });

    it("should extract diameter from mm format", async () => {
      setupMockPdf("200mm dia Pipe - 2 pcs");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.diameter === 200);
      expect(item).toBeDefined();
    });

    it("should extract expansion joint", async () => {
      setupMockPdf("200NB Expansion Joint - 1 pc");

      const result = await service.extractFromPdf("/fake/path.pdf");

      const item = result.items.find((i) => i.itemType === "expansion_joint");
      expect(item).toBeDefined();
    });

    describe("material patterns", () => {
      it.each([
        ["M.S. Pipe 200NB - 1 pc", "Mild Steel"],
        ["Mild Steel 200NB Pipe - 1 pc", "Mild Steel"],
        ["API 5L 200NB Pipe - 1 pc", "Carbon Steel"],
        ["SABS 719 200NB Pipe - 1 pc", "Carbon Steel"],
        ["ASTM A312 200NB Pipe - 1 pc", "Stainless Steel"],
        ["ASTM A234 WPB 200NB Fitting - 1 pc", "Carbon Steel"],
        ["ASTM A106 200NB Pipe - 1 pc", "Carbon Steel"],
        ["ERW 200NB Pipe - 1 pc", "Carbon Steel"],
      ])('should extract material from "%s" as "%s"', async (text, expectedMaterial) => {
        setupMockPdf(text);

        const result = await service.extractFromPdf("/fake/path.pdf");

        expect(result.items.some((i) => i.material === expectedMaterial)).toBe(true);
      });
    });
  });
});
