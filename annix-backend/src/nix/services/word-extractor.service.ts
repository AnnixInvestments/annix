import { Injectable, Logger } from "@nestjs/common";
import * as mammoth from "mammoth";
import { ExtractedItem, ExtractionResult, SpecificationCellData } from "./excel-extractor.service";

export interface WordExtractionResult extends ExtractionResult {
  rawText: string;
  htmlContent: string;
}

@Injectable()
export class WordExtractorService {
  private readonly logger = new Logger(WordExtractorService.name);

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
    { pattern: /\bSABS\s*719\b/i, material: "Carbon Steel", grade: "SABS 719" },
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
  ];

  async extractFromWord(filePath: string): Promise<WordExtractionResult> {
    this.logger.log(`Extracting from Word document: ${filePath}`);

    const result = await mammoth.convertToHtml({ path: filePath });
    const textResult = await mammoth.extractRawText({ path: filePath });

    const htmlContent = result.value;
    const rawText = textResult.value;

    if (result.messages.length > 0) {
      result.messages.forEach((msg) => {
        this.logger.warn(`Mammoth warning: ${msg.message}`);
      });
    }

    this.logger.log(`Extracted ${rawText.length} characters from Word document`);

    const lines = rawText.split("\n").filter((line) => line.trim().length > 0);
    this.logger.log(`Word document has ${lines.length} non-empty lines`);

    const specificationCells = this.extractSpecificationData(lines);
    const specDefaults = this.consolidateSpecificationData(specificationCells);
    const items = this.extractItems(lines, specDefaults);
    const metadata = this.extractMetadata(lines);

    this.logger.log(`Extracted ${items.length} items from Word document`);

    return {
      sheetName: "Word Document",
      totalRows: lines.length,
      items,
      clarificationsNeeded: items.filter((i) => i.needsClarification).length,
      specificationCells,
      metadata: {
        projectReference: metadata.projectReference,
        projectLocation: metadata.projectLocation,
        projectName: metadata.projectName,
        standard: specDefaults.standard,
        coating: specDefaults.externalCoating,
        lining: specDefaults.lining,
        materialGrade: specDefaults.materialGrade,
        wallThickness: specDefaults.wallThickness,
      },
      rawText,
      htmlContent,
    };
  }

  private extractSpecificationData(lines: string[]): SpecificationCellData[] {
    const specCells: SpecificationCellData[] = [];

    const specHeaderPatterns = [
      /^SP\d+\s+Specification\s*[-–:]/i,
      /Specification\s*[-–:]\s*(CARBON|STAINLESS|MILD)\s*STEEL/i,
      /MATERIAL\s*SPECIFICATION/i,
      /PIPE\s*SPECIFICATION/i,
    ];

    const specDataPatterns = [
      /\b(API\s*5L|SABS\s*\d+|ASTM\s*A\d+|EN\s*\d+)\b/i,
      /\bGrade\s*[A-Z0-9]+\b/i,
      /\b\d+(?:\.\d+)?\s*mm\s*(?:wall|thick|wt)\b/i,
      /\bSch(?:edule)?\.?\s*\d+/i,
    ];

    lines.slice(0, 50).forEach((line, index) => {
      const lineText = line.trim();
      if (lineText.length < 15) return;

      const isSpecHeader = specHeaderPatterns.some((pattern) => pattern.test(lineText));
      const specDataMatches = specDataPatterns.filter((pattern) => pattern.test(lineText)).length;

      if ((isSpecHeader || specDataMatches >= 2) && lineText.length > 10) {
        const parsed = this.parseSpecificationText(lineText);
        const hasMeaningfulData =
          parsed.materialGrade ||
          parsed.wallThickness ||
          parsed.lining ||
          parsed.externalCoating ||
          parsed.standard;

        if (hasMeaningfulData) {
          specCells.push({
            cellRef: `Line${index + 1}`,
            rowNumber: index + 1,
            rawText: lineText,
            parsedData: parsed,
          });
        }
      }
    });

    return specCells;
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

    const gradeMatch = text.match(/(?:Grade|Gr\.?)\s*([A-Z0-9]+)/i);
    if (gradeMatch) result.materialGrade = gradeMatch[1];

    const wallMatch = text.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:wall|thick|thk)/i);
    if (wallMatch) result.wallThickness = `${wallMatch[1]}mm`;

    const standardMatch = text.match(/\b(API\s*5L|SABS\s*\d+|ASTM\s*A\d+)\b/i);
    if (standardMatch) result.standard = standardMatch[1];

    const scheduleMatch = text.match(/\bSch(?:edule)?\.?\s*(\d+)/i);
    if (scheduleMatch) result.schedule = `Sch ${scheduleMatch[1]}`;

    return result;
  }

  private consolidateSpecificationData(specCells: SpecificationCellData[]) {
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
      if (parsed.materialGrade && !result.materialGrade)
        result.materialGrade = parsed.materialGrade;
      if (parsed.wallThickness && !result.wallThickness) {
        result.wallThickness = parsed.wallThickness;
        const num = parseFloat(parsed.wallThickness.replace(/[^\d.]/g, ""));
        if (!Number.isNaN(num)) result.wallThicknessNum = num;
      }
      if (parsed.lining && !result.lining) result.lining = parsed.lining;
      if (parsed.externalCoating && !result.externalCoating)
        result.externalCoating = parsed.externalCoating;
      if (parsed.standard && !result.standard) result.standard = parsed.standard;
    }

    return result;
  }

  private extractItems(
    lines: string[],
    specDefaults: ReturnType<typeof this.consolidateSpecificationData>,
  ): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    let itemNumber = 0;

    const currentContext = {
      material: specDefaults.material,
      materialGrade: specDefaults.materialGrade,
      wallThickness: specDefaults.wallThicknessNum,
    };

    lines.forEach((line, index) => {
      const lineText = line.trim();
      if (lineText.length < 5) return;

      if (this.isItemLine(lineText)) {
        const item = this.extractItemFromLine(index + 1, lineText, currentContext);
        if (item) {
          itemNumber++;
          item.itemNumber = `WORD-${itemNumber}`;
          items.push(item);
        }
      }
    });

    return items;
  }

  private isItemLine(text: string): boolean {
    const hasDiameter = /\b\d+\s*(NB|mm|DN|dia)/i.test(text);
    const hasItemType = this.itemTypePatterns.some((p) => p.pattern.test(text));
    const isHeader = /^(item|description|qty|quantity|unit|total|bill|section|page)/i.test(
      text.trim(),
    );

    return (hasDiameter || hasItemType) && !isHeader;
  }

  private extractItemFromLine(
    lineNumber: number,
    text: string,
    context: {
      material: string | null;
      materialGrade: string | null;
      wallThickness: number | null;
    },
  ): ExtractedItem | null {
    const itemType = this.detectItemType(text);
    const diameter = this.extractDiameter(text);
    const material = this.extractMaterial(text);

    if (!diameter && itemType === "unknown") return null;

    const needsClarification = !diameter || !material.material;

    return {
      rowNumber: lineNumber,
      itemNumber: "",
      description: text.substring(0, 200),
      itemType,
      material: material.material || context.material,
      materialGrade: material.grade || context.materialGrade,
      diameter,
      diameterUnit: "mm",
      secondaryDiameter: null,
      length: null,
      wallThickness: context.wallThickness,
      schedule: null,
      angle: null,
      flangeConfig: null,
      quantity: 1,
      unit: "ea",
      confidence: needsClarification ? 0.6 : 0.85,
      needsClarification,
      clarificationReason: needsClarification ? "Missing diameter or material information" : null,
      rawData: { originalLine: text },
    };
  }

  private detectItemType(text: string): ExtractedItem["itemType"] {
    for (const { pattern, type } of this.itemTypePatterns) {
      if (pattern.test(text)) return type;
    }
    return "unknown";
  }

  private extractDiameter(text: string): number | null {
    const patterns = [/(\d+)\s*NB\b/i, /(\d+)\s*mm\s*(?:dia|diameter|NB|DN)/i, /DN\s*(\d+)/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value >= 10 && value <= 2000) return value;
      }
    }
    return null;
  }

  private extractMaterial(text: string): {
    material: string | null;
    grade: string | null;
  } {
    for (const { pattern, material, grade } of this.materialPatterns) {
      if (pattern.test(text)) return { material, grade };
    }
    return { material: null, grade: null };
  }

  private extractMetadata(lines: string[]) {
    let projectReference: string | null = null;
    let projectLocation: string | null = null;
    let projectName: string | null = null;

    const headerLines = lines.slice(0, 30);

    for (const line of headerLines) {
      const refMatch = line.match(
        /(?:ref(?:erence)?|tender|contract|project)\s*(?:no|number)?[:\s]+([A-Z0-9\-/]+)/i,
      );
      if (refMatch && !projectReference) projectReference = refMatch[1].trim();

      const locationMatch = line.match(/(?:site|location|address)[:\s]+(.+)/i);
      if (locationMatch && !projectLocation)
        projectLocation = locationMatch[1].trim().substring(0, 100);

      const projectMatch = line.match(/(?:project|contract|tender)[:\s]+(.+)/i);
      if (projectMatch && !projectName) projectName = projectMatch[1].trim().substring(0, 100);
    }

    return { projectReference, projectLocation, projectName };
  }
}
