import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";

export interface ExtractedItem {
  rowNumber: number;
  itemNumber: string;
  description: string;
  itemType: "pipe" | "bend" | "reducer" | "tee" | "flange" | "expansion_joint" | "unknown";
  material: string | null;
  materialGrade: string | null;
  diameter: number | null;
  diameterUnit: "mm" | "inch";
  secondaryDiameter: number | null;
  length: number | null;
  wallThickness: number | null;
  schedule: string | null;
  angle: number | null;
  flangeConfig: "none" | "one_end" | "both_ends" | "puddle" | "blind" | null;
  quantity: number;
  unit: string;
  confidence: number;
  needsClarification: boolean;
  clarificationReason: string | null;
  rawData: Record<string, any>;
}

export interface SpecificationCellData {
  cellRef: string;
  rowNumber: number;
  rawText: string;
  parsedData: {
    materialGrade: string | null;
    wallThickness: string | null;
    lining: string | null;
    externalCoating: string | null;
    standard: string | null;
    schedule: string | null;
  };
}

export interface ExtractionResult {
  sheetName: string;
  totalRows: number;
  items: ExtractedItem[];
  clarificationsNeeded: number;
  specificationCells: SpecificationCellData[];
  metadata: {
    projectReference: string | null;
    projectLocation: string | null;
    projectName: string | null;
    standard: string | null;
    coating: string | null;
    lining: string | null;
    materialGrade: string | null;
    wallThickness: string | null;
  };
}

@Injectable()
export class ExcelExtractorService {
  private readonly logger = new Logger(ExcelExtractorService.name);

  private readonly materialPatterns = [
    {
      pattern: /\bS\.?S\.?\b|\bstainless\s*steel\b/i,
      material: "Stainless Steel",
      grade: "316",
    },
    {
      pattern: /\bM\.?S\.?\b|\bmild\s*steel\b/i,
      material: "Mild Steel",
      grade: null,
    },
    {
      pattern: /\bAPI\s*5L[-\s]?[A-Z]?\b/i,
      material: "Carbon Steel",
      grade: "API 5L",
    },
    {
      pattern: /\bSABS\s*719\b/i,
      material: "Stainless Steel",
      grade: "SABS 719",
    },
    { pattern: /\bcarbon\s*steel\b/i, material: "Carbon Steel", grade: null },
    {
      pattern: /\bASTM\s*A234\s*WPB\b/i,
      material: "Carbon Steel",
      grade: "A234 WPB",
    },
    { pattern: /\bASTM\s*A105\b/i, material: "Carbon Steel", grade: "A105" },
    { pattern: /\bERW\b/i, material: "Carbon Steel", grade: "ERW" },
  ];

  private readonly itemTypePatterns = [
    { pattern: /\belbow\b/i, type: "bend" as const },
    { pattern: /\bs[-\s]?bend\b/i, type: "bend" as const },
    { pattern: /\bbend\b|\bdeg\b|\bdegree\b/i, type: "bend" as const },
    {
      pattern: /\breducer\b|\breducing\b(?!\s*tee)/i,
      type: "reducer" as const,
    },
    { pattern: /\btee\b/i, type: "tee" as const },
    { pattern: /\bflange\b(?!.*gasket)/i, type: "flange" as const },
    { pattern: /\bexpansion\s*joint\b/i, type: "expansion_joint" as const },
    { pattern: /\b\d+\s*NB\s+PIPE\b/i, type: "pipe" as const },
    { pattern: /\bpipe\b|\bdia\s*pipe\b/i, type: "pipe" as const },
    { pattern: /\d+\s*mm\s*(steel|stainless)/i, type: "pipe" as const },
  ];

  private readonly flangePatterns = [
    {
      pattern:
        /\bboth\s*ends?\s*flange[d]?\b|\bfully\s*flange[d]?\b|\bflange[d]?\s*both\s*ends?\b/i,
      config: "both_ends" as const,
    },
    {
      pattern: /\bone\s*end\s*flange[d]?\b|\bflange[d]?\s*one\s*end\b/i,
      config: "one_end" as const,
    },
    { pattern: /\bno\s*flange[s]?\b/i, config: "none" as const },
    {
      pattern: /\bpuddle\s*flange\b|\bpaddle\s*flange\b/i,
      config: "puddle" as const,
    },
    { pattern: /\bblind\s*flange\b/i, config: "blind" as const },
  ];

