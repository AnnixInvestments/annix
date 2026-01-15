import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExtractedItem {
  rowNumber: number;
  itemNumber: string;
  description: string;
  itemType: 'pipe' | 'bend' | 'reducer' | 'tee' | 'flange' | 'expansion_joint' | 'unknown';
  material: string | null;
  materialGrade: string | null;
  diameter: number | null;
  diameterUnit: 'mm' | 'inch';
  secondaryDiameter: number | null;
  length: number | null;
  wallThickness: number | null;
  schedule: string | null;
  angle: number | null;
  flangeConfig: 'none' | 'one_end' | 'both_ends' | 'puddle' | 'blind' | null;
  quantity: number;
  unit: string;
  confidence: number;
  needsClarification: boolean;
  clarificationReason: string | null;
  rawData: Record<string, any>;
}

export interface ExtractionResult {
  sheetName: string;
  totalRows: number;
  items: ExtractedItem[];
  clarificationsNeeded: number;
  metadata: {
    projectReference: string | null;
    standard: string | null;
    coating: string | null;
  };
}

@Injectable()
export class ExcelExtractorService {
  private readonly logger = new Logger(ExcelExtractorService.name);

  private readonly materialPatterns = [
    { pattern: /\bS\.?S\.?\b|\bstainless\s*steel\b/i, material: 'Stainless Steel', grade: '316' },
    { pattern: /\bM\.?S\.?\b|\bmild\s*steel\b/i, material: 'Mild Steel', grade: null },
    { pattern: /\bAPI\s*5L\s*(Grade\s*)?(X\d+)/i, material: 'Carbon Steel', grade: 'API 5L' },
    { pattern: /\bSABS\s*719\b/i, material: 'Stainless Steel', grade: 'SABS 719' },
    { pattern: /\bcarbon\s*steel\b/i, material: 'Carbon Steel', grade: null },
  ];

  private readonly itemTypePatterns = [
    { pattern: /\bs[-\s]?bend\b/i, type: 'bend' as const },
    { pattern: /\bbend\b|\bdeg\b|\bdegree\b/i, type: 'bend' as const },
    { pattern: /\breducer\b|\breducing\b(?!\s*tee)/i, type: 'reducer' as const },
    { pattern: /\btee\b/i, type: 'tee' as const },
    { pattern: /\bblind\s*flange\b/i, type: 'flange' as const },
    { pattern: /\bexpansion\s*joint\b/i, type: 'expansion_joint' as const },
    { pattern: /\bpipe\b|\bdia\s*pipe\b/i, type: 'pipe' as const },
    { pattern: /\d+\s*mm\s*(steel|stainless)/i, type: 'pipe' as const },
  ];

  private readonly flangePatterns = [
    { pattern: /\bboth\s*ends?\s*flange[d]?\b|\bfully\s*flange[d]?\b|\bflange[d]?\s*both\s*ends?\b/i, config: 'both_ends' as const },
    { pattern: /\bone\s*end\s*flange[d]?\b|\bflange[d]?\s*one\s*end\b/i, config: 'one_end' as const },
    { pattern: /\bno\s*flange[s]?\b/i, config: 'none' as const },
    { pattern: /\bpuddle\s*flange\b|\bpaddle\s*flange\b/i, config: 'puddle' as const },
    { pattern: /\bblind\s*flange\b/i, config: 'blind' as const },
  ];

