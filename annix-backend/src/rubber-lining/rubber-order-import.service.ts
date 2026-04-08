import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../nix/ai-providers/ai-chat.service";
import { DocumentAnnotationService } from "../nix/services/document-annotation.service";
import type {
  AnalyzedOrderData,
  AnalyzedOrderLine,
  AnalyzeOrderFilesResult,
  CreateOrderFromAnalysisDto,
  ExtractionMethod,
  NewCompanyFromAnalysis,
} from "./dto/rubber-order-import.dto";
import { CompanyType, RubberCompany } from "./entities/rubber-company.entity";
import { RubberOrderStatus } from "./entities/rubber-order.entity";
import { RubberOrderImportCorrection } from "./entities/rubber-order-import-correction.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberLiningService } from "./rubber-lining.service";
import { RubberPoTemplateService } from "./rubber-po-template.service";

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
    @InjectRepository(RubberOrderImportCorrection)
    private correctionRepository: Repository<RubberOrderImportCorrection>,
    private aiChatService: AiChatService,
    private rubberLiningService: RubberLiningService,
    private templateService: RubberPoTemplateService,
    private documentAnnotationService: DocumentAnnotationService,
  ) {}

  async analyzeFiles(files: Express.Multer.File[]): Promise<AnalyzeOrderFilesResult> {
    this.logger.log(`Analyzing ${files.length} files for order data...`);
    const analyzedFiles = await files.reduce(
      async (accPromise, file) => {
        const acc = await accPromise;
        const analysis = await this.analyzeFile(file);
        return [...acc, analysis];
      },
      Promise.resolve([] as AnalyzedOrderData[]),
    );

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
      companyVatNumber: null,
      companyAddress: null,
      companyRegistrationNumber: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [`Unsupported file type: ${file.mimetype}`],
      extractionMethod: "ai",
      templateId: null,
      templateName: null,
      formatHash: null,
      isNewFormat: false,
      isNewCustomer: false,
    };
  }

  private async analyzePdf(file: Express.Multer.File): Promise<AnalyzedOrderData> {
    const result: AnalyzedOrderData = {
      filename: file.originalname,
      fileType: "pdf",
      companyName: null,
      companyId: null,
      companyVatNumber: null,
      companyAddress: null,
      companyRegistrationNumber: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [],
      extractionMethod: "ai",
      templateId: null,
      templateName: null,
      formatHash: null,
      isNewFormat: false,
      isNewCustomer: false,
    };

    try {
      const pdfData = await pdfParse(file.buffer);
      const text = pdfData.text || "";
      const strippedText = text.replace(/\s+/g, "");
      const isTextPoor = strippedText.length < 50;
      this.logger.log(
        `Extracted ${text.length} characters from PDF ${file.originalname} (textPoor=${isTextPoor})`,
      );

      if (isTextPoor) {
        this.logger.log(
          "PDF has minimal extractable text (likely handwritten/scanned) — using full vision extraction",
        );
        const visionResult = await this.extractFullOrderWithVision(
          file.buffer,
          file.originalname,
          null,
        );
        Object.assign(result, visionResult);
        const mappedCompany = await this.resolveCompanyFromMapping(result.companyName);
        if (mappedCompany) {
          result.companyId = mappedCompany.companyId;
          result.companyName = mappedCompany.companyName;
        }
        await this.matchCompanyAndProducts(result);
        return result;
      }

      const formatHash = await this.templateService.computeFormatHash(file.buffer);
      result.formatHash = formatHash;

      const quickCompanyId = await this.detectCompanyFromText(text);

      if (quickCompanyId) {
        result.companyId = quickCompanyId;
        const company = await this.companyRepository.findOneBy({ id: quickCompanyId });
        result.companyName = company?.name || null;

        const mappedCompany = await this.resolveCompanyFromMapping(result.companyName);
        if (mappedCompany) {
          this.logger.log(
            `Company remapped via correction: "${result.companyName}" → "${mappedCompany.companyName}"`,
          );
          result.companyId = mappedCompany.companyId;
          result.companyName = mappedCompany.companyName;
          result.isNewCustomer = false;
        }

        const template = await this.templateService.findTemplateForDocument(
          quickCompanyId,
          file.buffer,
        );

        if (template) {
          this.logger.log(`Found template ${template.id} for company ${quickCompanyId}`);
          const templateResult = await this.templateService.extractUsingTemplate(
            template,
            file.buffer,
          );

          if (templateResult.overallConfidence >= 0.5) {
            result.extractionMethod = "template";
            result.templateId = template.id;
            result.templateName = template.templateName;

            if (templateResult.fields["poNumber"]) {
              result.poNumber = templateResult.fields["poNumber"].value;
            }
            const filenamePo = this.extractPoFromFilename(file.originalname);
            if (filenamePo && this.shouldPreferFilenamePo(result.poNumber, filenamePo)) {
              this.logger.log(
                `Preferring filename PO "${filenamePo}" over OCR PO "${result.poNumber}"`,
              );
              result.poNumber = filenamePo;
            }
            if (templateResult.fields["orderDate"]) {
              result.orderDate = templateResult.fields["orderDate"].value;
            }
            if (templateResult.fields["deliveryDate"]) {
              result.deliveryDate = templateResult.fields["deliveryDate"].value;
            }

            if (templateResult.fields["lineItemsTable"]) {
              const tableText = templateResult.fields["lineItemsTable"].value;
              const linesExtraction = await this.parseLineItemsWithAi(tableText, file.originalname);
              result.lines = linesExtraction.lines || [];
            }

            if (result.lines.length === 0) {
              this.logger.log(
                "Template extracted header fields but no lines - trying vision extraction",
              );
              const visionResult = await this.extractLinesWithVision(
                file.buffer,
                file.originalname,
              );
              result.lines = visionResult.lines;
              if (visionResult.poNumber && !result.poNumber) {
                result.poNumber = visionResult.poNumber;
              }
            }

            result.confidence = templateResult.overallConfidence;
            await this.templateService.recordExtractionResult(template.id, true);
            await this.matchCompanyAndProducts(result);

            this.logger.log(
              `Template extraction successful: confidence=${Math.round(result.confidence * 100)}%, lines=${result.lines.length}`,
            );
            return result;
          }

          this.logger.log(
            `Template extraction confidence too low (${Math.round(templateResult.overallConfidence * 100)}%), falling back to AI`,
          );
          await this.templateService.recordExtractionResult(template.id, false);
        } else {
          const hasOtherTemplates = await this.templateService.companyHasTemplates(quickCompanyId);
          if (hasOtherTemplates) {
            result.isNewFormat = true;
            this.logger.log(`Company ${quickCompanyId} has templates but none match this format`);
          }
        }
      } else {
        result.isNewCustomer = true;
        this.logger.log("Could not detect company from document text");
      }

      const extraction = await this.extractOrderDataWithAi(
        text,
        file.originalname,
        result.companyName,
      );
      Object.assign(result, {
        ...extraction,
        extractionMethod: "ai" as ExtractionMethod,
        formatHash,
        isNewFormat: result.isNewFormat,
        isNewCustomer: result.isNewCustomer,
      });

      if (result.lines.length === 0) {
        this.logger.log(
          "Text-based AI extraction found 0 lines — falling back to full vision extraction",
        );
        const visionResult = await this.extractFullOrderWithVision(
          file.buffer,
          file.originalname,
          result.companyName,
        );
        const visionLines = visionResult.lines || [];
        if (visionLines.length > 0) {
          result.lines = visionLines;
          result.confidence = Math.max(result.confidence || 0, visionResult.confidence || 0);
          if (!result.poNumber && visionResult.poNumber) {
            result.poNumber = visionResult.poNumber;
          }
          if (!result.companyName && visionResult.companyName) {
            result.companyName = visionResult.companyName;
          }
          if (!result.orderDate && visionResult.orderDate) {
            result.orderDate = visionResult.orderDate;
          }
          if (!result.deliveryDate && visionResult.deliveryDate) {
            result.deliveryDate = visionResult.deliveryDate;
          }
        } else if (visionResult.errors && visionResult.errors.length > 0) {
          result.errors = [...result.errors, ...visionResult.errors];
        }
      }

      await this.matchCompanyAndProducts(result);
    } catch (error) {
      this.logger.error(`Failed to analyze PDF ${file.originalname}: ${error.message}`);
      result.errors = [...result.errors, `PDF parsing failed: ${error.message}`];
    }

    return result;
  }

  private async detectCompanyFromText(text: string): Promise<number | null> {
    const companies = await this.companyRepository.find();
    const textLower = text.toLowerCase();

    const match = companies.find((company) => textLower.includes(company.name.toLowerCase()));

    if (match) {
      this.logger.log(`Detected company "${match.name}" from document text`);
      return match.id;
    }

    return null;
  }

  private async parseLineItemsWithAi(
    tableText: string,
    filename: string,
  ): Promise<{ lines: AnalyzedOrderLine[] }> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      return { lines: [] };
    }

    const systemPrompt = `You are NIX. Parse the following table text into structured line items.
Extract each row as an order line with: lineNumber, productName, thickness (mm), width (mm), length (m), quantity.
Respond ONLY with JSON: { "lines": [...] }`;

    const userMessage = `Parse this order table:\n\n${tableText}`;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        systemPrompt,
      );

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          lines: (parsed.lines || []).map((line: Partial<AnalyzedOrderLine>, idx: number) => ({
            lineNumber: line.lineNumber || idx + 1,
            productName: line.productName || null,
            productId: null,
            thickness: this.parseNumber(line.thickness),
            width: this.parseNumber(line.width),
            length: this.parseNumber(line.length),
            quantity: this.parseNumber(line.quantity),
            confidence: 0.7,
            rawText: null,
          })),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to parse line items: ${error.message}`);
    }

    return { lines: [] };
  }

  private async analyzeExcel(file: Express.Multer.File): Promise<AnalyzedOrderData> {
    const result: AnalyzedOrderData = {
      filename: file.originalname,
      fileType: "excel",
      companyName: null,
      companyId: null,
      companyVatNumber: null,
      companyAddress: null,
      companyRegistrationNumber: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [],
      extractionMethod: "ai",
      templateId: null,
      templateName: null,
      formatHash: null,
      isNewFormat: false,
      isNewCustomer: false,
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
      result.errors = [...result.errors, `Excel parsing failed: ${error.message}`];
    }

    return result;
  }

  private async analyzeEmail(file: Express.Multer.File): Promise<AnalyzedOrderData> {
    const result: AnalyzedOrderData = {
      filename: file.originalname,
      fileType: "email",
      companyName: null,
      companyId: null,
      companyVatNumber: null,
      companyAddress: null,
      companyRegistrationNumber: null,
      poNumber: null,
      orderDate: null,
      deliveryDate: null,
      lines: [],
      confidence: 0,
      errors: [],
      emailSubject: null,
      emailFrom: null,
      extractionMethod: "ai",
      templateId: null,
      templateName: null,
      formatHash: null,
      isNewFormat: false,
      isNewCustomer: false,
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
      result.errors = [...result.errors, `Email parsing failed: ${error.message}`];
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
    companyName?: string | null,
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

    const correctionHints = await this.correctionHintsForCompany(companyName || null);

    let systemPrompt = `You are NIX, an AI assistant for AU Industries' rubber lining operations. Your task is to extract order information from documents.

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
  "companyVatNumber": "string or null - VAT/tax registration number if visible",
  "companyAddress": "string or null - full address if visible",
  "companyRegistrationNumber": "string or null - company registration number if visible",
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
      "unitPrice": "number in ZAR or null - price per roll from the UNIT PRICE column",
      "confidence": 0.0-1.0,
      "rawText": "the original text this line was extracted from"
    }
  ],
  "confidence": 0.0-1.0,
  "notes": "any relevant extraction notes"
}`;

    if (correctionHints) {
      systemPrompt = `${systemPrompt}\n\n${correctionHints}`;
    }

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
            unitPrice: this.parseNumber(line.unitPrice),
            confidence: line.confidence || 0.5,
            rawText: line.rawText || null,
          }),
        );

        return {
          companyName: parsed.companyName || null,
          companyVatNumber: parsed.companyVatNumber || null,
          companyAddress: parsed.companyAddress || null,
          companyRegistrationNumber: parsed.companyRegistrationNumber || null,
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

  async resolveOrCreateCompany(
    companyName: string,
    details?: NewCompanyFromAnalysis,
  ): Promise<RubberCompany> {
    const companies = await this.companyRepository.find();
    const nameLower = companyName.toLowerCase();

    const exactMatch = companies.find((c) => c.name.toLowerCase() === nameLower);
    if (exactMatch) {
      return exactMatch;
    }

    const partialMatch = companies.find(
      (c) => c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase()),
    );
    if (partialMatch) {
      return partialMatch;
    }

    const addressObj = details?.address ? { street: details.address } : undefined;

    const created = await this.rubberLiningService.createCompany({
      name: companyName,
      companyType: CompanyType.CUSTOMER,
      vatNumber: details?.vatNumber || undefined,
      registrationNumber: details?.registrationNumber || undefined,
      address: addressObj,
    });

    this.logger.log(`Auto-created customer company: ${companyName} (id=${created.id})`);
    return this.companyRepository.findOneByOrFail({ id: created.id });
  }

  async createOrderFromAnalysis(dto: CreateOrderFromAnalysisDto): Promise<{ orderId: number }> {
    const { analysis, overrides } = dto;

    let companyId = overrides?.companyId ?? analysis.companyId ?? undefined;
    const poNumber = overrides?.poNumber ?? analysis.poNumber ?? undefined;

    if (!companyId && overrides?.newCompany) {
      const company = await this.resolveOrCreateCompany(
        overrides.newCompany.name,
        overrides.newCompany,
      );
      companyId = company.id;
    }

    const items = (overrides?.lines || analysis.lines).map((line, idx) => {
      const analysisLine = analysis.lines[idx] || {};
      const rawUnitPrice = "unitPrice" in line ? line.unitPrice : analysisLine.unitPrice;
      return {
        productId: ("productId" in line ? line.productId : analysisLine.productId) || undefined,
        thickness: ("thickness" in line ? line.thickness : analysisLine.thickness) || undefined,
        width: ("width" in line ? line.width : analysisLine.width) || undefined,
        length: ("length" in line ? line.length : analysisLine.length) || undefined,
        quantity: ("quantity" in line ? line.quantity : analysisLine.quantity) || undefined,
        cpoUnitPrice: rawUnitPrice != null ? rawUnitPrice : undefined,
      };
    });

    const order = await this.rubberLiningService.createOrder({
      companyId,
      companyOrderNumber: poNumber,
      status: RubberOrderStatus.SUBMITTED,
      items,
    });

    this.logger.log(`Created order ${order.id} (${order.orderNumber}) from analysis`);

    this.detectAndSaveCorrections(analysis, dto, companyId || null).catch((err) =>
      this.logger.error(`Failed to save order import corrections: ${err.message}`),
    );

    return { orderId: order.id };
  }

  private async extractFullOrderWithVision(
    buffer: Buffer,
    filename: string,
    companyName: string | null,
  ): Promise<Partial<AnalyzedOrderData>> {
    const isAvailable = await this.aiChatService.isAvailable();
    if (!isAvailable) {
      this.logger.warn("AI chat service not available for vision extraction");
      return { confidence: 0, errors: ["Vision extraction not available"] };
    }

    try {
      this.logger.log(`Starting full vision-based order extraction for ${filename}`);

      const correctionHints = await this.correctionHintsForCompany(companyName);

      let visionPrompt = `You are NIX, an AI assistant for AU Industries' rubber lining operations.