  async extractFromExcel(filePath: string): Promise<ExtractionResult> {
    this.logger.log(`Extracting from Excel: ${filePath}`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("No worksheets found in Excel file");
    }

    const specificationCells = this.extractSpecificationCells(worksheet);
    this.logger.log(`📋 Found ${specificationCells.length} specification header(s)`);

    const specDefaults = this.consolidateSpecificationData(specificationCells);
    this.logger.log(
      `📋 Consolidated spec data - Material Type: ${specDefaults.material}, Grade: ${specDefaults.materialGrade}, Wall: ${specDefaults.wallThickness} (${specDefaults.wallThicknessNum}mm), Lining: ${specDefaults.lining}, Coating: ${specDefaults.externalCoating}`,
    );

    const items: ExtractedItem[] = [];
    const currentContext: {
      material: string | null;
      materialGrade: string | null;
      standard: string | null;
      coating: string | null;
      wallThickness: number | null;
      lining: string | null;
    } = {
      material: specDefaults.material,
      materialGrade: specDefaults.materialGrade,
      standard: specDefaults.standard,
      coating: specDefaults.externalCoating,
      wallThickness: specDefaults.wallThicknessNum,
      lining: specDefaults.lining,
    };

    let projectReference: string | null = null;
    let projectLocation: string | null = null;
    let projectName: string | null = null;
    let currentDescription: string | null = null;
    let currentDescriptionRow: number | null = null;
    let currentSpecHeader: string | null = null;
    let currentLNumber: string | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 10) {
        const headerText = this.extractHeaderText(row);
        if (headerText) {
          const locationMatch = headerText.match(
            /(?:site|location|project\s+site|address)[:\s]+(.+)/i,
          );
          if (locationMatch && !projectLocation) {
            projectLocation = locationMatch[1].trim();
            this.logger.debug(`📍 Found project location: ${projectLocation}`);
          }

          const projectMatch = headerText.match(/(?:project|contract|tender)[:\s]+(.+)/i);
          if (projectMatch && !projectName) {
            projectName = projectMatch[1].trim();
            this.logger.debug(`📋 Found project name: ${projectName}`);
          }

          const locationPatterns = [
            /\b(johannesburg|pretoria|cape\s*town|durban|port\s*elizabeth|bloemfontein|east\s*london|kimberley|polokwane|nelspruit|rustenburg|potchefstroom|vereeniging|welkom|pietermaritzburg|richards\s*bay|midrand|sandton|centurion)\b/i,
            /\b(gauteng|western\s*cape|kwazulu[\s-]*natal|eastern\s*cape|free\s*state|mpumalanga|limpopo|north\s*west|northern\s*cape)\b/i,
          ];
          for (const pattern of locationPatterns) {
            const match = headerText.match(pattern);
            if (match && !projectLocation) {
              projectLocation = match[1].trim();
              this.logger.debug(`📍 Found location from city/province: ${projectLocation}`);
              break;
            }
          }
        }
      }

      if (rowNumber <= 4) return;

      const rowData = this.extractRowData(row);
      const description = rowData.description?.toString() || "";

      const col3Value = row.getCell(3).value?.toString().trim() || "";
      const lNumberMatch = col3Value.match(/^L\d+(?:\.\d+)?$/i);
      if (lNumberMatch) {
        currentLNumber = lNumberMatch[0].toUpperCase();
        this.logger.debug(`📋 Found L number at row ${rowNumber}: ${currentLNumber}`);
      }

      if (!description || description.trim().length < 3) return;

      const isSpecificationHeader =
        /^SP\d+\s+Specification\s*[-–]\s*/i.test(description.trim()) ||
        /^(Bill|Section)\s+\d+.*Specification/i.test(description.trim()) ||
        /Specification\s*[-–]\s*(CARBON|STAINLESS|MILD)\s*STEEL/i.test(description);

      if (isSpecificationHeader) {
        currentSpecHeader = description.trim();
        this.logger.log(
          `📋 Found specification header at row ${rowNumber}: ${description.substring(0, 80)}`,
        );
      }

