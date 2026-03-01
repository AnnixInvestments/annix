import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import type {
  AnalyzedOrderData,
  AnalyzedOrderLine,
  AnalyzeOrderFilesResult,
  CreateOrderFromAnalysisDto,
} from "./dto/rubber-order-import.dto";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberLiningService } from "./rubber-lining.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

@Injectable()
export class RubberOrderImportService {
  private readonly logger = new Logger(RubberOrderImportService.name);

  constructor(
    @InjectRepository(RubberCompany)
    private companyRepository: Repository<RubberCompany>,
    @InjectRepository(RubberProduct)
    private productRepository: Repository<RubberProduct>,
    private aiChatService: AiChatService,
    private rubberLiningService: RubberLiningService,
  ) {}

  async analyzeFiles(files: Express.Multer.File[]): Promise<AnalyzeOrderFilesResult> {
    this.logger.log(`Analyzing ${files.length} files for order data...`);
    const analyzedFiles: AnalyzedOrderData[] = [];

    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      analyzedFiles.push(analysis);
    }

    const totalLines = analyzedFiles.reduce((sum, f) => sum + f.lines.length, 0);
    return { files: analyzedFiles, totalLines };
  }

  private async analyzeFile(file: Express.Multer.File): Promise<AnalyzedOrderData> {
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

    if (filenameLower.endsWith(".eml") || mimeType === "message/rfc822") {
      return this.analyzeEmail(file);
    }

    return {
      filename: file.originalname,
      fileType: "pdf",
      companyName: null,
      companyId: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [`Unsupported file type: ${file.mimetype}`],
    };
  }

  private async analyzePdf(file: Express.Multer.File): Promise<AnalyzedOrderData> {
    const result: AnalyzedOrderData = {
      filename: file.originalname,
      fileType: "pdf",
      companyName: null,
      companyId: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [],
    };

    try {
      const pdfData = await pdfParse(file.buffer);
      const text = pdfData.text || "";
      this.logger.log(`Extracted ${text.length} characters from PDF ${file.originalname}`);

      const extraction = await this.extractOrderDataWithAi(text, file.originalname);
      Object.assign(result, extraction);

      await this.matchCompanyAndProducts(result);
    } catch (error) {
      this.logger.error(`Failed to analyze PDF ${file.originalname}: ${error.message}`);
      result.errors.push(`PDF parsing failed: ${error.message}`);
    }

    return result;
  }

  private async analyzeExcel(file: Express.Multer.File): Promise<AnalyzedOrderData> {
    const result: AnalyzedOrderData = {
      filename: file.originalname,
      fileType: "excel",
      companyName: null,
      companyId: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [],
    };

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      this.logger.log(`Parsed ${rows.length} rows from Excel ${file.originalname}`);

      const textContent = this.excelToTextForAi(rows);
      const extraction = await this.extractOrderDataWithAi(textContent, file.originalname);
      Object.assign(result, extraction);

      await this.matchCompanyAndProducts(result);
    } catch (error) {
      this.logger.error(`Failed to analyze Excel ${file.originalname}: ${error.message}`);
      result.errors.push(`Excel parsing failed: ${error.message}`);
    }

    return result;
  }

  private async analyzeEmail(file: Express.Multer.File): Promise<AnalyzedOrderData> {
    const result: AnalyzedOrderData = {
      filename: file.originalname,
      fileType: "email",
      companyName: null,
      companyId: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [],
      emailSubject: null,
      emailFrom: null,
    };

    try {
      const { simpleParser } = await import("mailparser");
      const parsed = await simpleParser(file.buffer);

      result.emailSubject = parsed.subject || null;

      const fromValue = parsed.from?.value;
      result.emailFrom = Array.isArray(fromValue) ? fromValue[0]?.address || null : null;

      const bodyText = parsed.text || "";
      this.logger.log(`Parsed email ${file.originalname}: subject="${parsed.subject}"`);

      const pdfAttachments = (parsed.attachments || []).filter(
        (att) =>
          att.contentType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf"),
      );

      if (pdfAttachments.length > 0) {
        this.logger.log(`Found ${pdfAttachments.length} PDF attachments in email`);
        const pdfAtt = pdfAttachments[0];
        const pdfData = await pdfParse(pdfAtt.content);
        const pdfText = pdfData.text || "";

        const combinedText = `Email Subject: ${parsed.subject || ""}\nEmail From: ${result.emailFrom || ""}\n\nEmail Body:\n${bodyText}\n\nPDF Attachment (${pdfAtt.filename}):\n${pdfText}`;
        const extraction = await this.extractOrderDataWithAi(combinedText, file.originalname);
        Object.assign(result, extraction);
      } else {
        const extraction = await this.extractOrderDataWithAi(bodyText, file.originalname);
        Object.assign(result, extraction);
      }

      await this.matchCompanyAndProducts(result);
    } catch (error) {
      this.logger.error(`Failed to analyze email ${file.originalname}: ${error.message}`);
      result.errors.push(`Email parsing failed: ${error.message}`);
    }

    return result;
  }

  private excelToTextForAi(rows: unknown[][]): string {
    const relevantRows = rows.slice(0, 100);
    return relevantRows
      .map((row) =>
        (row as unknown[])
          .map((cell) => {
            if (cell === null || cell === undefined) {
              return "";
            }
            return String(cell);
          })
          .join("\t"),
      )
      .join("\n");
  }

  private async extractOrderDataWithAi(
    text: string,
    filename: string,
  ): Promise<Partial<AnalyzedOrderData>> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for order extraction");
      return {
        confidence: 0,
        errors: ["AI extraction service not available"],
      };
    }

    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    const systemPrompt = `You are NIX, an AI assistant for AU Industries' rubber lining operations. Your task is to extract order information from documents.

AU Industries receives rubber lining orders from customers. Orders typically contain:
- Company name (the customer placing the order)
- PO number / Purchase Order number
- Order date
- Requested delivery date
- Line items with:
  - Product description (rubber type, compound, etc.)
  - Thickness in mm
  - Width in mm
  - Length in meters
  - Quantity (number of rolls/pieces)

IMPORTANT: Extract ALL line items you can find. Look for tables, lists, or repeated patterns indicating order items.

Respond ONLY with a JSON object:
{
  "companyName": "string or null",
  "poNumber": "string or null",
  "orderDate": "ISO date string or null",
  "deliveryDate": "ISO date string or null",
  "lines": [
    {
      "lineNumber": 1,
      "productName": "string or null - the product description",
      "thickness": "number in mm or null",
      "width": "number in mm or null",
      "length": "number in meters or null",
      "quantity": "number or null",
      "confidence": 0.0-1.0,
      "rawText": "the original text this line was extracted from"
    }
  ],
  "confidence": 0.0-1.0,
  "notes": "any relevant extraction notes"
}`;

    const userMessage = `Extract order information from this document.

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
        const lines: AnalyzedOrderLine[] = (parsed.lines || []).map(
          (line: Partial<AnalyzedOrderLine>, idx: number) => ({
            lineNumber: line.lineNumber || idx + 1,
            productName: line.productName || null,
            productId: null,
            thickness: this.parseNumber(line.thickness),
            width: this.parseNumber(line.width),
            length: this.parseNumber(line.length),
            quantity: this.parseNumber(line.quantity),
            confidence: line.confidence || 0.5,
            rawText: line.rawText || null,
          }),
        );

        return {
          companyName: parsed.companyName || null,
          poNumber: parsed.poNumber || null,
          orderDate: parsed.orderDate || null,
          deliveryDate: parsed.deliveryDate || null,
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

  private async matchCompanyAndProducts(analysis: AnalyzedOrderData): Promise<void> {
    if (analysis.companyName) {
      const companies = await this.companyRepository.find();
      const companyNameLower = analysis.companyName.toLowerCase();

      const exactMatch = companies.find((c) => c.name.toLowerCase() === companyNameLower);
      if (exactMatch) {
        analysis.companyId = exactMatch.id;
        analysis.companyName = exactMatch.name;
      } else {
        const partialMatch = companies.find(
          (c) =>
            c.name.toLowerCase().includes(companyNameLower) ||
            companyNameLower.includes(c.name.toLowerCase()),
        );
        if (partialMatch) {
          analysis.companyId = partialMatch.id;
          analysis.companyName = partialMatch.name;
        }
      }
    }

    const products = await this.productRepository.find();

    analysis.lines.forEach((line) => {
      if (line.productName) {
        const productNameLower = line.productName.toLowerCase();

        const exactMatch = products.find(
          (p) => p.title && p.title.toLowerCase() === productNameLower,
        );
        if (exactMatch) {
          line.productId = exactMatch.id;
          line.productName = exactMatch.title;
        } else {
          const partialMatch = products.find(
            (p) =>
              p.title &&
              (p.title.toLowerCase().includes(productNameLower) ||
                productNameLower.includes(p.title.toLowerCase())),
          );
          if (partialMatch) {
            line.productId = partialMatch.id;
            line.productName = partialMatch.title;
          }
        }
      }
    });
  }

  async createOrderFromAnalysis(dto: CreateOrderFromAnalysisDto): Promise<{ orderId: number }> {
    const { analysis, overrides } = dto;

    const companyId = overrides?.companyId ?? analysis.companyId ?? undefined;
    const poNumber = overrides?.poNumber ?? analysis.poNumber ?? undefined;

    const items = (overrides?.lines || analysis.lines).map((line, idx) => {
      const analysisLine = analysis.lines[idx] || {};
      return {
        productId: ("productId" in line ? line.productId : analysisLine.productId) || undefined,
        thickness: ("thickness" in line ? line.thickness : analysisLine.thickness) || undefined,
        width: ("width" in line ? line.width : analysisLine.width) || undefined,
        length: ("length" in line ? line.length : analysisLine.length) || undefined,
        quantity: ("quantity" in line ? line.quantity : analysisLine.quantity) || undefined,
      };
    });

    const order = await this.rubberLiningService.createOrder({
      companyId,
      companyOrderNumber: poNumber,
      items,
    });

    this.logger.log(`Created order ${order.id} (${order.orderNumber}) from analysis`);
    return { orderId: order.id };
  }
}