Analyze this purchase order document carefully. The document may be HANDWRITTEN, scanned, or a mix of printed and handwritten content. Read ALL text carefully, including handwritten notes, numbers, and annotations.

Extract the FULL order information:
- Company name (the customer placing the order — who sent this PO to AU Industries)
- PO number / Purchase Order number / Order number / PR number / Requisition number
- Order date
- Requested delivery date
- Line items

CRITICAL — HOW TO READ LINE ITEMS:
Each row in the table is one line item. The description column contains the full product spec written as free text. Common formats you will see:
- "12 ROLLS 1200x6mm x 10m Natural Rubber 60 Duro" → qty=12, width=1200mm, thickness=6mm, length=10m
- "ROLL 500AU RST 3.7 18ZG" → parse whatever dimensions you can read
- Dimensions may appear as WIDTHxTHICKNESS, THICKNESSxWIDTH, or embedded in text
- Numbers after "x" are typically dimensions in mm or m
- "AU" often refers to a width code (e.g. 500AU = 500mm wide)
- Read the QTY column (leftmost) for the quantity
- Extract ALL rows from the table, even if some fields are unclear

IMPORTANT RULES:
- Read handwritten numbers very carefully — distinguish between similar digits (1/7, 5/6, 3/8, 0/6)
- The order number may be labeled "ORDER", "PL", "PR", "PO", "Req No" — extract whatever reference number appears
- If a dimension unit is ambiguous, use context: widths are typically 300-2000mm, thicknesses 3-25mm, lengths 1-50m
- Include ALL line items, even partially legible ones (set lower confidence for unclear lines)
- Do NOT skip rows just because the handwriting is difficult