      const contextUpdate = this.extractContextFromDescription(description);
      if (contextUpdate.material) {
        currentContext.material = contextUpdate.material;
        currentContext.materialGrade = contextUpdate.materialGrade;
        this.logger.debug(
          `📋 Context updated - Material: ${contextUpdate.material}, Grade: ${contextUpdate.materialGrade}`,
        );
      }
      if (contextUpdate.standard) currentContext.standard = contextUpdate.standard;
      if (contextUpdate.coating) currentContext.coating = contextUpdate.coating;
      if (contextUpdate.wallThickness) currentContext.wallThickness = contextUpdate.wallThickness;
      if (contextUpdate.lining) currentContext.lining = contextUpdate.lining;

      if (rowData.paymentReference && !projectReference) {
        projectReference = rowData.paymentReference.toString();
      }

      if (rowData._isDescriptionRow) {
        const descText = description.trim();
        const hasDiameter = /\d+\s*(NB|mm|dia)/i.test(descText);
        if (hasDiameter && !/^(Carried|Brought)\s+(Forward|Back)/i.test(descText)) {
          currentDescription = descText;
          currentDescriptionRow = rowNumber;
          this.logger.debug(
            `Found item description row ${rowNumber}: ${descText.substring(0, 60)}...`,
          );
        }
        return;
      }

      if (rowData._isQuantityRow && currentDescription) {
        const actionType = description.toLowerCase();
        if (actionType === "supply") {
          const itemData = {
            ...rowData,
            description: currentDescription,
          };
          const item = this.extractItemFromRow(
            currentDescriptionRow || rowNumber,
            itemData,
            currentDescription,
            currentContext,
            currentSpecHeader,
            currentLNumber,
          );
          if (item) {
            items.push(item);
            this.logger.debug(
              `Extracted item from row ${currentDescriptionRow}: ${item.itemType} ${item.diameter}mm (${item.material || "no material"})`,
            );
          }
        }
        return;
      }

      const isLineItem = this.isLineItem(rowData, description);
      if (!isLineItem) return;

