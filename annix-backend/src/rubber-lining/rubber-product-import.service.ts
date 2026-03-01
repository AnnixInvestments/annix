import { Injectable, Logger } from "@nestjs/common";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import type {
  AnalyzedProductData,
  AnalyzedProductLine,
  AnalyzeProductFilesResult,
} from "./dto/rubber-product-import.dto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");

@Injectable()
export class RubberProductImportService {
  private readonly logger = new Logger(RubberProductImportService.name);

  constructor(private aiChatService: AiChatService) {}

  async analyzeFiles(files: Express.Multer.File[]): Promise<AnalyzeProductFilesResult> {
    this.logger.log(`Analyzing ${files.length} files for product data...`);
    const analyzedFiles: AnalyzedProductData[] = [];

    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      analyzedFiles.push(analysis);
    }

    const totalLines = analyzedFiles.reduce((sum, f) => sum + f.lines.length, 0);
    return { files: analyzedFiles, totalLines };
  }

  private async analyzeFile(file: Express.Multer.File): Promise<AnalyzedProductData> {
    const filenameLower = file.originalname.toLowerCase();
    const mimeType = file.mimetype.toLowerCase();

    if (filenameLower.endsWith(".pdf") || mimeType === "application/pdf") {
      return this.analyzePdf(file);
    }

    if (
      filenameLower.endsWith(".xlsx") ||
      filenameLower.endsWith(".xls") ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      return this.analyzeExcel(file);
    }

    if (
      filenameLower.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return this.analyzeWord(file);
    }

    return {
      filename: file.originalname,
      fileType: "pdf",
      lines: [],
      confidence: 0,
      errors: [`Unsupported file type: ${file.mimetype}`],
    };
  }

  private async analyzePdf(file: Express.Multer.File): Promise<AnalyzedProductData> {
    const result: AnalyzedProductData = {
      filename: file.originalname,
      fileType: "pdf",
      lines: [],
      confidence: 0,
      errors: [],
    };

    try {
      const pdfData = await pdfParse(file.buffer);
      const text = pdfData.text || "";
      this.logger.log(`Extracted ${text.length} characters from PDF ${file.originalname}`);

      const extraction = await this.extractProductDataWithAi(text, file.originalname);
      Object.assign(result, extraction);
    } catch (error) {
      this.logger.error(`Failed to analyze PDF ${file.originalname}: ${error.message}`);
      result.errors.push(`PDF parsing failed: ${error.message}`);
    }

    return result;
  }

  private async analyzeExcel(file: Express.Multer.File): Promise<AnalyzedProductData> {
    const result: AnalyzedProductData = {
      filename: file.originalname,
      fileType: "excel",
      lines: [],
      confidence: 0,
      errors: [],
    };

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

      this.logger.log(`Parsed ${rows.length} rows from Excel ${file.originalname}`);

      const lines = this.parseExcelRows(rows);
      result.lines = lines;
      result.confidence = lines.length > 0 ? 0.9 : 0;
    } catch (error) {
      this.logger.error(`Failed to analyze Excel ${file.originalname}: ${error.message}`);
      result.errors.push(`Excel parsing failed: ${error.message}`);
    }

    return result;
  }

  private parseExcelRows(rows: Record<string, unknown>[]): AnalyzedProductLine[] {
    const headerMapping = this.detectHeaderMapping(rows[0] || {});

    return rows
      .map((row, index) => {
        const title = this.extractStringField(row, headerMapping.title);
        const type = this.extractStringField(row, headerMapping.type);
        const compound = this.extractStringField(row, headerMapping.compound);
        const colour = this.extractStringField(row, headerMapping.colour);
        const hardness = this.extractStringField(row, headerMapping.hardness);
        const grade = this.extractStringField(row, headerMapping.grade);
        const curingMethod = this.extractStringField(row, headerMapping.curingMethod);
        const specificGravity = this.extractNumericField(row, headerMapping.specificGravity);
        const baseCostPerKg = this.extractNumericField(row, headerMapping.baseCostPerKg);

        const hasTitle = !!title;
        const hasCost = baseCostPerKg !== null;

        return {
          lineNumber: index + 1,
          title,
          type,
          compound,
          colour,
          hardness,
          grade,
          curingMethod,
          specificGravity,
          baseCostPerKg,
          confidence: hasTitle && hasCost ? 0.95 : hasTitle ? 0.7 : 0.3,
          rawText: JSON.stringify(row),
        };
      })
      .filter((line) => line.title || line.compound || line.baseCostPerKg !== null);
  }

  private detectHeaderMapping(firstRow: Record<string, unknown>): Record<string, string[]> {
    const keys = Object.keys(firstRow);

    return {
      title: this.findMatchingKeys(keys, [
        "title",
        "name",
        "product",
        "product name",
        "description",
        "item",
      ]),
      type: this.findMatchingKeys(keys, ["type", "product type", "category"]),
      compound: this.findMatchingKeys(keys, [
        "compound",
        "rubber compound",
        "material",
        "rubber type",
        "rubber",
      ]),
      colour: this.findMatchingKeys(keys, ["colour", "color", "col"]),
      hardness: this.findMatchingKeys(keys, ["hardness", "shore", "shore a", "durometer"]),
      grade: this.findMatchingKeys(keys, ["grade", "quality"]),
      curingMethod: this.findMatchingKeys(keys, [
        "curing",
        "curing method",
        "cure",
        "vulcanization",
      ]),
      specificGravity: this.findMatchingKeys(keys, [
        "specific gravity",
        "sg",
        "density",
        "spec grav",
      ]),
      baseCostPerKg: this.findMatchingKeys(keys, [
        "cost",
        "price",
        "cost per kg",
        "price per kg",
        "cost/kg",
        "price/kg",
        "unit price",
        "rate",
        "zar",
        "r/kg",
      ]),
    };
  }

  private findMatchingKeys(keys: string[], patterns: string[]): string[] {
    return keys.filter((key) => {
      const normalizedKey = key
        .toLowerCase()
        .replace(/[_\-\s]+/g, " ")
        .trim();
      return patterns.some(
        (pattern) =>
          normalizedKey === pattern ||
          normalizedKey.includes(pattern) ||
          pattern.includes(normalizedKey),
      );
    });
  }

  private extractStringField(row: Record<string, unknown>, possibleKeys: string[]): string | null {
    for (const key of possibleKeys) {
      const value = row[key];
      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }
    return null;
  }

  private extractNumericField(row: Record<string, unknown>, possibleKeys: string[]): number | null {
    for (const key of possibleKeys) {
      const value = row[key];
      if (value !== null && value !== undefined) {
        const strValue = String(value)
          .replace(/[R$,\s]/g, "")
          .trim();
        const num = parseFloat(strValue);
        if (!Number.isNaN(num)) {
          return num;
        }
      }
    }
    return null;
  }

  private async analyzeWord(file: Express.Multer.File): Promise<AnalyzedProductData> {
    const result: AnalyzedProductData = {
      filename: file.originalname,
      fileType: "word",
      lines: [],
      confidence: 0,
      errors: [],
    };

    try {
      const textResult = await mammoth.extractRawText({ buffer: file.buffer });
      const text = textResult.value || "";

      this.logger.log(`Extracted ${text.length} characters from Word ${file.originalname}`);

      const extraction = await this.extractProductDataWithAi(text, file.originalname);
      Object.assign(result, extraction);
    } catch (error) {
      this.logger.error(`Failed to analyze Word ${file.originalname}: ${error.message}`);
      result.errors.push(`Word parsing failed: ${error.message}`);
    }

    return result;
  }

  private async extractProductDataWithAi(
    text: string,
    filename: string,
  ): Promise<Partial<AnalyzedProductData>> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for product extraction");
      return {
        confidence: 0,
        errors: ["AI extraction service not available"],
      };
    }

    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    const systemPrompt = `You are NIX, an AI assistant for AU Industries' rubber lining operations. Your task is to extract product pricing information from documents.

AU Industries sells rubber lining products. Price lists typically contain:
- Product name/title
- Product type (e.g., Sheet, Roll, Liner, Gasket)
- Compound type (e.g., Natural Rubber, Nitrile, EPDM, Neoprene, Butyl, Chlorobutyl)
- Colour
- Hardness (Shore A value, e.g., 40, 50, 60, 70)
- Grade
- Curing method
- Specific gravity
- Cost/price per kg

IMPORTANT: Extract ALL product lines you can find. Look for tables, lists, or repeated patterns indicating product items.

Respond ONLY with a JSON object:
{
  "lines": [
    {
      "lineNumber": 1,
      "title": "string or null - the product name/title",
      "type": "string or null - product type",
      "compound": "string or null - rubber compound type",
      "colour": "string or null",
      "hardness": "string or null - Shore A value",
      "grade": "string or null",
      "curingMethod": "string or null",
      "specificGravity": "number or null",
      "baseCostPerKg": "number or null - the cost/price per kg",
      "confidence": 0.0-1.0,
      "rawText": "the original text this line was extracted from"
    }
  ],
  "confidence": 0.0-1.0,
  "notes": "any relevant extraction notes"
}`;

    const userMessage = `Extract product pricing information from this document.

Filename: ${filename}

Document content:
${truncatedText}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      this.logger.log(`NIX extraction response: ${response.content.substring(0, 500)}...`);

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const lines: AnalyzedProductLine[] = (parsed.lines || []).map(
          (line: Partial<AnalyzedProductLine>, idx: number) => ({
            lineNumber: line.lineNumber || idx + 1,
            title: line.title || null,
            type: line.type || null,
            compound: line.compound || null,
            colour: line.colour || null,
            hardness: line.hardness || null,
            grade: line.grade || null,
            curingMethod: line.curingMethod || null,
            specificGravity: this.parseNumber(line.specificGravity),
            baseCostPerKg: this.parseNumber(line.baseCostPerKg),
            confidence: line.confidence || 0.5,
            rawText: line.rawText || null,
          }),
        );

        return {
          lines,
          confidence: parsed.confidence || 0.5,
        };
      }

      return {
        confidence: 0,
        errors: ["Could not parse AI response"],
      };
    } catch (error) {
      this.logger.error(`AI extraction failed: ${error.message}`);
      return {
        confidence: 0,
        errors: [`AI extraction failed: ${error.message}`],
      };
    }
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }
}
