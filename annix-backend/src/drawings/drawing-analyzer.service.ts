import { Injectable, BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface ExtractedComponent {
  itemNumber?: string;
  description: string;
  materialType?: string;
  specification?: string;
  dimensions?: {
    diameter?: string;
    length?: string;
    thickness?: string;
    size?: string;
  };
  quantity?: number;
  unit?: string;
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DrawingAnalysisResult {
  success: boolean;
  drawingTitle?: string;
  drawingNumber?: string;
  projectName?: string;
  components: ExtractedComponent[];
  rawText?: string;
  errors: string[];
  warnings: string[];
  metadata: {
    pageCount: number;
    extractionMethod: string;
    analysisTimestamp: Date;
  };
}

@Injectable()
export class DrawingAnalyzerService {
  // Common pipe/fitting patterns for recognition
  private readonly pipePatterns = [
    /(\d+(?:\.\d+)?)\s*(?:"|inch|in|mm|nb|nps)\s*(?:dia(?:meter)?|od|id)?/gi,
    /(?:dn|nb|nps)\s*(\d+)/gi,
    /sch(?:edule)?\s*(\d+|xs|xxs|std)/gi,
  ];

  private readonly materialPatterns = [
    /(?:material|mat|spec)[\s:]*([a-z0-9\s\-\/]+)/gi,
    /(?:astm|asme|api|en|iso|sabs)\s*[a-z]?\d+/gi,
    /(?:carbon\s*steel|stainless\s*steel|cs|ss|duplex|alloy)/gi,
  ];

  private readonly componentTypePatterns: { type: string; patterns: RegExp[] }[] = [
    {
      type: 'straight_pipe',
      patterns: [/pipe/i, /tube/i, /straight\s*pipe/i, /line\s*pipe/i],
    },
    {
      type: 'bend',
      patterns: [/bend/i, /elbow/i, /\d+°?\s*bend/i, /\d+°?\s*elbow/i, /45°/i, /90°/i, /180°/i],
    },
    {
      type: 'fitting',
      patterns: [
        /tee/i, /reducer/i, /cap/i, /nipple/i, /coupling/i,
        /weldolet/i, /sockolet/i, /thredolet/i, /fitting/i,
        /branch/i, /lateral/i, /cross/i,
      ],
    },
    {
      type: 'flange',
      patterns: [/flange/i, /wn\s*flange/i, /so\s*flange/i, /blind/i, /spectacle/i, /lap\s*joint/i],
    },
    {
      type: 'valve',
      patterns: [/valve/i, /gate/i, /ball\s*valve/i, /check/i, /butterfly/i, /globe/i, /needle/i, /plug/i],
    },
    {
      type: 'support',
      patterns: [/support/i, /hanger/i, /bracket/i, /clamp/i, /anchor/i, /guide/i, /shoe/i],
    },
  ];

  async analyzePdf(buffer: Buffer): Promise<DrawingAnalysisResult> {
    const result: DrawingAnalysisResult = {
      success: false,
      components: [],
      errors: [],
      warnings: [],
      metadata: {
        pageCount: 0,
        extractionMethod: 'pdf-parse',
        analysisTimestamp: new Date(),
      },
    };

    try {
      const pdfData = await pdfParse(buffer);

      result.metadata.pageCount = pdfData.numpages;
      result.rawText = pdfData.text;

      if (!pdfData.text || pdfData.text.trim().length < 50) {
        result.warnings.push(
          'PDF contains minimal or no extractable text. This may be a scanned document or image-based PDF. ' +
          'Consider uploading a text-based PDF or manually entering the component data.'
        );
      }

      // Extract title and drawing number from first page
      const headerInfo = this.extractHeaderInfo(pdfData.text);
      result.drawingTitle = headerInfo.title;
      result.drawingNumber = headerInfo.drawingNumber;
      result.projectName = headerInfo.projectName;

      // Extract components/parts
      const components = this.extractComponents(pdfData.text);
      result.components = components;

      if (components.length === 0) {
        result.warnings.push(
          'No components could be automatically extracted. ' +
          'This may be due to non-standard formatting or a complex drawing layout.'
        );
      } else {
        result.success = true;
      }

      // Add confidence warning
      const lowConfidenceCount = components.filter(c => c.confidence === 'low').length;
      if (lowConfidenceCount > components.length / 2) {
        result.warnings.push(
          `${lowConfidenceCount} of ${components.length} extracted components have low confidence. ` +
          'Please review and verify the extracted data before creating RFQ items.'
        );
      }

    } catch (error) {
      result.errors.push(`PDF parsing failed: ${error.message}`);
      result.warnings.push(
        'Unable to parse PDF. The file may be corrupted, password-protected, or in an unsupported format.'
      );
    }

    return result;
  }

  private extractHeaderInfo(text: string): { title?: string; drawingNumber?: string; projectName?: string } {
    const result: { title?: string; drawingNumber?: string; projectName?: string } = {};
    const lines = text.split('\n').filter(l => l.trim());

    // Look for drawing number patterns
    const drawingNumberPatterns = [
      /(?:drawing\s*(?:no|number|#)?[\s:]*)([\w\-\/]+)/i,
      /(?:dwg\s*(?:no|#)?[\s:]*)([\w\-\/]+)/i,
      /(DRW[\-\s]?\d{4}[\-\s]?\d+)/i,
      /([A-Z]{2,4}[\-\/]\d{3,}[\-\/]?\w*)/i,
    ];

    for (const pattern of drawingNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.drawingNumber = match[1].trim();
        break;
      }
    }

    // Look for title patterns
    const titlePatterns = [
      /(?:title|subject|description)[\s:]*([^\n]+)/i,
      /(?:project\s*name|project)[\s:]*([^\n]+)/i,
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match) {
        const titleCandidate = match[1].trim();
        if (titleCandidate.length > 5 && titleCandidate.length < 200) {
          if (!result.title) {
            result.title = titleCandidate;
          } else if (pattern.source.includes('project')) {
            result.projectName = titleCandidate;
          }
        }
      }
    }

    return result;
  }

  private extractComponents(text: string): ExtractedComponent[] {
    const components: ExtractedComponent[] = [];
    const lines = text.split('\n').filter(l => l.trim());

    // Try to find a parts list or BOM section
    const bomStartPatterns = [
      /(?:bill\s*of\s*materials?|parts?\s*list|material\s*list|bom|schedule)/i,
    ];

    let inBomSection = false;
    let tableHeaderFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if we're entering a BOM section
      for (const pattern of bomStartPatterns) {
        if (pattern.test(line)) {
          inBomSection = true;
          continue;
        }
      }

      // Try to extract components from individual lines
      const component = this.parseComponentLine(line, lines, i);
      if (component) {
        components.push(component);
      }
    }

    // Deduplicate similar components
    return this.deduplicateComponents(components);
  }

  private parseComponentLine(line: string, allLines: string[], lineIndex: number): ExtractedComponent | null {
    // Skip very short lines or lines that look like headers
    if (line.length < 5 || /^(item|qty|description|material|size|spec)$/i.test(line)) {
      return null;
    }

    // Try to detect component type
    let detectedType: string | null = null;
    for (const { type, patterns } of this.componentTypePatterns) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          detectedType = type;
          break;
        }
      }
      if (detectedType) break;
    }

    // Skip if no component type detected
    if (!detectedType) return null;

    const component: ExtractedComponent = {
      description: line,
      confidence: 'low',
    };

    // Try to extract item number
    const itemNumMatch = line.match(/^(\d+[\.\-]?\d*)\s+/);
    if (itemNumMatch) {
      component.itemNumber = itemNumMatch[1];
      component.description = line.replace(itemNumMatch[0], '').trim();
    }

    // Try to extract quantity
    const qtyPatterns = [
      /(\d+)\s*(?:pcs?|pieces?|nos?|ea|off|units?)\b/i,
      /(?:qty|quantity)[\s:]*(\d+)/i,
      /^(\d+)\s+(?=\D)/,
    ];

    for (const pattern of qtyPatterns) {
      const match = line.match(pattern);
      if (match) {
        component.quantity = parseInt(match[1], 10);
        break;
      }
    }

    // Try to extract dimensions
    component.dimensions = this.extractDimensions(line);

    // Try to extract material specification
    component.materialType = this.extractMaterial(line);

    // Determine confidence level
    let confidenceScore = 0;
    if (component.itemNumber) confidenceScore++;
    if (component.quantity) confidenceScore++;
    if (component.dimensions && Object.keys(component.dimensions).length > 0) confidenceScore++;
    if (component.materialType) confidenceScore++;

    if (confidenceScore >= 3) {
      component.confidence = 'high';
    } else if (confidenceScore >= 1) {
      component.confidence = 'medium';
    }

    // Set unit based on type
    component.unit = this.getDefaultUnit(detectedType);

    return component;
  }

  private extractDimensions(text: string): ExtractedComponent['dimensions'] {
    const dimensions: ExtractedComponent['dimensions'] = {};

    // Extract diameter
    const diaPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:"|inch|in)\s*(?:dia|od|id)?/i,
      /(?:dn|nb|nps)\s*(\d+)/i,
      /(\d+)\s*mm\s*(?:dia|od|id)?/i,
    ];

    for (const pattern of diaPatterns) {
      const match = text.match(pattern);
      if (match) {
        dimensions.diameter = match[0];
        break;
      }
    }

    // Extract length
    const lengthPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:m|meter|metre)s?\b/i,
      /(?:length|lg|len)[\s:]*(\d+(?:\.\d+)?)\s*(?:m|mm)?/i,
    ];

    for (const pattern of lengthPatterns) {
      const match = text.match(pattern);
      if (match) {
        dimensions.length = match[0];
        break;
      }
    }

    // Extract thickness/schedule
    const thicknessPatterns = [
      /sch(?:edule)?\s*(\d+|xs|xxs|std)/i,
      /(?:thk|thickness|wall)[\s:]*(\d+(?:\.\d+)?)\s*mm/i,
    ];

    for (const pattern of thicknessPatterns) {
      const match = text.match(pattern);
      if (match) {
        dimensions.thickness = match[0];
        break;
      }
    }

    // Extract general size notation
    const sizePatterns = [
      /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i,
      /(\d+(?:\/\d+)?)\s*["']\s*x\s*(\d+(?:\/\d+)?)\s*["']/i,
    ];

    for (const pattern of sizePatterns) {
      const match = text.match(pattern);
      if (match) {
        dimensions.size = match[0];
        break;
      }
    }

    return Object.keys(dimensions).length > 0 ? dimensions : undefined;
  }

  private extractMaterial(text: string): string | undefined {
    const materialPatterns = [
      /(astm\s*[a-z]?\d+(?:\s*gr(?:ade)?\.?\s*[a-z])?)/i,
      /(asme\s*[a-z]?\d+)/i,
      /(api\s*5l\s*gr(?:ade)?\.?\s*[a-z])/i,
      /(carbon\s*steel|cs)/i,
      /(stainless\s*steel|ss\s*\d{3}[a-z]?)/i,
      /(duplex|super\s*duplex)/i,
      /(sabs?\s*\d+)/i,
    ];

    for (const pattern of materialPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return undefined;
  }

  private getDefaultUnit(componentType: string): string {
    switch (componentType) {
      case 'straight_pipe':
        return 'm';
      case 'coating':
      case 'lining':
        return 'm²';
      default:
        return 'ea';
    }
  }

  private deduplicateComponents(components: ExtractedComponent[]): ExtractedComponent[] {
    const seen = new Map<string, ExtractedComponent>();

    for (const comp of components) {
      const key = comp.description.toLowerCase().replace(/\s+/g, ' ').trim();
      const existing = seen.get(key);

      if (!existing || this.getConfidenceValue(comp.confidence) > this.getConfidenceValue(existing.confidence)) {
        seen.set(key, comp);
      }
    }

    return Array.from(seen.values());
  }

  private getConfidenceValue(confidence: 'high' | 'medium' | 'low'): number {
    switch (confidence) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  // Convert extracted components to RFQ line item format
  convertToRfqItems(components: ExtractedComponent[]): any[] {
    return components.map((comp, index) => ({
      lineNumber: index + 1,
      description: comp.description,
      itemType: this.detectItemTypeFromDescription(comp.description),
      quantity: comp.quantity || 1,
      unitOfMeasure: comp.unit || 'ea',
      specifications: {
        material: comp.materialType,
        dimensions: comp.dimensions,
      },
      notes: comp.notes,
      confidence: comp.confidence,
    }));
  }

  private detectItemTypeFromDescription(description: string): string {
    for (const { type, patterns } of this.componentTypePatterns) {
      for (const pattern of patterns) {
        if (pattern.test(description)) {
          return type;
        }
      }
    }
    return 'custom';
  }
}