  async extractFromExcel(filePath: string): Promise<ExtractionResult> {
    this.logger.log(`Extracting from Excel: ${filePath}`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheets found in Excel file');
    }

    const items: ExtractedItem[] = [];
    let currentContext: {
      material: string | null;
      materialGrade: string | null;
      standard: string | null;
      coating: string | null;
      wallThickness: number | null;
    } = {
      material: null,
      materialGrade: null,
      standard: null,
      coating: null,
      wallThickness: null,
    };

    let projectReference: string | null = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData = this.extractRowData(row);
      const description = rowData.description?.toString() || '';

      if (!description || description.trim().length < 3) return;

      const contextUpdate = this.extractContextFromDescription(description);
      if (contextUpdate.material) currentContext.material = contextUpdate.material;
      if (contextUpdate.materialGrade) currentContext.materialGrade = contextUpdate.materialGrade;
      if (contextUpdate.standard) currentContext.standard = contextUpdate.standard;
      if (contextUpdate.coating) currentContext.coating = contextUpdate.coating;
      if (contextUpdate.wallThickness) currentContext.wallThickness = contextUpdate.wallThickness;

      if (rowData.paymentReference && !projectReference) {
        projectReference = rowData.paymentReference.toString();
      }

      const isLineItem = this.isLineItem(rowData, description);
      if (!isLineItem) return;

      const item = this.extractItemFromRow(rowNumber, rowData, description, currentContext);
      if (item) {
        items.push(item);
      }
    });

    const clarificationsNeeded = items.filter(i => i.needsClarification).length;

    return {
      sheetName: worksheet.name,
      totalRows: worksheet.rowCount,
      items,
      clarificationsNeeded,
      metadata: {
        projectReference,
        standard: currentContext.standard,
        coating: currentContext.coating,
      },
    };
  }

  private extractRowData(row: ExcelJS.Row): Record<string, any> {
    return {
      trade: row.getCell(1).value,
      page: row.getCell(2).value,
      itemNumber: row.getCell(3).value,
      paymentReference: row.getCell(4).value,
      description: row.getCell(5).value,
      unit: row.getCell(6).value,
      quantity: row.getCell(7).value,
      rate: row.getCell(8).value,
      total: row.getCell(9).value,
    };
  }

  private extractContextFromDescription(description: string): {
    material: string | null;
    materialGrade: string | null;
    standard: string | null;
    coating: string | null;
    wallThickness: number | null;
  } {
    const result = {
      material: null as string | null,
      materialGrade: null as string | null,
      standard: null as string | null,
      coating: null as string | null,
      wallThickness: null as number | null,
    };

    const standardMatch = description.match(/\b(API\s*5L|SABS\s*\d+|ASTM\s*\w+)/i);
    if (standardMatch) {
      result.standard = standardMatch[1].toUpperCase().replace(/\s+/g, ' ');
    }

    const coatingMatch = description.match(/\b(CML|polyurethane|epoxy|coating)\b/i);
    if (coatingMatch) {
      result.coating = description.match(/(\d+mm\s*CML|CML|polyurethane\s*coating|epoxy)/i)?.[0] || coatingMatch[1];
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
    const hasQuantity = rowData.quantity !== null && rowData.quantity !== undefined && rowData.quantity !== '';
    const hasUnit = rowData.unit !== null && rowData.unit !== undefined && rowData.unit !== '';
    const hasDiameter = /\d+\s*mm\s*(dia|diameter)?/i.test(description);
    const hasItemRef = /item\s*\d+\.\d+/i.test(description) || /^\s*\([a-z]\)/i.test(description);

    return (hasQuantity || hasUnit) && (hasDiameter || hasItemRef);
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
    }
  ): ExtractedItem | null {
    const itemType = this.detectItemType(description);
    const material = this.extractMaterial(description) || context.material;
    const materialGrade = this.extractMaterialGrade(description) || context.materialGrade;
    const diameter = this.extractDiameter(description);
    const secondaryDiameter = this.extractSecondaryDiameter(description);
    const length = this.extractLength(description);
    const angle = this.extractAngle(description);
    const flangeConfig = this.extractFlangeConfig(description);
    const quantity = this.parseQuantity(rowData.quantity);

    let confidence = 0.5;
    let needsClarification = false;
    let clarificationReason: string | null = null;

    if (material) confidence += 0.15;
    if (diameter) confidence += 0.15;
    if (itemType !== 'unknown') confidence += 0.1;
    if (quantity > 0) confidence += 0.1;

    if (!material) {
      needsClarification = true;
      clarificationReason = 'Could not determine material type (Stainless Steel or Mild Steel)';
      confidence -= 0.2;
    }

    if (!diameter) {
      needsClarification = true;
      clarificationReason = clarificationReason
        ? `${clarificationReason}; Could not determine pipe diameter`
        : 'Could not determine pipe diameter';
      confidence -= 0.2;
    }

    if (itemType === 'bend' && !angle) {
      needsClarification = true;
      clarificationReason = clarificationReason
        ? `${clarificationReason}; Could not determine bend angle`
        : 'Could not determine bend angle';
    }

    if (itemType === 'reducer' && !secondaryDiameter) {
      needsClarification = true;
      clarificationReason = clarificationReason
        ? `${clarificationReason}; Could not determine reducer outlet diameter`
        : 'Could not determine reducer outlet diameter';
    }

    confidence = Math.max(0.1, Math.min(1.0, confidence));

    return {
      rowNumber,
      itemNumber: rowData.itemNumber?.toString() || `Row${rowNumber}`,
      description: description.trim(),
      itemType,
      material,
      materialGrade,
      diameter,
      diameterUnit: 'mm',
      secondaryDiameter,
      length,
      wallThickness: context.wallThickness,
      schedule: null,
      angle,
      flangeConfig,
      quantity,
      unit: rowData.unit?.toString() || 'No',
      confidence,
      needsClarification,
      clarificationReason,
      rawData: rowData,
    };
  }

  private detectItemType(description: string): ExtractedItem['itemType'] {
    for (const pattern of this.itemTypePatterns) {
      if (pattern.pattern.test(description)) {
        return pattern.type;
      }
    }
    return 'unknown';
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

  private extractFlangeConfig(description: string): ExtractedItem['flangeConfig'] {
    for (const fp of this.flangePatterns) {
      if (fp.pattern.test(description)) {
        return fp.config;
      }
    }

    if (/flange/i.test(description)) {
      return 'one_end';
    }

    return null;
  }

  private parseQuantity(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}