Respond ONLY with JSON:
{
  "companyName": "string or null",
  "companyVatNumber": "string or null",
  "companyAddress": "string or null",
  "companyRegistrationNumber": "string or null",
  "poNumber": "string or null",
  "orderDate": "ISO date string or null",
  "deliveryDate": "ISO date string or null",
  "lines": [
    {
      "lineNumber": 1,
      "productName": "product description as written",
      "thickness": number in mm or null,
      "width": number in mm or null,
      "length": number in meters or null,
      "quantity": number or null,
      "unitPrice": number in ZAR or null - price per roll from the UNIT PRICE column,
      "confidence": 0.0-1.0,
      "rawText": "the exact text as written on the document for this line"
    }
  ],
  "confidence": 0.0-1.0,
  "notes": "any extraction notes, legibility issues, or assumptions made"
}`;

      if (correctionHints) {
        visionPrompt = `${visionPrompt}\n\n${correctionHints}`;
      }

      const pdfBase64 = buffer.toString("base64");
      const chatResponse = await this.aiChatService.chatWithImage(
        pdfBase64,
        "application/pdf",
        visionPrompt,
      );

      const content = chatResponse.content || "";
      this.logger.log(
        `Vision PDF extraction response (${content.length} chars): ${content.substring(0, 500)}`,
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
            unitPrice: this.parseNumber(line.unitPrice),
            confidence: line.confidence || 0.6,
            rawText: line.rawText || null,
          }),
        );

        const filenamePo = this.extractPoFromFilename(filename);
        const poNumber = filenamePo || parsed.poNumber || null;

        this.logger.log(
          `Full vision extraction: company="${parsed.companyName}", PO="${poNumber}", lines=${lines.length}`,
        );

        return {
          companyName: parsed.companyName || null,
          companyVatNumber: parsed.companyVatNumber || null,
          companyAddress: parsed.companyAddress || null,
          companyRegistrationNumber: parsed.companyRegistrationNumber || null,
          poNumber,
          orderDate: parsed.orderDate || null,
          deliveryDate: parsed.deliveryDate || null,
          lines,
          confidence: parsed.confidence || 0.6,
          extractionMethod: "ai",
        };
      }

      return { confidence: 0, errors: ["Could not parse vision response"] };
    } catch (error) {
      this.logger.error(`Full vision extraction failed: ${error.message}`);
      return { confidence: 0, errors: [`Vision extraction failed: ${error.message}`] };
    }
  }

  private async extractLinesWithVision(
    buffer: Buffer,
    filename: string,
  ): Promise<{ lines: AnalyzedOrderLine[]; poNumber?: string }> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      this.logger.warn("Gemini API key not available for vision extraction");
      return { lines: [] };
    }

    try {
      this.logger.log(`Starting vision-based extraction for ${filename}`);

      const pagesResult = await this.documentAnnotationService.convertPdfToImages(buffer, 2.0);
      if (pagesResult.pages.length === 0) {
        this.logger.warn("No pages extracted from PDF for vision analysis");
        return { lines: [] };
      }

      const firstPage = pagesResult.pages[0];
      this.logger.log(
        `Sending page 1 image (${firstPage.width}x${firstPage.height}) to Gemini Vision`,
      );

      const systemPrompt = `You are NIX, an AI assistant for AU Industries' rubber lining operations.
