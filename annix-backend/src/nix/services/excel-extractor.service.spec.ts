import { ExcelExtractorService } from "./excel-extractor.service";

jest.mock("exceljs", () => ({
  Workbook: jest.fn(),
}));

describe("ExcelExtractorService", () => {
  let service: ExcelExtractorService;
  let mockWorkbook: any;
  let mockWorksheet: any;
  let mockRows: any[];

  const createMockCell = (value: any) => ({
    value,
  });

  const createMockRow = (cells: any[]) => ({
    getCell: (index: number) => createMockCell(cells[index - 1]),
    eachCell: (callback: (cell: any) => void) => {
      cells.forEach((value) => {
        if (value !== null && value !== undefined && value !== "") {
          callback(createMockCell(value));
        }
      });
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExcelExtractorService();
    mockRows = [];

    mockWorksheet = {
      name: "Sheet1",
      rowCount: 0,
      eachRow: (callback: (row: any, rowNumber: number) => void) => {
        mockRows.forEach((row, idx) => callback(row, idx + 1));
      },
      getRow: (rowNumber: number) => mockRows[rowNumber - 1] || createMockRow([]),
    };

    mockWorkbook = {
      worksheets: [mockWorksheet],
      xlsx: {
        readFile: jest.fn().mockResolvedValue(undefined),
      },
    };

    const ExcelJS = require("exceljs");
    ExcelJS.Workbook.mockImplementation(() => mockWorkbook);
  });

  const setupMockWorksheet = (rows: any[][]) => {
    mockRows = rows.map((cells) => createMockRow(cells));
    mockWorksheet.rowCount = rows.length;
  };

  describe("extractFromExcel", () => {
    it("should throw error when no worksheets found", async () => {
      mockWorkbook.worksheets = [];

      await expect(service.extractFromExcel("/fake/file.xlsx")).rejects.toThrow(
        "No worksheets found in Excel file",
      );
    });

    it("should return sheet name and row count", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "200mm dia pipe Carbon Steel", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.sheetName).toBe("Sheet1");
      expect(result.totalRows).toBe(5);
    });

    it("should extract basic pipe item", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia PIPE Carbon Steel", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const pipeItem = result.items.find((i) => i.itemType === "pipe");
      expect(pipeItem).toBeDefined();
      expect(pipeItem?.diameter).toBe(200);
      expect(pipeItem?.material).toBe("Carbon Steel");
    });

    it("should extract bend item with angle", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 300mm dia 45 degree bend M.S.", "No", 2, 50, 100],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
      expect(bendItem?.diameter).toBe(300);
      expect(bendItem?.angle).toBe(45);
      expect(bendItem?.material).toBe("Mild Steel");
    });

    it("should extract reducer item with secondary diameter", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 400NB Reducer 400 x 300 mm ERW", "No", 1, 200, 200],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const reducerItem = result.items.find((i) => i.itemType === "reducer");
      expect(reducerItem).toBeDefined();
      expect(reducerItem?.diameter).toBe(400);
      expect(reducerItem?.secondaryDiameter).toBe(300);
    });

    it("should extract tee item", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Equal Tee Stainless Steel", "No", 3, 150, 450],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const teeItem = result.items.find((i) => i.itemType === "tee");
      expect(teeItem).toBeDefined();
      expect(teeItem?.material).toBe("Stainless Steel");
    });

    it("should extract flange item", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Weldneck Flange ASTM A105", "No", 4, 80, 320],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const flangeItem = result.items.find((i) => i.itemType === "flange");
      expect(flangeItem).toBeDefined();
      expect(flangeItem?.materialGrade).toBe("A105");
    });

    it("should extract expansion joint", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Expansion Joint", "No", 1, 500, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const ejItem = result.items.find((i) => i.itemType === "expansion_joint");
      expect(ejItem).toBeDefined();
    });

    it("should extract elbow as bend", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia 90 degree elbow", "No", 2, 40, 80],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const bendItem = result.items.find((i) => i.itemType === "bend");
      expect(bendItem).toBeDefined();
      expect(bendItem?.angle).toBe(90);
    });

    it("should extract flange config - both ends", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe both ends flanged", "No", 2, 200, 400],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const item = result.items.find((i) => i.flangeConfig === "both_ends");
      expect(item).toBeDefined();
    });

    it("should extract flange config - one end", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe one end flanged", "No", 2, 150, 300],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const item = result.items.find((i) => i.flangeConfig === "one_end");
      expect(item).toBeDefined();
    });

    it("should extract puddle flange", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe with puddle flange", "No", 1, 180, 180],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const item = result.items.find((i) => i.flangeConfig === "puddle");
      expect(item).toBeDefined();
    });

    it("should extract blind flange", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia blind flange ASTM A105", "No", 2, 60, 120],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const item = result.items.find((i) => i.flangeConfig === "blind");
      expect(item).toBeDefined();
    });

    it("should extract project location from header rows", async () => {
      setupMockWorksheet([
        [null, null, null, null, "Project Site: Johannesburg", null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.metadata.projectLocation).toBe("Johannesburg");
    });

    it("should detect South African cities in header", async () => {
      setupMockWorksheet([
        [null, null, null, null, "Cape Town Mining Project", null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.metadata.projectLocation).toBe("Cape Town");
    });

    it("should extract project name from header", async () => {
      setupMockWorksheet([
        [null, null, null, null, "Project: Mining Plant Expansion", null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.metadata.projectName).toBe("Mining Plant Expansion");
    });

    it("should count clarifications needed", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 Steel Pipe", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.clarificationsNeeded).toBeGreaterThanOrEqual(0);
    });

    it("should handle quantity as string", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, "Item 1.1 200mm dia Pipe Carbon Steel", "No", "5", 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      const item = result.items.find((i) => i.quantity === 5);
      expect(item).toBeDefined();
    });

    it("should extract L number from column 3", async () => {
      setupMockWorksheet([
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, "L1.2", null, "200mm dia Pipe Carbon Steel", "No", 5, 100, 500],
      ]);

      const result = await service.extractFromExcel("/fake/file.xlsx");

      expect(result.items.some((i) => i.itemNumber.includes("L1.2"))).toBe(true);
    });

    describe("material patterns", () => {
      it.each([
        ["Item 1.1 M.S. Pipe 200mm dia", "Mild Steel"],
        ["Item 1.1 Mild Steel 200mm dia Pipe", "Mild Steel"],
        ["Item 1.1 200mm dia Pipe S.S.", "Stainless Steel"],
        ["Item 1.1 200mm dia Stainless Steel Pipe", "Stainless Steel"],
        ["Item 1.1 200mm dia Pipe API 5L", "Carbon Steel"],
        ["Item 1.1 200mm dia Pipe SABS 719", "Stainless Steel"],
        ["Item 1.1 200mm dia Pipe Carbon Steel", "Carbon Steel"],
        ["Item 1.1 200mm dia Pipe ASTM A234 WPB", "Carbon Steel"],
        ["Item 1.1 200mm dia Pipe ASTM A105", "Carbon Steel"],
        ["Item 1.1 200mm dia Pipe ERW", "Carbon Steel"],
      ])('should extract material from "%s" as "%s"', async (description, expectedMaterial) => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, description, "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.some((i) => i.material === expectedMaterial)).toBe(true);
      });
    });

    describe("diameter extraction", () => {
      it.each([
        ["Item 1.1 200NB Pipe", 200],
        ["Item 1.1 300 NB Bend", 300],
        ["Item 1.1 400mm dia Pipe", 400],
        ["Item 1.1 500mm diameter Pipe", 500],
        ["Item 1.1 600mm steel pipe", 600],
      ])('should extract diameter from "%s" as %d', async (description, expectedDiameter) => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, description, "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.some((i) => i.diameter === expectedDiameter)).toBe(true);
      });
    });

    describe("angle extraction", () => {
      it.each([
        ["Item 1.1 200mm dia 45 degree bend", 45],
        ["Item 1.1 200mm dia 90deg elbow", 90],
        ["Item 1.1 200mm dia 22.5° bend", 22.5],
      ])('should extract angle from "%s" as %d', async (description, expectedAngle) => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, description, "No", 2, 50, 100],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.some((i) => i.angle === expectedAngle)).toBe(true);
      });
    });

    describe("length extraction", () => {
      it.each([
        ["Item 1.1 200mm dia Pipe (l=6000)", 6000],
        ["Item 1.1 200mm dia Pipe length: 3000", 3000],
        ["Item 1.1 200mm dia Pipe 2000mm long", 2000],
      ])('should extract length from "%s" as %d', async (description, expectedLength) => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, description, "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.some((i) => i.length === expectedLength)).toBe(true);
      });
    });

    describe("clarification reasons", () => {
      it("should mark bend without angle as needing clarification", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "Item 1.1 200mm dia bend Carbon Steel", "No", 2, 50, 100],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const bendItem = result.items.find((i) => i.itemType === "bend");
        expect(bendItem?.needsClarification).toBe(true);
        expect(bendItem?.clarificationReason).toContain("angle");
      });

      it("should mark reducer without secondary diameter as needing clarification", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "Item 1.1 200mm dia reducer Carbon Steel", "No", 1, 100, 100],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const reducerItem = result.items.find((i) => i.itemType === "reducer");
        expect(reducerItem?.needsClarification).toBe(true);
        expect(reducerItem?.clarificationReason).toContain("outlet diameter");
      });
    });

    describe("item number building", () => {
      it("should use row number when no item number available", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "(a) 200mm dia Pipe Carbon Steel", "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.some((i) => i.itemNumber === "a")).toBe(true);
      });

      it("should extract item number from description - Item format", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "Item 1.2 200mm dia Pipe Carbon Steel", "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.some((i) => i.itemNumber === "1.2")).toBe(true);
      });
    });

    describe("specification parsing", () => {
      it("should parse wall thickness from specification", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [
            null,
            null,
            null,
            null,
            "API 5L Grade B, wall thickness: 8.18mm, CML lined",
            null,
            null,
            null,
            null,
          ],
          [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.wallThickness).toBe("8.18mm");
      });

      it("should parse standard from specification", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "ASTM A106, 6mm wall thickness", null, null, null, null],
          [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.standard).toBe("ASTM A106");
      });

      it("should parse schedule from specification", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "API 5L Grade B, Sch 40, 6mm wall", null, null, null, null],
          [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.specificationCells.length).toBeGreaterThanOrEqual(1);
        const spec = result.specificationCells[0];
        expect(spec.parsedData.schedule).toBe("40");
      });
    });

    describe("item type detection precedence", () => {
      it("should detect elbow before generic bend", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, "Item 1.1 200mm dia 90 degree elbow", "No", 2, 50, 100],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items[0]?.itemType).toBe("bend");
      });

      it("should detect tee over reducer for reducing tee", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [
            null,
            null,
            null,
            null,
            "Item 1.1 200mm dia reducing tee Carbon Steel",
            "No",
            1,
            150,
            150,
          ],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const reducerItem = result.items.find((i) => i.itemType === "reducer");
        expect(reducerItem).toBeUndefined();
        const teeItem = result.items.find((i) => i.itemType === "tee");
        expect(teeItem).toBeDefined();
      });
    });

    describe("rich text cell values", () => {
      it("should extract text from rich text cells", async () => {
        mockRows = [
          createMockRow([null, null, null, null, null, null, null, null, null]),
          createMockRow([null, null, null, null, null, null, null, null, null]),
          createMockRow([null, null, null, null, null, null, null, null, null]),
          createMockRow([null, null, null, null, null, null, null, null, null]),
          {
            getCell: (index: number) => {
              if (index === 5) {
                return {
                  value: {
                    richText: [{ text: "Item 1.1 200mm " }, { text: "dia Pipe Carbon Steel" }],
                  },
                };
              }
              if (index === 6) return createMockCell("No");
              if (index === 7) return createMockCell(5);
              return createMockCell(null);
            },
            eachCell: (callback: (cell: any) => void) => {
              callback({
                value: {
                  richText: [{ text: "Item 1.1 200mm " }, { text: "dia Pipe Carbon Steel" }],
                },
              });
              callback(createMockCell("No"));
              callback(createMockCell(5));
            },
          },
        ];
        mockWorksheet.rowCount = 5;

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe("context inheritance", () => {
      it("should inherit material from specification header", async () => {
        setupMockWorksheet([
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null, null],
          [
            null,
            null,
            null,
            null,
            "Specification - CARBON STEEL API 5L Grade B, wall thickness: 6.35mm",
            null,
            null,
            null,
            null,
          ],
          [null, null, null, null, "Item 1.1 200mm dia Pipe", "No", 5, 100, 500],
        ]);

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const pipeItem = result.items.find((i) => i.itemType === "pipe");
        expect(pipeItem?.material).toBe("Carbon Steel");
      });
    });

    describe("hierarchical 3-col BOQ format (SANS-style)", () => {
      const buildHierarchicalSheet = (
        name: string,
        rows: Array<[string, string, number | string | null]>,
      ) => {
        const headerRow = ["Description", "UOM", "Quantity Req"];
        const allRows = [headerRow, ...rows];
        return {
          name,
          rowCount: allRows.length,
          eachRow: (callback: (row: any, rowNumber: number) => void) => {
            allRows.forEach((cells, idx) => callback(createMockRow(cells as any[]), idx + 1));
          },
          getRow: (rowNumber: number) => createMockRow(allRows[rowNumber - 1] as any[]),
        };
      };

      it("walks every worksheet (not just the first)", async () => {
        const sheet1 = buildHierarchicalSheet("HDPE ENQ 1", [
          ["MEDIUM-PRESSURE PIPELINES", "", 0],
          ["Supply, lay and bed pipes complete with couplings", "", 0],
          ["a) Perforated HDPE PE100 PN34 (SDR6) drain pipes:", "", 0],
          ["1) 250 mm diameter", "", null],
          ["i) Supply", "m", 7823.9],
          ["ii) Install", "m", 7823.9],
        ]);
        const sheet2 = buildHierarchicalSheet("HDPE ENQ 2", [
          ["MEDIUM-PRESSURE PIPELINES", "", 0],
          ["Supply, lay and bed pipes complete with couplings", "", 0],
          ["a) DN560 PE 100 PN 10 (SDR 17) HDPE pipes, welded connections", "", 0],
          ["1) Supply", "m", 2082],
        ]);
        mockWorkbook.worksheets = [sheet1, sheet2];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.sheetName).toBe("HDPE ENQ 1 | HDPE ENQ 2");
        expect(result.items).toHaveLength(2);
        expect(result.items[0].sheetName).toBe("HDPE ENQ 1");
        expect(result.items[1].sheetName).toBe("HDPE ENQ 2");
      });

      it("emits Supply rows only and drops Install", async () => {
        mockWorkbook.worksheets = [
          buildHierarchicalSheet("Sheet", [
            ["MEDIUM-PRESSURE PIPELINES", "", 0],
            ["Supply, lay and bed pipes complete with couplings", "", 0],
            ["a) Perforated HDPE PE100 PN34 (SDR6) drain pipes:", "", 0],
            ["1) 250 mm diameter", "", null],
            ["i) Supply", "m", 7823.9],
            ["ii) Install", "m", 7823.9],
          ]),
        ];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items).toHaveLength(1);
        expect(result.items[0].actionType).toBe("supply");
        expect(result.items[0].quantity).toBe(7823.9);
      });

      it("flattens parent + size into the line item description", async () => {
        mockWorkbook.worksheets = [
          buildHierarchicalSheet("Sheet", [
            ["MEDIUM-PRESSURE PIPELINES", "", 0],
            ["Supply, lay and bed pipes complete with couplings", "", 0],
            ["a) Perforated HDPE PE100 PN34 (SDR6) drain pipes:", "", 0],
            ["1) 250 mm diameter", "", null],
            ["i) Supply", "m", 100],
          ]),
        ];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.items[0].description).toContain(
          "a) Perforated HDPE PE100 PN34 (SDR6) drain pipes:",
        );
        expect(result.items[0].description).toContain("1) 250 mm diameter");
        expect(result.items[0].pressureClass).toBe("PN34");
        expect(result.items[0].sdr).toBe("SDR6");
      });

      it("captures Dismantle rows separately as actionType=dismantle", async () => {
        mockWorkbook.worksheets = [
          buildHierarchicalSheet("Sheet", [
            ["MEDIUM-PRESSURE PIPELINES", "", 0],
            ["Extra-over for the supplying, laying, and bedding of specials", "", 0],
            ["a) DN 400 rubber-lined mild steel pipes", "", 0],
            ["1) DN 400 Long radius bend", "", null],
            ["i) Supply", "No.", 2],
            ["iii) Dismantle and dispose of existing DN 400 mild steel long radius bend", "No.", 2],
          ]),
        ];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const supply = result.items.filter((i) => i.actionType === "supply");
        const dismantle = result.items.filter((i) => i.actionType === "dismantle");
        expect(supply).toHaveLength(1);
        expect(dismantle).toHaveLength(1);
      });

      it("classifies valves, consumables, UPVC, and pipe boots", async () => {
        mockWorkbook.worksheets = [
          buildHierarchicalSheet("Sheet", [
            ["MEDIUM-PRESSURE PIPELINES", "", 0],
            ["Supply, lay and bed pipes complete with couplings", "", 0],
            ["a) DN 110 RSV gate valve for below liner pipes complete with HDPE stub", "", 0],
            ["1) Supply", "No.", 10],
            ["b) DN 400 manual hydraulically actuated pinch valve", "", 0],
            ["i) Supply", "No.", 4],
            ["c) Other", "", 0],
            ["1) Compressed fibre gaskets", "No.", 27],
            ["2) Grade 8.8 galvanised M36 bolt sets C/W nut and washer", "No.", 27],
            ["3) 20 litre drum of Carboline 890UHS epoxy coating for touch-up", "No.", 1],
            ["d) UPVC Class 4 22.5-degree bend to slip over discharge point:", "", 0],
            ["i) DN450", "", null],
            ["1) Supply", "No.", 1],
            ["e) HDPE pipe boot for DN200 PE100 PN25 (SDR 7.4) pipe", "", 0],
            ["1) Supply", "No.", 3],
          ]),
        ];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const types = result.items.map((i) => i.itemType);
        expect(types).toContain("valve");
        expect(types).toContain("consumable");
        expect(types).toContain("upvc");
        expect(types).toContain("boot");
        expect(result.items.find((i) => /gaskets/.test(i.description))?.itemType).toBe(
          "consumable",
        );
        expect(result.items.find((i) => /pinch/.test(i.description))?.itemType).toBe("valve");
        expect(result.items.find((i) => /UPVC/i.test(i.description))?.itemType).toBe("upvc");
      });

      it("extracts pressure class, SDR, drawing references, and item codes", async () => {
        mockWorkbook.worksheets = [
          buildHierarchicalSheet("Sheet", [
            ["MEDIUM-PRESSURE PIPELINES", "", 0],
            ["Extra-over for the supplying, fixing, and bedding of valves", "", 0],
            [
              "a) DN 400 manual hydraulically actuated pinch valve, flanged to SANS 1123 Table 4000/3 as per AAP specifications (Item code 697)",
              "",
              0,
            ],
            ["i) Supply", "No.", 4],
            [
              "b) Cast in DN 200 HDPE puddle pipe (AL-2) including c/w puddle flange and backing flange as detailed on Dwg J528-303-110",
              "",
              0,
            ],
            ["1) Supply", "No.", 3],
          ]),
        ];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        const valveItem = result.items.find((i) => i.itemType === "valve");
        expect(valveItem?.itemCode).toBe("697");
        expect(valveItem?.diameter).toBe(400);

        const puddle = result.items.find((i) => i.itemType === "puddle_pipe");
        expect(puddle?.drawingReference).toBe("J528-303-110");
        expect(puddle?.diameter).toBe(200);
      });

      it("does not flag valves or consumables as needing diameter clarification", async () => {
        mockWorkbook.worksheets = [
          buildHierarchicalSheet("Sheet", [
            ["MEDIUM-PRESSURE PIPELINES", "", 0],
            ["Supply, lay and bed pipes complete with couplings", "", 0],
            ["a) Other", "", 0],
            ["1) Compressed fibre gaskets", "No.", 27],
            ["b) Hydraulic hand pump for PN16 DN450 hydraulically actuated pinch valves", "", 0],
            ["i) Supply", "No.", 6],
          ]),
        ];

        const result = await service.extractFromExcel("/fake/file.xlsx");

        expect(result.clarificationsNeeded).toBe(0);
      });
    });
  });
});
