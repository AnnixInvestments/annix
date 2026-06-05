import * as fs from "node:fs";
import { Injectable, Logger } from "@nestjs/common";
import { ExtractedItem, ExtractionResult, SpecificationCellData } from "./excel-extractor.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

@Injectable()
export class PdfExtractorService {
  private readonly logger = new Logger(PdfExtractorService.name);

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
      pattern: /\bASTM\s*A312\b/i,
      material: "Stainless Steel",
      grade: "ASTM A312",
    },
    {
      pattern: /\bASTM\s*A234\s*WPB\b/i,
      material: "Carbon Steel",
      grade: "A234 WPB",
    },
    {
      pattern: /\bASTM\s*A106\b/i,
      material: "Carbon Steel",
      grade: "ASTM A106",
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
    {
      pattern:
        /\bflow\s*meter\b|\bdensito?\s*meter\b|\bdensity\s*meter\b|\bdensitometer\b|\b(pressure|temperature)\s*transmitter\b|\bpressure\s*gauge\b|\blevel\s*(switch|transmitter|indicator)\b|\bsampler\b|\banaly[sz]er\b/i,
      type: "instrument" as const,
    },
    { pattern: /\bvalve\b|\brsv\b/i, type: "valve" as const },
    { pattern: /\bpump\b/i, type: "pump" as const },
    {
      pattern: /\bgaskets?\b|\bbolt\s*sets?\b|\bnut\s*and\s*washer\b/i,
      type: "consumable" as const,
    },
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

  async extractFromPdf(filePath: string): Promise<ExtractionResult> {
    this.logger.log(`Extracting from PDF: ${filePath}`);

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text || "";
    const numPages = pdfData.numpages || 0;

    this.logger.log(`PDF has ${numPages} pages, extracted ${pdfText.length} characters`);

    const lines = pdfText.split("\n").filter((line: string) => line.trim().length > 0);
    this.logger.log(`PDF has ${lines.length} non-empty lines`);

    const specificationCells = this.extractSpecificationData(lines);
    this.logger.log(`Found ${specificationCells.length} specification header(s)`);

    const specDefaults = this.consolidateSpecificationData(specificationCells);

    const items = this.extractItems(lines, specDefaults);
    this.logger.log(`Extracted ${items.length} items from PDF`);

    const metadata = this.extractMetadata(lines);

    const clarificationsNeeded = items.filter((i) => i.needsClarification).length;

    return {
      sheetName: "PDF Document",
      totalRows: lines.length,
      items,
      clarificationsNeeded,
      specificationCells,
      metadata: {
        projectReference: metadata.projectReference,
        projectLocation: metadata.projectLocation,
        projectName: metadata.projectName,
        workingPressureBar: metadata.workingPressureBar,
        workingTemperatureC: metadata.workingTemperatureC,
        standard: specDefaults.standard,
        coating: specDefaults.externalCoating,
        lining: specDefaults.lining,
        materialGrade: specDefaults.materialGrade,
        wallThickness: specDefaults.wallThickness,
        valveTypes: metadata.valveTypes,
        valveStandards: metadata.valveStandards,
        flangeStandard: metadata.flangeStandard,
        flangeTableDesignation: metadata.flangeTableDesignation,
        ndtMethods: metadata.ndtMethods,
        hydrotestMultiplier: metadata.hydrotestMultiplier,
        hydrotestHoldMinutes: metadata.hydrotestHoldMinutes,
        naceCompliance: metadata.naceCompliance,
        sourService: metadata.sourService,
        gasketType: metadata.gasketType,
        valveClauseExcerpt: metadata.valveClauseExcerpt,
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

    // Scan the whole document. Tender PDFs often run 200+ pages
    // with the actual spec data deep in a Particular Specification
    // section (e.g. JW-V Valves on p.283). Capping at the first 50
    // lines silently misses that data — the customer ends up with
    // a blank Specifications step and an undetected scope gap.
    lines.forEach((line, index) => {
      const lineText = line.trim();
      if (lineText.length < 15) return;

      const isSpecHeader = specHeaderPatterns.some((pattern) => pattern.test(lineText));
      const specDataMatches = specDataPatterns.filter((pattern) => pattern.test(lineText)).length;
      const hasSpecData = specDataMatches >= 2;

      if ((isSpecHeader || hasSpecData) && lineText.length > 10) {
        this.logger.log(
          `Found specification data at line ${index + 1} (matches: ${specDataMatches}): ${lineText.substring(0, 150)}...`,
        );

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

      if (parsed.lining && !result.lining) result.lining = parsed.lining;
      if (parsed.externalCoating && !result.externalCoating)
        result.externalCoating = parsed.externalCoating;
      if (parsed.standard && !result.standard) result.standard = parsed.standard;
      if (parsed.schedule && !result.schedule) result.schedule = parsed.schedule;
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
          this.logger.debug(
            `Extracted item from line ${index + 1}: ${item.itemType} ${item.diameter}mm`,
          );
        }
      }
    });

    return items;
  }

  private isItemLine(text: string): boolean {
    const hasDiameter = /\b\d+\s*(NB|mm|DN|dia)/i.test(text);
    const hasItemType = this.itemTypePatterns.some((p) => p.pattern.test(text));
    const hasQuantity = /\b\d+\s*(pcs?|ea|nos?|units?|off|lengths?|m|metres?|meters?)\b/i.test(
      text,
    );

    const isHeader = /^(item|description|qty|quantity|unit|total|bill|section|page)/i.test(
      text.trim(),
    );
    const isCarriedForward = /^(Carried|Brought)\s+(Forward|Back)/i.test(text);

    return (hasDiameter || hasItemType) && !isHeader && !isCarriedForward;
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
    const quantity = this.extractQuantity(text);
    const material = this.extractMaterial(text);
    const flangeConfig = this.extractFlangeConfig(text);
    const angle = this.extractAngle(text);
    const length = this.extractLength(text);
    const secondaryDiameter = this.extractSecondaryDiameter(text);

    if (!diameter && itemType === "unknown") {
      return null;
    }

    const needsClarification = !diameter || !material.material;

    return {
      rowNumber: lineNumber,
      itemNumber: "",
      description: text.substring(0, 200),
      itemType,
      actionType: "supply",
      material: material.material || context.material,
      materialGrade: material.grade || context.materialGrade,
      diameter,
      diameterUnit: "mm",
      secondaryDiameter,
      length,
      wallThickness: context.wallThickness,
      schedule: null,
      angle,
      flangeConfig,
      pressureClass: null,
      sdr: null,
      productType: null,
      quantity: quantity.value,
      unit: quantity.unit,
      confidence: needsClarification ? 0.6 : 0.85,
      needsClarification,
      clarificationReason: needsClarification ? "Missing diameter or material information" : null,
      rawData: { originalLine: text },
    };
  }

  private detectItemType(text: string): ExtractedItem["itemType"] {
    for (const { pattern, type } of this.itemTypePatterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
    return "unknown";
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
          unit: match[2]?.toLowerCase() || "ea",
        };
      }
    }

    return { value: 1, unit: "ea" };
  }

  private extractMaterial(text: string): {
    material: string | null;
    grade: string | null;
  } {
    for (const { pattern, material, grade } of this.materialPatterns) {
      if (pattern.test(text)) {
        return { material, grade };
      }
    }
    return { material: null, grade: null };
  }

  private extractFlangeConfig(text: string): ExtractedItem["flangeConfig"] {
    for (const { pattern, config } of this.flangePatterns) {
      if (pattern.test(text)) {
        return config;
      }
    }
    return null;
  }

  private extractAngle(text: string): number | null {
    const patterns = [/(\d+)\s*(?:deg(?:ree)?s?|°)/i, /(\d+)\s*(?:x|\*)\s*\d+\s*(?:deg|°)/i];

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
        if (text.toLowerCase().includes("mm")) {
          value = value / 1000;
        }
        if (value > 0 && value <= 100) {
          return value;
        }
      }
    }
    return null;
  }

  private extractContextFromLine(text: string): {
    material: string | null;
    materialGrade: string | null;
  } {
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
    workingPressureBar: number | null;
    workingTemperatureC: number | null;
    valveTypes: string[] | null;
    valveStandards: string[] | null;
    flangeStandard: string | null;
    flangeTableDesignation: string | null;
    ndtMethods: string[] | null;
    hydrotestMultiplier: number | null;
    hydrotestHoldMinutes: number | null;
    naceCompliance: string | null;
    sourService: boolean | null;
    gasketType: string | null;
    valveClauseExcerpt: string | null;
  } {
    let projectReference: string | null = null;
    let projectLocation: string | null = null;
    let projectName: string | null = null;

    const headerLines = lines.slice(0, 30);

    for (const line of headerLines) {
      const refMatch = line.match(
        /(?:ref(?:erence)?|tender|contract|project)\s*(?:no|number)?[:\s]+([A-Z0-9\-/]+)/i,
      );
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

    const workingPressureBar = this.extractWorkingPressureBar(lines);
    const workingTemperatureC = this.extractWorkingTemperatureC(lines);
    const valveSpec = this.extractValveSpec(lines);
    const flangeSpec = this.extractFlangeSpec(lines);
    const ndtMethods = this.extractNdtMethods(lines);
    const hydrotestMultiplier = this.extractHydrotestMultiplier(lines);
    const hydrotestHoldMinutes = this.extractHydrotestHoldMinutes(lines);
    const naceCompliance = this.extractNaceCompliance(lines);
    const sourService = this.extractSourService(lines);
    const gasketType = this.extractGasketType(lines);

    return {
      projectReference,
      projectLocation,
      projectName,
      workingPressureBar,
      workingTemperatureC,
      valveTypes: valveSpec.types,
      valveStandards: valveSpec.standards,
      flangeStandard: flangeSpec.standard,
      flangeTableDesignation: flangeSpec.tableDesignation,
      ndtMethods,
      hydrotestMultiplier,
      hydrotestHoldMinutes,
      naceCompliance,
      sourService,
      gasketType,
      valveClauseExcerpt: valveSpec.clauseExcerpt,
    };
  }

  // Find any section/clause that calls out valves and lift the
  // valve types + governing standards into structured metadata.
  //
  // Tender PDFs typically bury the valve specification deep in a
  // Particular Specification ("JW-V Valves" / "Section V" /
  // "SPECIFICATION FOR VALVES" / "VALVE SCHEDULE"). The earlier
  // 50-line cap on the body scan silently missed these. This pass
  // scans the whole document, locates the valve section start, and
  // captures up to 200 lines of surrounding context for type-token
  // detection — enough to span a multi-page clause without dragging
  // unrelated paragraphs in.
  private extractValveSpec(lines: string[]): {
    types: string[] | null;
    standards: string[] | null;
    clauseExcerpt: string | null;
  } {
    // Section-header regex. Drops the trailing `\b` because pdf-parse
    // commonly concatenates the header straight into the next word —
    // "JW-VValves" or "JWV-1SCOPE" (no space, no boundary). The
    // patterns below match on a left-side word boundary only, which
    // is enough to anchor the section.
    const sectionHeaderPattern =
      /\b(JW-?V|JWV-?\d|section\s+V|particular\s+specification\s*[-–:]\s*valves?|specification\s+for\s+valves?|valve\s+schedule|valve\s+specification)/i;
    const inlineValveMention = /\bvalves?\b/i;

    const sectionStarts: number[] = [];
    lines.forEach((line, index) => {
      if (sectionHeaderPattern.test(line)) sectionStarts.push(index);
    });

    // Fallback when no obvious header — collect every line that
    // mentions a valve, capped to keep scope sane.
    let scanLines: string[];
    if (sectionStarts.length > 0) {
      const segments = sectionStarts.map((start) =>
        lines.slice(start, Math.min(start + 200, lines.length)),
      );
      scanLines = segments.flat();
    } else {
      scanLines = lines.filter((line) => inlineValveMention.test(line));
      if (scanLines.length === 0) {
        return { types: null, standards: null, clauseExcerpt: null };
      }
    }

    const scanText = scanLines.join("\n");

    // Type patterns — loosened to match how tender specs actually
    // describe valves. Two patterns where wording usually breaks the
    // strict regex:
    //   - "non-return (check) valves" — the parenthetical between
    //     the prefix and "valves" needs to be allowed.
    //   - "gate valves (wedge, resilient seal and pinch types)"
    //     describes pinch / resilient-seal as **types of gate valve**,
    //     not standalone "pinch valve" phrases. We detect them via
    //     the enumeration-after-noun pattern below.
    const typePatterns: Array<{ pattern: RegExp; label: string }> = [
      // Trailing `\b` after `valves?` blocks the regex engine from
      // backtracking — without it, "gate valves for water" would
      // match by dropping the `s` (engine retries "gate valve" with
      // "s for water" as the lookahead haystack, which then passes
      // the negative lookahead). The boundary forces a non-word
      // char after "valves"/"valve", so backtracking can't satisfy.
      { pattern: /\b(?:wedge\s+)?gate\s+valves?\b(?!\s+for\s+water)/i, label: "Gate" },
      {
        pattern: /\bresilient[\s-]*seal(?:ed)?\b/i,
        label: "Resilient-seal gate",
      },
      { pattern: /\bpinch\b(?=[^.]{0,80}(?:valve|type|gate))/i, label: "Pinch" },
      { pattern: /\bbutterfly\s+valves?/i, label: "Butterfly" },
      // Allow the parenthetical between "non-return" / "check" and
      // "valves" — "non-return (check) valves" / "check (non-return)
      // valves" / "NRV" all hit this.
      {
        pattern:
          /\b(?:non[-\s]*return|check)\s*(?:\([^)]*\)\s*)?valves?|\bnon[-\s]*return\s*\(\s*check\s*\)|\bNRV\b/i,
        label: "Check / NRV",
      },
      { pattern: /\bswing[\s-]*check/i, label: "Swing check" },
      { pattern: /\bball\s+valves?/i, label: "Ball" },
      { pattern: /\bglobe\s+valves?/i, label: "Globe" },
      { pattern: /\bplug\s+valves?/i, label: "Plug" },
      { pattern: /\bknife[\s-]*gate\s+valves?/i, label: "Knife-gate" },
      {
        pattern: /\bair\s+(?:release\s+)?valves?|\bdual[\s-]*acting\s+air/i,
        label: "Air valve",
      },
      { pattern: /\bscour\s+valves?/i, label: "Scour" },
      { pattern: /\bisolating\s+valves?/i, label: "Isolating" },
      { pattern: /\bpressure[\s-]*reducing\s+valves?|\bPRV\b/i, label: "Pressure-reducing" },
      {
        pattern: /\blevel[\s-]*control\s+valves?|\baltitude\s+valves?/i,
        label: "Level / altitude control",
      },
      { pattern: /\bcontrol\s+valves?/i, label: "Control" },
    ];

    const standardPatterns: Array<{ pattern: RegExp; label: string }> = [
      { pattern: /\bSANS\s*664\b/i, label: "SANS 664" },
      { pattern: /\bSANS\s*1551(?:\s*Parts?\s*1\s*(?:&|and)\s*2)?\b/i, label: "SANS 1551" },
      { pattern: /\bSANS\s*1849\b/i, label: "SANS 1849" },
      { pattern: /\bSANS\s*1056(?:-2)?\b/i, label: "SANS 1056-2" },
      { pattern: /\bAPI\s*598\b/i, label: "API 598" },
      { pattern: /\bAPI\s*600\b/i, label: "API 600" },
      { pattern: /\bAPI\s*594\b/i, label: "API 594" },
      { pattern: /\bAPI\s*609\b/i, label: "API 609" },
      { pattern: /\bAPI\s*6D\b/i, label: "API 6D" },
      { pattern: /\bBS\s*EN\s*12266(?:-1)?\b/i, label: "BS EN 12266-1" },
      { pattern: /\bDIN\s*EN\s*558(?:-1)?\b/i, label: "DIN EN 558-1" },
      { pattern: /\bEN\s*12050(?:-4)?\b/i, label: "EN 12050-4" },
    ];

    const types = typePatterns.filter((p) => p.pattern.test(scanText)).map((p) => p.label);
    const standards = standardPatterns.filter((p) => p.pattern.test(scanText)).map((p) => p.label);

    if (types.length === 0 && standards.length === 0) {
      return { types: null, standards: null, clauseExcerpt: null };
    }

    // Pull the first substantive valve-mentioning line as a short
    // excerpt for traceability. The 30-char floor filters out lines
    // that are pure heading titles ("JW-V Valves"); we don't filter
    // OUT lines that match the section header because in practice
    // pdf-parse runs the header into the next sentence, and that
    // concatenated line is exactly the most informative excerpt.
    const excerptLine = scanLines.find(
      (line) => inlineValveMention.test(line) && line.trim().length > 30,
    );
    const trimmed = excerptLine ? excerptLine.trim() : null;
    const clauseExcerpt = trimmed ? trimmed.substring(0, 240) : null;

    return {
      types: types.length > 0 ? types : null,
      standards: standards.length > 0 ? standards : null,
      clauseExcerpt,
    };
  }

  // Detect the flange standard governing the project and any
  // specific SANS 1123 table designation (T1000 / T2500 / T4000).
  // These two pieces of data drive flange pricing, weld counts,
  // and the supplier's flange section in the BOQ.
  private extractFlangeSpec(lines: string[]): {
    standard: string | null;
    tableDesignation: string | null;
  } {
    const text = lines.join("\n");

    let standard: string | null = null;
    if (/\bSANS\s*1123\b/i.test(text)) standard = "SANS 1123";
    else if (/\bBS\s*EN\s*1092(?:-\d)?\b/i.test(text)) standard = "BS EN 1092";
    else if (/\bASME\s*B16\.5\b/i.test(text)) standard = "ASME B16.5";
    else if (/\bASME\s*B16\.47\b/i.test(text)) standard = "ASME B16.47";
    else if (/\bDIN\s*2501\b/i.test(text)) standard = "DIN 2501";

    let tableDesignation: string | null = null;
    const tableMatch = text.match(
      /\b(?:SANS|SABS)\s*1123\s*(?:Table\s*)?(?:T)?(\d{3,4})\s*\/?\s*\d?/i,
    );
    if (tableMatch) {
      tableDesignation = `T${tableMatch[1]}`;
    }

    return { standard, tableDesignation };
  }

  // Surface required NDT methods (radiography, ultrasonic, magnetic
  // particle, dye penetrant, visual). These determine the QC cost
  // burden of the project.
  private extractNdtMethods(lines: string[]): string[] | null {
    const text = lines.join("\n");
    const methods: string[] = [];

    if (/\b(?:radiograph(?:ic|y)|RT\b|X-?ray)/i.test(text)) methods.push("RT");
    if (/\b(?:ultrasonic|UT)\b/i.test(text)) methods.push("UT");
    if (/\b(?:magnetic\s+particle|MPI?|MT)\b/i.test(text)) methods.push("MT");
    if (/\b(?:dye\s+penetrant|liquid\s+penetrant|PT|DPI)\b/i.test(text)) methods.push("PT");
    if (/\b(?:visual\s+(?:inspection|examination)|VT)\b/i.test(text)) methods.push("VT");
    if (/\bhardness\s+test/i.test(text)) methods.push("Hardness");

    return methods.length > 0 ? methods : null;
  }

  // Find the hydrotest pressure multiplier (e.g. 1.5× design /
  // 1.25× MOP). Returns the multiplier as a number — the wizard
  // can later combine it with workingPressureBar to derive the
  // actual test pressure.
  private extractHydrotestMultiplier(lines: string[]): number | null {
    const text = lines.join("\n");
    const patterns = [
      /\b(?:hydro(?:static)?(?:\s+test)?|test\s+pressure)\s*(?:of|=|:|at)?\s*(\d+(?:\.\d+)?)\s*(?:x|×|times)\s*(?:design|MOP|operating|working)/i,
      /\b(\d+(?:\.\d+)?)\s*(?:x|×|times)\s*(?:design|MOP|operating|working|rated\s+working)\s+pressure/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (Number.isFinite(value) && value >= 1 && value <= 3) return value;
      }
    }
    return null;
  }

  // Working / design / operating pressure expressed in bar. Falls
  // back to kPa or MPa with unit conversion when bar isn't explicit.
  // Returns the first match — tender PDFs typically state operating
  // pressure on the cover sheet / process description page.
  private extractWorkingPressureBar(lines: string[]): number | null {
    const text = lines.join("\n");
    const labelled = text.match(
      /(?:working|design|operating|maximum|max\.?)\s*(?:pressure|press\.?)[:\s]+(\d+(?:\.\d+)?)\s*(bar|kpa|mpa|psi)\b/i,
    );
    if (labelled) {
      const value = parseFloat(labelled[1]);
      const unit = labelled[2].toLowerCase();
      if (unit === "bar") return value;
      if (unit === "kpa") return Math.round((value / 100) * 100) / 100;
      if (unit === "mpa") return value * 10;
      if (unit === "psi") return Math.round(value * 0.0689476 * 100) / 100;
    }
    // SANS 1123 table designations (1000/3, 1600/3 etc.) encode the
    // pressure in kPa as the numerator. Surface as bar so the wizard
    // populates the working-pressure field correctly when the spec
    // doesn't state pressure explicitly.
    const sansClass = text.match(/\bSANS\s*1123\s*Table\s*(\d{3,4})\/\d+\b/i);
    if (sansClass) {
      const kpa = parseInt(sansClass[1], 10);
      if (Number.isFinite(kpa)) return Math.round(kpa / 100);
    }
    return null;
  }

  // Working / design / operating temperature in °C. Handles "C",
  // "°C", "deg C" variants. Pulls the first explicit value.
  private extractWorkingTemperatureC(lines: string[]): number | null {
    const text = lines.join("\n");
    const labelled = text.match(
      /(?:working|design|operating|maximum|max\.?)\s*(?:temperature|temp\.?)[:\s]+(-?\d+(?:\.\d+)?)\s*(?:°|deg(?:rees?)?\s*)?\s*c\b/i,
    );
    if (labelled) {
      return parseFloat(labelled[1]);
    }
    return null;
  }

  // Hold time for the hydrostatic test in minutes. SANS / ASME
  // both quote either minutes or hours; we normalise to minutes.
  private extractHydrotestHoldMinutes(lines: string[]): number | null {
    const text = lines.join("\n");
    const patterns: Array<{ pattern: RegExp; multiplier: number }> = [
      {
        pattern:
          /\b(?:held|hold|maintained|sustained)\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i,
        multiplier: 60,
      },
      {
        pattern:
          /\b(?:held|hold|maintained|sustained)\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/i,
        multiplier: 1,
      },
      {
        pattern: /\bhydro(?:static)?\s*test.*?\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i,
        multiplier: 60,
      },
      {
        pattern: /\bhydro(?:static)?\s*test.*?\b(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/i,
        multiplier: 1,
      },
    ];
    for (const { pattern, multiplier } of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (Number.isFinite(value) && value > 0 && value <= 240) {
          return Math.round(value * multiplier);
        }
      }
    }
    return null;
  }

  // NACE MR0175 / MR0103 compliance for sour-service piping.
  // Returns the cited standard reference, or null if none found.
  // Customers buying NACE-compliant pipework pay a 30%+ premium
  // for material certs + traceability — flagging it ensures
  // suppliers know to price accordingly.
  private extractNaceCompliance(lines: string[]): string | null {
    const text = lines.join("\n");
    const mr0175 = text.match(/\bNACE\s*MR\s*0175\b/i);
    if (mr0175) return "NACE MR0175";
    const mr0103 = text.match(/\bNACE\s*MR\s*0103\b/i);
    if (mr0103) return "NACE MR0103";
    const iso15156 = text.match(/\bISO\s*15156(?:-\d)?\b/i);
    if (iso15156) return "ISO 15156";
    const generic = text.match(/\bNACE\s*(?:compli(?:ant|ance)|certifi(?:ed|cation))\b/i);
    if (generic) return "NACE compliance required";
    return null;
  }

  // Sour-service indicator — H₂S exposure, sour gas, sour service.
  // Drives material selection (no free-cutting steels, hardness
  // capped at 22 HRC for carbon steel etc.). Returns true / false /
  // null. Null = no signal either way.
  private extractSourService(lines: string[]): boolean | null {
    const text = lines.join("\n");
    if (/\b(?:sour\s*service|sour\s*gas|H[\s-]*2[\s-]*S|hydrogen\s*sulph?ide)\b/i.test(text)) {
      return true;
    }
    return null;
  }

  // Gasket material called out in the spec. Most common:
  // "spiral-wound", "metal-jacketed", "graphite", "EPDM", "NBR",
  // "PTFE", "Klingerit". Returns the first match.
  private extractGasketType(lines: string[]): string | null {
    const text = lines.join("\n");
    const patterns: Array<{ pattern: RegExp; label: string }> = [
      { pattern: /\bspiral[\s-]*wound\b/i, label: "Spiral-wound" },
      { pattern: /\bmetal[\s-]*jacket(?:ed)?\b/i, label: "Metal-jacketed" },
      { pattern: /\bgraphite\s*(?:gasket|sheet)/i, label: "Graphite" },
      { pattern: /\bring\s*type\s*joint|\bRTJ\b/i, label: "Ring Type Joint (RTJ)" },
      { pattern: /\bPTFE\s*(?:gasket|envelope)/i, label: "PTFE" },
      { pattern: /\bEPDM\s*gasket/i, label: "EPDM" },
      { pattern: /\bNBR\s*gasket|\bnitrile\s*gasket/i, label: "NBR / Nitrile" },
      { pattern: /\bKlinge?r?it/i, label: "Klingerit" },
      { pattern: /\bIFG\b|\binsert\s*filled\s*graphite/i, label: "IFG" },
    ];
    for (const { pattern, label } of patterns) {
      if (pattern.test(text)) return label;
    }
    return null;
  }
}