Analyze this purchase order image and extract the order line items.

Look for:
- Product descriptions (rubber type, compound name)
- Thickness in mm
- Width in mm
- Length in meters
- Quantity (rolls/pieces)

Also extract the PO Number if visible.

Respond ONLY with JSON:
{
  "poNumber": "string or null",
  "lines": [
    {
      "lineNumber": 1,
      "productName": "product description",
      "thickness": number in mm or null,
      "width": number in mm or null,
      "length": number in meters or null,
      "quantity": number or null,
      "confidence": 0.0-1.0
    }
  ]
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: firstPage.imageData,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini Vision API error: ${response.status} - ${errorText}`);
        return { lines: [] };
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      this.logger.log(`Gemini Vision response: ${content.substring(0, 500)}`);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const lines = (parsed.lines || []).map((line: Partial<AnalyzedOrderLine>, idx: number) => ({
          lineNumber: line.lineNumber || idx + 1,
          productName: line.productName || null,
          productId: null,
          thickness: this.parseNumber(line.thickness),
          width: this.parseNumber(line.width),
          length: this.parseNumber(line.length),
          quantity: this.parseNumber(line.quantity),
          confidence: line.confidence || 0.8,
          rawText: null,
        }));
        this.logger.log(`Vision extracted ${lines.length} order lines`);
        if (parsed.poNumber) {
          this.logger.log(`Vision extracted PO Number: ${parsed.poNumber}`);
        }
        return { lines, poNumber: parsed.poNumber || undefined };
      }
    } catch (error) {
      this.logger.error(`Vision extraction failed: ${error.message}`);
    }

    return { lines: [] };
  }

  private extractPoFromFilename(filename: string): string | null {
    const patterns = [/PL[-_]?(\d+)/i, /PO[-_]?(\d+)/i, /[-_](\d{4,})[-_]/];

    for (const pattern of patterns) {
      const match = filename.match(pattern);
      if (match) {
        const poNumber = match[1] || match[0];
        this.logger.log(`Extracted PO "${poNumber}" from filename "${filename}"`);
        return poNumber;
      }
    }

    return null;
  }

  private shouldPreferFilenamePo(ocrPo: string | null, filenamePo: string): boolean {
    if (!ocrPo) {
      return true;
    }

    const ocrDigits = ocrPo.replace(/\D/g, "");
    const filenameDigits = filenamePo.replace(/\D/g, "");

    if (ocrPo.includes("/") || ocrPo.includes("\\")) {
      return true;
    }

    if (ocrDigits.length < filenameDigits.length) {
      return true;
    }

    if (ocrDigits !== filenameDigits && filenameDigits.length >= 4) {
      return true;
    }

    return false;
  }

  private async detectAndSaveCorrections(
    originalAnalysis: AnalyzedOrderData,
    dto: CreateOrderFromAnalysisDto,
    companyId: number | null,
  ): Promise<void> {
    const overrides = dto.overrides;
    if (!overrides) {
      return;
    }

    const corrections: Partial<RubberOrderImportCorrection>[] = [];

    let companyName: string | null = null;
    if (companyId) {
      const company = await this.companyRepository.findOneBy({ id: companyId });
      companyName = company?.name || null;
    }

    if (overrides.companyId && overrides.companyId !== originalAnalysis.companyId) {
      corrections.push({
        companyId: overrides.companyId,
        companyName,
        fieldName: "companyName",
        originalValue: originalAnalysis.companyName || null,
        correctedValue: companyName ?? undefined,
      });
    }

    if (
      overrides.poNumber !== undefined &&
      overrides.poNumber !== null &&
      overrides.poNumber !== originalAnalysis.poNumber
    ) {
      corrections.push({
        companyId,
        companyName,
        fieldName: "poNumber",
        originalValue: originalAnalysis.poNumber,
        correctedValue: overrides.poNumber,
      });
    }

    if (overrides.lines && originalAnalysis.lines.length > 0) {
      const lineFields = ["thickness", "width", "length", "quantity"] as const;

      overrides.lines.forEach((overrideLine, idx) => {
        const originalLine = originalAnalysis.lines[idx];
        if (!originalLine) {
          return;
        }

        lineFields.forEach((field) => {
          const overrideVal = overrideLine[field];
          const originalVal = originalLine[field];

          if (overrideVal !== undefined && overrideVal !== null && overrideVal !== originalVal) {
            corrections.push({
              companyId,
              companyName,
              fieldName: `line[${idx}].${field}`,
              originalValue: originalVal !== null ? String(originalVal) : null,
              correctedValue: String(overrideVal),
            });
          }
        });

        if (overrideLine.productId && overrideLine.productId !== originalLine.productId) {
          corrections.push({
            companyId,
            companyName,
            fieldName: `line[${idx}].productId`,
            originalValue: originalLine.productName || String(originalLine.productId || ""),
            correctedValue: String(overrideLine.productId),
          });
        }
      });
    }

    if (corrections.length === 0) {
      return;
    }

    this.logger.log(
      `Saving ${corrections.length} order import corrections for company "${companyName}"`,
    );
    await this.correctionRepository.save(corrections);
  }

  private async resolveCompanyFromMapping(
    extractedCompanyName: string | null,
  ): Promise<{ companyId: number; companyName: string } | null> {
    if (!extractedCompanyName) {
      return null;
    }

    const mapping = await this.correctionRepository.findOne({
      where: { fieldName: "companyName", originalValue: extractedCompanyName },
      order: { createdAt: "DESC" },
    });

    if (mapping?.companyId && mapping.companyName) {
      return { companyId: mapping.companyId, companyName: mapping.companyName };
    }

    return null;
  }

  private async correctionHintsForCompany(companyName: string | null): Promise<string | null> {
    if (!companyName) {
      return null;
    }

    const corrections = await this.correctionRepository.find({
      where: { companyName },
      order: { createdAt: "DESC" },
      take: 30,
    });

    if (corrections.length === 0) {
      return null;
    }

    const hints = corrections.map((c) => {
      const fieldLabel = c.fieldName.startsWith("line[")
        ? `Line ${c.fieldName.match(/\[(\d+)\]/)?.[1] || "?"}, field "${c.fieldName.replace(/line\[\d+\]\./, "")}"`
        : `Field "${c.fieldName}"`;
      return `- ${fieldLabel}: AI extracted "${c.originalValue || "(empty)"}" but correct value is "${c.correctedValue}"`;
    });

    return `PREVIOUS USER CORRECTIONS FOR THIS CUSTOMER (learn from these patterns):\n${hints.join("\n")}\nApply these correction patterns when extracting order data from this customer's POs.`;
  }
}