      const item = this.extractItemFromRow(
        rowNumber,
        rowData,
        description,
        currentContext,
        currentSpecHeader,
        currentLNumber,
      );
      if (item) {
        items.push(item);
      }
    });

    const clarificationsNeeded = items.filter((i) => i.needsClarification).length;

    return {
      sheetName: worksheet.name,
      totalRows: worksheet.rowCount,
      items,
      clarificationsNeeded,
      specificationCells,
      metadata: {
        projectReference,
        projectLocation,
        projectName,
        standard: currentContext.standard,
        coating: currentContext.coating,
        lining: currentContext.lining,
        materialGrade: currentContext.materialGrade,
        wallThickness: specDefaults.wallThickness,
      },
    };
  }

  private extractSpecificationCells(worksheet: ExcelJS.Worksheet): SpecificationCellData[] {
    const specCells: SpecificationCellData[] = [];

    const specHeaderPatterns = [
      /^SP\d+\s+Specification\s*[-–:]/i,
      /^(Bill|Section)\s+\d+.*Specification/i,
      /Specification\s*[-–:]\s*(CARBON|STAINLESS|MILD)\s*STEEL/i,
      /SPECIFICATION\s*FOR\s*(PIPES?|STEEL|CARBON|STAINLESS)/i,
      /MATERIAL\s*SPECIFICATION/i,
      /PIPE\s*SPECIFICATION/i,
      /STEEL\s*SPECIFICATION/i,
    ];

    const specDataPatterns = [
      /\b(API\s*5L|SABS\s*\d+|ASTM\s*A\d+|EN\s*\d+)\b/i,
      /\bGrade\s*[A-Z0-9]+\b/i,
      /\b\d+(?:\.\d+)?\s*mm\s*(?:wall|thick|wt)\b/i,
      /\bwall\s*(?:thickness)?[:\s]*\d+/i,
      /\b(CML|cement\s*mortar|epoxy)\s*(?:lin(?:ed|ing))?\b/i,
      /\b(?:internal\s*)?lin(?:ed|ing)[:\s]/i,
      /\b(?:external\s*)?coat(?:ed|ing)[:\s]/i,
      /\b(polyurethane|bitumen|galvani[sz]ed)\s*(?:coat(?:ed|ing))?\b/i,
      /\bSch(?:edule)?\.?\s*\d+/i,
    ];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 20) return;

      const rowText = this.extractFullRowText(row);
      if (rowText.length < 15) return;

      const isSpecHeader = specHeaderPatterns.some((pattern) => pattern.test(rowText));

      const specDataMatches = specDataPatterns.filter((pattern) => pattern.test(rowText)).length;
      const hasSpecData = specDataMatches >= 2;

      if ((isSpecHeader || hasSpecData) && rowText.length > 10) {
        this.logger.log(
          `📋 Found specification data at row ${rowNumber} (matches: ${specDataMatches}): ${rowText.substring(0, 150)}...`,
        );

        const parsed = this.parseSpecificationText(rowText);

        const hasMeaningfulData =
          parsed.materialGrade ||
          parsed.wallThickness ||
          parsed.lining ||
          parsed.externalCoating ||
          parsed.standard;

        if (hasMeaningfulData) {
          specCells.push({
            cellRef: `Row${rowNumber}`,
            rowNumber: rowNumber,
            rawText: rowText,
            parsedData: parsed,
          });
        }
      }
    });

    for (const targetRow of [4, 9]) {
      const alreadyFound = specCells.some((sc) => sc.rowNumber === targetRow);
      if (!alreadyFound) {
        const row = worksheet.getRow(targetRow);
        const cell = row.getCell(5);
        const cellText = this.getCellText(cell);

        if (cellText && cellText.length > 15) {
          const parsed = this.parseSpecificationText(cellText);
          const hasMeaningfulData =
            parsed.materialGrade ||
            parsed.wallThickness ||
            parsed.lining ||
            parsed.externalCoating ||
            parsed.standard;

          if (hasMeaningfulData) {
            this.logger.log(
              `📋 Found specification in cell E${targetRow}: ${cellText.substring(0, 150)}...`,
            );
            specCells.push({
              cellRef: `E${targetRow}`,
              rowNumber: targetRow,
              rawText: cellText,
              parsedData: parsed,
            });
          }
        }
      }
    }

    return specCells;
  }

  private extractFullRowText(row: ExcelJS.Row): string {
    const texts: string[] = [];
    row.eachCell((cell) => {
      const text = this.getCellText(cell);
      if (text && text.trim().length > 0) {
        texts.push(text.trim());
      }
    });
    return texts.join(" ");
  }

  private consolidateSpecificationData(specCells: SpecificationCellData[]): {
    material: string | null;
    materialGrade: string | null;
    wallThickness: string | null;
    wallThicknessNum: number | null;
    lining: string | null;
    externalCoating: string | null;
    standard: string | null;
    schedule: string | null;
  } {
    const result = {
      material: null as string | null,
      materialGrade: null as string | null,
      wallThickness: null as string | null,
      wallThicknessNum: null as number | null,
      lining: null as string | null,
      externalCoating: null as string | null,
      standard: null as string | null,
      schedule: null as string | null,
    };

    for (const specCell of specCells) {
      const parsed = specCell.parsedData;

      if (parsed.materialGrade && !result.materialGrade) {
        result.materialGrade = parsed.materialGrade;
        const rawText = specCell.rawText.toLowerCase();
        if (rawText.includes("stainless") || rawText.includes("s.s") || rawText.includes("ss ")) {
          result.material = "Stainless Steel";
        } else if (
          rawText.includes("carbon") ||
          rawText.includes("mild") ||
          rawText.includes("m.s")
        ) {
          result.material = "Carbon Steel";
        } else if (rawText.includes("api") || rawText.includes("erw")) {
          result.material = "Carbon Steel";
        }
      }

      if (parsed.wallThickness && !result.wallThickness) {
        result.wallThickness = parsed.wallThickness;
        const thicknessNum = parseFloat(parsed.wallThickness.replace(/[^\d.]/g, ""));
        if (!Number.isNaN(thicknessNum)) {
          result.wallThicknessNum = thicknessNum;
        }
      }

      if (parsed.lining && !result.lining) {
        result.lining = parsed.lining;
      }

      if (parsed.externalCoating && !result.externalCoating) {
        result.externalCoating = parsed.externalCoating;
      }

      if (parsed.standard && !result.standard) {
        result.standard = parsed.standard;
      }

      if (parsed.schedule && !result.schedule) {
        result.schedule = parsed.schedule;
      }
    }

    return result;
  }

  private getCellText(cell: ExcelJS.Cell): string {
    const value = cell.value;
    if (!value) return "";

    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();

    if (typeof value === "object") {
      if ("text" in value) return (value as any).text;
      if ("richText" in value) {
        const richText = (value as any).richText as Array<{ text: string }>;
        return richText.map((rt) => rt.text).join("");
      }
      if ("result" in value) return (value as any).result?.toString() || "";
    }

    return value.toString();
  }

  private parseSpecificationText(text: string): SpecificationCellData["parsedData"] {
    const result: SpecificationCellData["parsedData"] = {
      materialGrade: null,
      wallThickness: null,
      lining: null,
      externalCoating: null,
      standard: null,
      schedule: null,
    };

    const gradePatterns = [
      /(?:Grade|Gr\.?)\s*([A-Z0-9]+)/i,
      /API\s*5L\s*(?:Grade\s*)?([A-Z])/i,
      /ASTM\s*A\d+\s*(?:Grade\s*)?([A-Z0-9]+)/i,
      /\b([A-Z]\d{2,3}[A-Z]?)\b/,
      /\bX?(\d{2,3})\s*Grade/i,
    ];

    for (const pattern of gradePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.materialGrade = match[1] || match[0];
        this.logger.debug(`  Found material grade: ${result.materialGrade}`);
        break;
      }
    }

    const wallPatterns = [
      /wall\s*(?:thickness)?[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
      /(\d+(?:\.\d+)?)\s*mm\s*(?:wall|thick|thk)/i,
      /wt[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
      /thickness[:\s]*(\d+(?:\.\d+)?)\s*mm/i,
    ];

    for (const pattern of wallPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.wallThickness = `${match[1]}mm`;
        this.logger.debug(`  Found wall thickness: ${result.wallThickness}`);
        break;
      }
    }

    const liningPatterns = [
      /(?:internal\s*)?(?:lining|lined)[:\s]*([^,\n]+)/i,
      /CML\s*(?:lined?|lining)?/i,
      /cement\s*(?:mortar\s*)?lin(?:ed|ing)/i,
      /epoxy\s*(?:internal\s*)?lin(?:ed|ing)/i,
      /(\d+mm\s*CML)/i,
    ];

    for (const pattern of liningPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.lining = match[1]?.trim() || match[0].trim();
        this.logger.debug(`  Found lining: ${result.lining}`);
        break;
      }
    }

    const coatingPatterns = [
      /(?:external\s*)?coating[:\s]*([^,\n]+)/i,
      /(?:ext\.?\s*)?(?:coat(?:ed|ing)?)[:\s]*([^,\n]+)/i,
      /polyurethane\s*(?:coat(?:ed|ing)?)?/i,
      /epoxy\s*(?:external\s*)?coat(?:ed|ing)?/i,
      /galvani[sz]ed/i,
      /bitumen\s*(?:coat(?:ed|ing)?)?/i,
      /paint(?:ed)?\s*(?:coat(?:ed|ing)?)?/i,
    ];

    for (const pattern of coatingPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.externalCoating = match[1]?.trim() || match[0].trim();
        this.logger.debug(`  Found external coating: ${result.externalCoating}`);
        break;
      }
    }

    const standardPatterns = [
      /\b(API\s*5L)\b/i,
      /\b(SABS\s*\d+)\b/i,
      /\b(ASTM\s*A\d+)\b/i,
      /\b(EN\s*\d+)\b/i,
      /\b(ISO\s*\d+)\b/i,
      /\b(BS\s*\d+)\b/i,
    ];

    for (const pattern of standardPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.standard = match[1].toUpperCase().replace(/\s+/g, " ");
        this.logger.debug(`  Found standard: ${result.standard}`);
        break;
      }
    }

    const schedulePatterns = [
      /(?:Sch(?:edule)?\.?)\s*(\d+[A-Z]?)/i,
      /\bS(\d+)\b/,
      /schedule[:\s]*(\d+)/i,
    ];

    for (const pattern of schedulePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.schedule = match[1];
        this.logger.debug(`  Found schedule: ${result.schedule}`);
        break;
      }
    }

    return result;
  }

  private extractHeaderText(row: ExcelJS.Row): string | null {
    const texts: string[] = [];
    row.eachCell((cell) => {
      const value = cell.value;
      if (value && typeof value === "string" && value.trim().length > 3) {
        texts.push(value.trim());
      } else if (value && typeof value === "object" && "text" in value) {
        const richText = value as { text: string };
        if (richText.text && richText.text.trim().length > 3) {
          texts.push(richText.text.trim());
        }
      }
    });
    return texts.length > 0 ? texts.join(" ") : null;
  }

  private extractRowData(row: ExcelJS.Row): Record<string, any> {
    const col1 = row.getCell(1).value;
    const col2 = row.getCell(2).value;
    const col3 = row.getCell(3).value;
    const col4 = row.getCell(4).value;
    const col5 = row.getCell(5).value;
    const col6 = row.getCell(6).value;
    const col7 = row.getCell(7).value;
    const col8 = row.getCell(8).value;
    const col9 = row.getCell(9).value;

    const col3Str = col3?.toString() || "";
    const isSupplyInstallRow = /^(Supply|Install)$/i.test(col3Str.trim());
    const isItemNoDescUnitQty = col1 !== null && typeof col1 === "number" && isSupplyInstallRow;

    if (isItemNoDescUnitQty) {
      return {
        itemNumber: col1,
        paymentReference: col2,
        description: col3,
        unit: col4,
        quantity: col5,
        rate: col6,
        total: col7,
        _isQuantityRow: true,
      };
    }

    const col1Str = col1?.toString() || "";
    const col5Str = col5?.toString() || "";
    if (col5Str.length > 3) {
      return {
        trade: col1,
        page: col2,
        itemNumber: col3,
        paymentReference: col4,
        description: col5,
        unit: col6,
        quantity: col7,
        rate: col8,
        total: col9,
      };
    }

    if (col3Str.length > 3 && col1 === null) {
      return {
        description: col3,
        unit: col4,
        quantity: col5,
        _isDescriptionRow: true,
      };
    }

    return {
      trade: col1,
      page: col2,
      itemNumber: col3,
      paymentReference: col4,
      description: col5,
      unit: col6,
      quantity: col7,
      rate: col8,
      total: col9,
    };
  }

  private extractContextFromDescription(description: string): {
    material: string | null;
    materialGrade: string | null;
    standard: string | null;
    coating: string | null;
    wallThickness: number | null;
    lining: string | null;
  } {
    const result = {
      material: null as string | null,
      materialGrade: null as string | null,
      standard: null as string | null,
      coating: null as string | null,
      wallThickness: null as number | null,
      lining: null as string | null,
    };

    const standardMatch = description.match(/\b(API\s*5L|SABS\s*\d+|ASTM\s*\w+)/i);
    if (standardMatch) {
      result.standard = standardMatch[1].toUpperCase().replace(/\s+/g, " ");
    }

    const liningPatterns = [
      /(?:internal\s*)?(?:lining|lined)[:\s]*([^,\n]+)/i,
      /CML\s*(?:lined?|lining)?/i,
      /cement\s*(?:mortar\s*)?lin(?:ed|ing)/i,
      /epoxy\s*(?:internal\s*)?lin(?:ed|ing)/i,
      /(\d+mm\s*CML)/i,
    ];

    for (const pattern of liningPatterns) {
      const match = description.match(pattern);
      if (match) {
        result.lining = match[1]?.trim() || match[0].trim();
        break;
      }
    }

    const coatingMatch = description.match(/\b(polyurethane|epoxy|bitumen|galvani[sz]ed)\b/i);
    if (coatingMatch) {
      result.coating =
        description.match(/(polyurethane\s*coating|epoxy\s*coating|bitumen|galvani[sz]ed)/i)?.[0] ||
        coatingMatch[1];
    }

    const thicknessMatch = description.match(/(\d+(?:\.\d+)?)\s*mm\s*thick/i);
    if (thicknessMatch) {
      result.wallThickness = parseFloat(thicknessMatch[1]);
    }

    for (const mp of this.materialPatterns) {
      if (mp.pattern.test(description)) {
        result.material = mp.material;
        result.materialGrade = mp.grade;
        break;
      }
    }

    return result;
  }

  private isLineItem(rowData: Record<string, any>, description: string): boolean {
    const hasQuantity =
      rowData.quantity !== null && rowData.quantity !== undefined && rowData.quantity !== "";
    const hasUnit = rowData.unit !== null && rowData.unit !== undefined && rowData.unit !== "";
    const hasDiameter = /\d+\s*mm\s*(dia|diameter)?/i.test(description);
    const hasItemRef = /item\s*\d+\.\d+/i.test(description) || /^\s*\([a-z]\)/i.test(description);

    return (hasQuantity || hasUnit) && (hasDiameter || hasItemRef);
  }

  private extractItemNumberFromDescription(description: string): string | null {
    const patterns = [
      /^Item\s+(\d+(?:\.\d+)?)/i,
      /^\(([a-z])\)/i,
      /^\((\d+)\)/,
      /^([a-z])\)/i,
      /^(\d+(?:\.\d+)?)\s*[-–)]/,
    ];

    for (const pattern of patterns) {
      const match = description.trim().match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private buildItemNumber(
    rowData: Record<string, any>,
    description: string,
    currentLNumber: string | null,
    rowNumber: number,
  ): string {
    const itemLetterOrNumber = this.extractItemNumberFromDescription(description);
    const rowDataItemNumber = rowData.itemNumber?.toString().trim();

    let baseNumber = "";

    if (rowDataItemNumber && /^L\d/i.test(rowDataItemNumber)) {
      baseNumber = rowDataItemNumber.toUpperCase();
    } else if (currentLNumber) {
      baseNumber = currentLNumber;
    }

    if (itemLetterOrNumber) {
      if (baseNumber) {
        return `${baseNumber}(${itemLetterOrNumber})`;
      }
      return itemLetterOrNumber;
    }

    if (rowDataItemNumber && !/^L\d/i.test(rowDataItemNumber)) {
      if (baseNumber) {
        return `${baseNumber}-${rowDataItemNumber}`;
      }
      return rowDataItemNumber;
    }

    if (baseNumber) {
      return baseNumber;
    }

    return `Row${rowNumber}`;
  }

  private extractItemFromRow(
    rowNumber: number,
    rowData: Record<string, any>,
    description: string,
    context: {
      material: string | null;
      materialGrade: string | null;
      standard: string | null;
      coating: string | null;
      wallThickness: number | null;
      lining: string | null;
    },
    specHeader: string | null = null,
    currentLNumber: string | null = null,
  ): ExtractedItem | null {
    const itemType = this.detectItemType(description);
    const directMaterial = this.extractMaterial(description);
    const material = directMaterial || context.material;
    const materialFromContext = !directMaterial && !!context.material;
    const materialGrade = this.extractMaterialGrade(description) || context.materialGrade;
    const diameter = this.extractDiameter(description);
    const secondaryDiameter = this.extractSecondaryDiameter(description);
    const length = this.extractLength(description);
    const angle = this.extractAngle(description);
    const flangeConfig = this.extractFlangeConfig(description);
    const quantity = this.parseQuantity(rowData.quantity);
    const itemNumber = this.buildItemNumber(rowData, description, currentLNumber, rowNumber);

    let confidence = 0.5;
    let needsClarification = false;
    let clarificationReason: string | null = null;

    if (material) confidence += 0.15;
    if (diameter) confidence += 0.15;
    if (itemType !== "unknown") confidence += 0.1;
    if (quantity > 0) confidence += 0.1;
    if (materialFromContext) confidence += 0.05;

    if (!material) {
      needsClarification = true;
      clarificationReason = "Could not determine material type from item or specification header";
      confidence -= 0.2;
    }

    if (!diameter) {
      needsClarification = true;
      clarificationReason = clarificationReason
        ? `${clarificationReason}; Could not determine pipe diameter`
        : "Could not determine pipe diameter";
      confidence -= 0.2;
    }

    if (itemType === "bend" && !angle) {
      needsClarification = true;
      clarificationReason = clarificationReason
        ? `${clarificationReason}; Could not determine bend angle`
        : "Could not determine bend angle";
    }

    if (itemType === "reducer" && !secondaryDiameter) {
      needsClarification = true;
      clarificationReason = clarificationReason
        ? `${clarificationReason}; Could not determine reducer outlet diameter`
        : "Could not determine reducer outlet diameter";
    }

    confidence = Math.max(0.1, Math.min(1.0, confidence));

    if (materialFromContext) {
      this.logger.log(
        `📦 Item ${itemNumber} (row ${rowNumber}): material="${material}" (from context), wallThickness=${context.wallThickness}mm`,
      );
    } else if (material) {
      this.logger.log(
        `📦 Item ${itemNumber} (row ${rowNumber}): material="${material}" (from description), wallThickness=${context.wallThickness}mm`,
      );
    } else {
      this.logger.log(
        `📦 Item ${itemNumber} (row ${rowNumber}): NO MATERIAL, context.material=${context.material}, wallThickness=${context.wallThickness}mm`,
      );
    }

    return {
      rowNumber,
      itemNumber,
      description: description.trim(),
      itemType,
      material,
      materialGrade,
      diameter,
      diameterUnit: "mm",
      secondaryDiameter,
      length,
      wallThickness: context.wallThickness,
      schedule: null,
      angle,
      flangeConfig,
      quantity,
      unit: rowData.unit?.toString() || "No",
      confidence,
      needsClarification,
      clarificationReason,
      rawData: rowData,
    };
  }

  private detectItemType(description: string): ExtractedItem["itemType"] {
    for (const pattern of this.itemTypePatterns) {
      if (pattern.pattern.test(description)) {
        return pattern.type;
      }
    }
    return "unknown";
  }

  private extractMaterial(description: string): string | null {
    for (const mp of this.materialPatterns) {
      if (mp.pattern.test(description)) {
        return mp.material;
      }
    }
    return null;
  }

  private extractMaterialGrade(description: string): string | null {
    const gradeMatch = description.match(/Grade\s*(\d+|X\d+)/i);
    if (gradeMatch) return gradeMatch[1];

    for (const mp of this.materialPatterns) {
      if (mp.pattern.test(description) && mp.grade) {
        return mp.grade;
      }
    }
    return null;
  }

  private extractDiameter(description: string): number | null {
    const patterns = [
      /(\d+)\s*NB\b/i,
      /(\d+)\s*mm\s*(?:dia|diameter)/i,
      /(\d+)mm\s+(?:dia|steel|pipe|bend)/i,
      /(?:^|\s)(\d{3,4})\s*mm\b/i,
      /(\d+)\s*x\s*\d+\s*mm/i,
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  }

  private extractSecondaryDiameter(description: string): number | null {
    const reducerMatch = description.match(/(\d+)\s*x\s*(\d+)\s*mm/i);
    if (reducerMatch) {
      return parseInt(reducerMatch[2], 10);
    }

    const teeMatch = description.match(/(\d+)mm\s*(?:by|x)\s*(\d+)mm/i);
    if (teeMatch) {
      return parseInt(teeMatch[2], 10);
    }

    return null;
  }

  private extractLength(description: string): number | null {
    const lengthPatterns = [
      /\((?:1|l|L)\s*=\s*(\d+)\)/i,
      /length\s*[=:]\s*(\d+)/i,
      /(\d+)mm\s*(?:long|length)/i,
    ];

    for (const pattern of lengthPatterns) {
      const match = description.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  }

  private extractAngle(description: string): number | null {
    const angleMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:deg|degree|°)/i);
    if (angleMatch) {
      return parseFloat(angleMatch[1]);
    }
    return null;
  }

  private extractFlangeConfig(description: string): ExtractedItem["flangeConfig"] {
    for (const fp of this.flangePatterns) {
      if (fp.pattern.test(description)) {
        return fp.config;
      }
    }

    if (/flange/i.test(description)) {
      return "one_end";
    }

    return null;
  }

  private parseQuantity(value: any): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}
