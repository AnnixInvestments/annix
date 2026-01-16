import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { ExtractedItem, SpecificationCellData, ExtractionResult } from './excel-extractor.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

  private readonly materialPatterns = [
    { pattern: /\bS\.?S\.?\b|\bstainless\s*steel\b/i, material: 'Stainless Steel', grade: '316' },
    { pattern: /\bM\.?S\.?\b|\bmild\s*steel\b/i, material: 'Mild Steel', grade: null },
    { pattern: /\bAPI\s*5L[-\s]?[A-Z]?\b/i, material: 'Carbon Steel', grade: 'API 5L' },
    { pattern: /\bSABS\s*719\b/i, material: 'Carbon Steel', grade: 'SABS 719' },
    { pattern: /\bcarbon\s*steel\b/i, material: 'Carbon Steel', grade: null },
    { pattern: /\bASTM\s*A312\b/i, material: 'Stainless Steel', grade: 'ASTM A312' },
    { pattern: /\bASTM\s*A234\s*WPB\b/i, material: 'Carbon Steel', grade: 'A234 WPB' },
    { pattern: /\bASTM\s*A106\b/i, material: 'Carbon Steel', grade: 'ASTM A106' },
    { pattern: /\bASTM\s*A105\b/i, material: 'Carbon Steel', grade: 'A105' },
    { pattern: /\bERW\b/i, material: 'Carbon Steel', grade: 'ERW' },
  ];

  private readonly itemTypePatterns = [
    { pattern: /\belbow\b/i, type: 'bend' as const },
    { pattern: /\bs[-\s]?bend\b/i, type: 'bend' as const },
    { pattern: /\bbend\b|\bdeg\b|\bdegree\b/i, type: 'bend' as const },
    { pattern: /\breducer\b|\breducing\b(?!\s*tee)/i, type: 'reducer' as const },
    { pattern: /\btee\b/i, type: 'tee' as const },
    { pattern: /\bflange\b(?!.*gasket)/i, type: 'flange' as const },
    { pattern: /\bexpansion\s*joint\b/i, type: 'expansion_joint' as const },
    { pattern: /\b\d+\s*NB\s+PIPE\b/i, type: 'pipe' as const },
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

  async extractFromPdf(filePath: string): Promise<ExtractionResult> {
    this.logger.log(`Extracting from PDF: ${filePath}`);

    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    await parser.load();
    const pdfResult = await parser.getText();
    const pdfText = pdfResult.text || '';
    const pdfInfo = await parser.getInfo();

    this.logger.log(`PDF has ${pdfInfo.numPages || pdfResult.total || 'unknown'} pages, extracted ${pdfText.length} characters`);

    const lines = pdfText.split('\n').filter((line: string) => line.trim().length > 0);
    this.logger.log(`PDF has ${lines.length} non-empty lines`);

    const specificationCells = this.extractSpecificationData(lines);
    this.logger.log(`Found ${specificationCells.length} specification header(s)`);

    const specDefaults = this.consolidateSpecificationData(specificationCells);

    const items = this.extractItems(lines, specDefaults);
    this.logger.log(`Extracted ${items.length} items from PDF`);

    const metadata = this.extractMetadata(lines);

    const clarificationsNeeded = items.filter(i => i.needsClarification).length;

    return {
      sheetName: 'PDF Document',
      totalRows: lines.length,
      items,
      clarificationsNeeded,
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
    };
  }

  private extractSpecificationData(lines: string[]): SpecificationCellData[] {
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

    lines.slice(0, 50).forEach((line, index) => {
      const lineText = line.trim();
      if (lineText.length < 15) return;

      const isSpecHeader = specHeaderPatterns.some(pattern => pattern.test(lineText));
      const specDataMatches = specDataPatterns.filter(pattern => pattern.test(lineText)).length;
      const hasSpecData = specDataMatches >= 2;

      if ((isSpecHeader || hasSpecData) && lineText.length > 10) {
        this.logger.log(`Found specification data at line ${index + 1} (matches: ${specDataMatches}): ${lineText.substring(0, 150)}...`);

        const parsed = this.parseSpecificationText(lineText);
        const hasMeaningfulData = parsed.materialGrade || parsed.wallThickness || parsed.lining || parsed.externalCoating || parsed.standard;

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

  private parseSpecificationText(text: string): SpecificationCellData['parsedData'] {
    const result: SpecificationCellData['parsedData'] = {
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
    ];

    for (const pattern of gradePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.materialGrade = match[1] || match[0];
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
        break;
      }
    }

    const liningPatterns = [
      /(?:internal\s*)?(?:lining|lined)[:\s]*([^,\n]+)/i,
      /CML\s*(?:lined?|lining)?/i,
      /cement\s*(?:mortar\s*)?lin(?:ed|ing)/i,
      /epoxy\s*(?:internal\s*)?lin(?:ed|ing)/i,
    ];

    for (const pattern of liningPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.lining = match[1]?.trim() || match[0].trim();
        break;
      }
    }

    const coatingPatterns = [
      /(?:external\s*)?(?:coating|coated)[:\s]*([^,\n]+)/i,
      /polyurethane\s*(?:coat(?:ed|ing))?/i,
      /bitumen\s*(?:coat(?:ed|ing))?/i,
      /galvani[sz]ed/i,
    ];

    for (const pattern of coatingPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.externalCoating = match[1]?.trim() || match[0].trim();
        break;
      }
    }

    const standardPatterns = [
      /\b(API\s*5L)\b/i,
      /\b(SABS\s*\d+)\b/i,
      /\b(ASTM\s*A\d+)\b/i,
      /\b(EN\s*\d+)\b/i,
    ];

    for (const pattern of standardPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.standard = match[1];
        break;
      }
    }

    const scheduleMatch = text.match(/\bSch(?:edule)?\.?\s*(\d+)/i);
    if (scheduleMatch) {
      result.schedule = `Sch ${scheduleMatch[1]}`;
    }

    return result;
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
        if (rawText.includes('stainless') || rawText.includes('s.s') || rawText.includes('ss ')) {
          result.material = 'Stainless Steel';
        } else if (rawText.includes('carbon') || rawText.includes('mild') || rawText.includes('m.s')) {
          result.material = 'Carbon Steel';
        } else if (rawText.includes('api') || rawText.includes('erw')) {
          result.material = 'Carbon Steel';
        }
      }

      if (parsed.wallThickness && !result.wallThickness) {
        result.wallThickness = parsed.wallThickness;
        const thicknessNum = parseFloat(parsed.wallThickness.replace(/[^\d.]/g, ''));
        if (!isNaN(thicknessNum)) {
          result.wallThicknessNum = thicknessNum;
        }
      }

      if (parsed.lining && !result.lining) result.lining = parsed.lining;
      if (parsed.externalCoating && !result.externalCoating) result.externalCoating = parsed.externalCoating;
      if (parsed.standard && !result.standard) result.standard = parsed.standard;
      if (parsed.schedule && !result.schedule) result.schedule = parsed.schedule;
    }

    return result;
  }

  private extractItems(lines: string[], specDefaults: ReturnType<typeof this.consolidateSpecificationData>): ExtractedItem[] {
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

      const contextUpdate = this.extractContextFromLine(lineText);
      if (contextUpdate.material) {
        currentContext.material = contextUpdate.material;
        currentContext.materialGrade = contextUpdate.materialGrade;
      }

      if (this.isItemLine(lineText)) {
        const item = this.extractItemFromLine(index + 1, lineText, currentContext);
        if (item) {
          itemNumber++;
          item.itemNumber = `PDF-${itemNumber}`;
          items.push(item);
          this.logger.debug(`Extracted item from line ${index + 1}: ${item.itemType} ${item.diameter}mm`);
        }
      }
    });

    return items;
  }

  private isItemLine(text: string): boolean {
    const hasDiameter = /\b\d+\s*(NB|mm|DN|dia)/i.test(text);
    const hasItemType = this.itemTypePatterns.some(p => p.pattern.test(text));
    const hasQuantity = /\b\d+\s*(pcs?|ea|nos?|units?|off|lengths?|m|metres?|meters?)\b/i.test(text);

    const isHeader = /^(item|description|qty|quantity|unit|total|bill|section|page)/i.test(text.trim());
    const isCarriedForward = /^(Carried|Brought)\s+(Forward|Back)/i.test(text);

    return (hasDiameter || hasItemType) && !isHeader && !isCarriedForward;
  }

  private extractItemFromLine(
    lineNumber: number,
    text: string,
    context: { material: string | null; materialGrade: string | null; wallThickness: number | null }
  ): ExtractedItem | null {
    const itemType = this.detectItemType(text);
    const diameter = this.extractDiameter(text);
    const quantity = this.extractQuantity(text);
    const material = this.extractMaterial(text);
    const flangeConfig = this.extractFlangeConfig(text);
    const angle = this.extractAngle(text);
    const length = this.extractLength(text);
    const secondaryDiameter = this.extractSecondaryDiameter(text);

    if (!diameter && itemType === 'unknown') {
      return null;
    }

    const needsClarification = !diameter || !material.material;

    return {
      rowNumber: lineNumber,
      itemNumber: '',
      description: text.substring(0, 200),
      itemType,
      material: material.material || context.material,
      materialGrade: material.grade || context.materialGrade,
      diameter,
      diameterUnit: 'mm',
      secondaryDiameter,
      length,
      wallThickness: context.wallThickness,
      schedule: null,
      angle,
      flangeConfig,
      quantity: quantity.value,
      unit: quantity.unit,
      confidence: needsClarification ? 0.6 : 0.85,
      needsClarification,
      clarificationReason: needsClarification ? 'Missing diameter or material information' : null,
      rawData: { originalLine: text },
    };
  }

  private detectItemType(text: string): ExtractedItem['itemType'] {
    for (const { pattern, type } of this.itemTypePatterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
    return 'unknown';
  }

  private extractDiameter(text: string): number | null {
    const patterns = [
      /(\d+)\s*NB\b/i,
      /(\d+)\s*mm\s*(?:dia|diameter|NB|DN)/i,
      /DN\s*(\d+)/i,
      /(?:dia|diameter)[:\s]*(\d+)/i,
      /(\d{2,4})\s*(?:x|\*)\s*\d/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value >= 10 && value <= 2000) {
          return value;
        }
      }
    }

    return null;
  }

  private extractSecondaryDiameter(text: string): number | null {
    const reducerPattern = /(\d+)\s*(?:x|\*|to|\/)\s*(\d+)/i;
    const match = text.match(reducerPattern);
    if (match) {
      const secondValue = parseInt(match[2], 10);
      if (secondValue >= 10 && secondValue <= 2000) {
        return secondValue;
      }
    }
    return null;
  }

  private extractQuantity(text: string): { value: number; unit: string } {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(pcs?|ea|nos?|units?|off)\b/i,
      /(\d+(?:\.\d+)?)\s*(lengths?|m|metres?|meters?)\b/i,
      /qty[:\s]*(\d+(?:\.\d+)?)/i,
      /\b(\d+(?:\.\d+)?)\s*(?:no|nr)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          value: parseFloat(match[1]),
          unit: match[2]?.toLowerCase() || 'ea',
        };
      }
    }

    return { value: 1, unit: 'ea' };
  }

  private extractMaterial(text: string): { material: string | null; grade: string | null } {
    for (const { pattern, material, grade } of this.materialPatterns) {
      if (pattern.test(text)) {
        return { material, grade };
      }
    }
    return { material: null, grade: null };
  }

  private extractFlangeConfig(text: string): ExtractedItem['flangeConfig'] {
    for (const { pattern, config } of this.flangePatterns) {
      if (pattern.test(text)) {
        return config;
      }
    }
    return null;
  }

  private extractAngle(text: string): number | null {
    const patterns = [
      /(\d+)\s*(?:deg(?:ree)?s?|°)/i,
      /(\d+)\s*(?:x|\*)\s*\d+\s*(?:deg|°)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const angle = parseInt(match[1], 10);
        if (angle > 0 && angle <= 180) {
          return angle;
        }
      }
    }
    return null;
  }

  private extractLength(text: string): number | null {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)\s*(?:long|length)?/i,
      /length[:\s]*(\d+(?:\.\d+)?)\s*m/i,
      /(\d+(?:\.\d+)?)\s*mm\s*(?:long|length)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let value = parseFloat(match[1]);
        if (text.toLowerCase().includes('mm')) {
          value = value / 1000;
        }
        if (value > 0 && value <= 100) {
          return value;
        }
      }
    }
    return null;
  }

  private extractContextFromLine(text: string): { material: string | null; materialGrade: string | null } {
    for (const { pattern, material, grade } of this.materialPatterns) {
      if (pattern.test(text)) {
        return { material, materialGrade: grade };
      }
    }
    return { material: null, materialGrade: null };
  }

  private extractMetadata(lines: string[]): {
    projectReference: string | null;
    projectLocation: string | null;
    projectName: string | null;
  } {
    let projectReference: string | null = null;
    let projectLocation: string | null = null;
    let projectName: string | null = null;

    const headerLines = lines.slice(0, 30);

    for (const line of headerLines) {
      const refMatch = line.match(/(?:ref(?:erence)?|tender|contract|project)\s*(?:no|number)?[:\s]+([A-Z0-9\-\/]+)/i);
      if (refMatch && !projectReference) {
        projectReference = refMatch[1].trim();
      }

      const locationMatch = line.match(/(?:site|location|address)[:\s]+(.+)/i);
      if (locationMatch && !projectLocation) {
        projectLocation = locationMatch[1].trim().substring(0, 100);
      }

      const projectMatch = line.match(/(?:project|contract|tender)[:\s]+(.+)/i);
      if (projectMatch && !projectName) {
        projectName = projectMatch[1].trim().substring(0, 100);
      }

      const locationPatterns = [
        /\b(johannesburg|pretoria|cape\s*town|durban|port\s*elizabeth|bloemfontein|east\s*london|kimberley|polokwane|nelspruit|rustenburg|potchefstroom|vereeniging|welkom|pietermaritzburg|richards\s*bay|midrand|sandton|centurion)\b/i,
        /\b(gauteng|western\s*cape|kwazulu[\s-]*natal|eastern\s*cape|free\s*state|mpumalanga|limpopo|north\s*west|northern\s*cape)\b/i,
      ];

      for (const pattern of locationPatterns) {
        const match = line.match(pattern);
        if (match && !projectLocation) {
          projectLocation = match[1].trim();
          break;
        }
      }
    }

    return { projectReference, projectLocation, projectName };
  }
}
