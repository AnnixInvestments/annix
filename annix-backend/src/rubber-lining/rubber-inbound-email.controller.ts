import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { simpleParser } from "mailparser";
import { AdminAuthGuard, AdminRequest } from "../admin/guards/admin-auth.guard";
import type {
  AnalyzeOrderFilesResult,
  CreateOrderFromAnalysisDto,
} from "./dto/rubber-order-import.dto";
import { DeliveryNoteType } from "./entities/rubber-delivery-note.entity";
import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { RubberEmailMonitorService } from "./rubber-email-monitor.service";
import {
  AnalyzeFilesResult,
  InboundEmailData,
  ProcessedEmailResult,
  RubberInboundEmailService,
} from "./rubber-inbound-email.service";
import { RubberOrderImportService } from "./rubber-order-import.service";

@ApiTags("Rubber Lining - Inbound Email")
@Controller("rubber-lining")
export class RubberInboundEmailController {
  private readonly logger = new Logger(RubberInboundEmailController.name);

  constructor(
    private readonly inboundEmailService: RubberInboundEmailService,
    private readonly emailMonitorService: RubberEmailMonitorService,
    private readonly orderImportService: RubberOrderImportService,
  ) {}

  @Post("portal/email-monitor/test")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Test IMAP email connection" })
  async testEmailConnection(): Promise<{ success: boolean; error?: string }> {
    return this.emailMonitorService.testConnection();
  }

  @Post("webhook/inbound-email")
  @ApiOperation({
    summary: "Receive inbound email webhook from email service provider",
    description:
      "Receives emails forwarded from SendGrid, Mailgun, or similar services and creates Supplier CoCs or Delivery Notes from PDF attachments",
  })
  @UseInterceptors(FilesInterceptor("attachments", 20))
  @ApiConsumes("multipart/form-data")
  async receiveInboundEmail(
    @Req() req: Request,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ProcessedEmailResult> {
    this.logger.log("Received inbound email webhook");

    try {
      const emailData = await this.parseEmailWebhook(body, files);
      return this.inboundEmailService.processInboundEmail(emailData);
    } catch (error) {
      this.logger.error(`Failed to process inbound email: ${error.message}`);
      return {
        success: false,
        cocIds: [],
        deliveryNoteIds: [],
        errors: [error.message],
      };
    }
  }

  @Post("webhook/inbound-email/raw")
  @ApiOperation({
    summary: "Receive raw email content (for Cloudflare Email Workers)",
    description: "Receives raw email content and parses it to create records",
  })
  async receiveRawEmail(@Body() body: { rawEmail: string }): Promise<ProcessedEmailResult> {
    this.logger.log("Received raw email webhook");

    try {
      const parsed = await simpleParser(body.rawEmail);

      const attachments = (parsed.attachments || [])
        .filter(
          (att) =>
            att.contentType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf"),
        )
        .map((att) => ({
          filename: att.filename || "attachment.pdf",
          content: att.content,
          contentType: att.contentType,
          size: att.size,
        }));

      const fromValue = parsed.from?.value;
      const fromAddress = Array.isArray(fromValue) ? fromValue[0]?.address || "" : "";

      const toValue = parsed.to;
      let toAddress = "";
      if (toValue) {
        if (Array.isArray(toValue)) {
          const firstTo = toValue[0];
          if (firstTo && "value" in firstTo && Array.isArray(firstTo.value)) {
            toAddress = firstTo.value[0]?.address || "";
          }
        } else if ("value" in toValue && Array.isArray(toValue.value)) {
          toAddress = toValue.value[0]?.address || "";
        }
      }

      const emailData: InboundEmailData = {
        from: fromAddress || "",
        to: toAddress || "",
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: typeof parsed.html === "string" ? parsed.html : "",
        attachments,
      };

      return this.inboundEmailService.processInboundEmail(emailData);
    } catch (error) {
      this.logger.error(`Failed to process raw email: ${error.message}`);
      return {
        success: false,
        cocIds: [],
        deliveryNoteIds: [],
        errors: [error.message],
      };
    }
  }

  @Post("portal/supplier-cocs/upload")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor("files", 20))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload supplier CoC PDF files" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        cocType: { type: "string", enum: ["COMPOUNDER", "CALENDARER"] },
        supplierCompanyId: { type: "number" },
        cocNumber: { type: "string" },
        compoundCode: { type: "string" },
      },
    },
  })
  async uploadSupplierCocs(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
    @Req() req: AdminRequest,
  ): Promise<{ cocIds: number[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    const supplierCompanyId = body.supplierCompanyId
      ? parseInt(body.supplierCompanyId, 10)
      : undefined;

    const cocType = (body.cocType as SupplierCocType) || SupplierCocType.COMPOUNDER;
    const user = req.user;
    const createdBy = user?.email || "upload";

    this.logger.log(
      `Uploading ${files.length} supplier CoC files${supplierCompanyId ? ` for company ${supplierCompanyId}` : ""}`,
    );

    const result = await this.inboundEmailService.uploadFiles(
      files,
      "supplier_coc",
      {
        supplierCompanyId,
        cocType,
        cocNumber: body.cocNumber,
        compoundCode: body.compoundCode,
      },
      createdBy,
    );

    return { cocIds: result.cocIds || [] };
  }

  @Post("portal/supplier-cocs/analyze")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor("files", 20))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Analyze supplier CoC PDF files before upload" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  async analyzeSupplierCocs(@UploadedFiles() files: Express.Multer.File[]): Promise<{
    files: Array<{
      filename: string;
      isGraph: boolean;
      cocType: string | null;
      companyId: number | null;
      companyName: string | null;
      batchNumbers: string[];
      linkedToIndex: number | null;
      compoundCode: string | null;
      extractedData: Record<string, unknown> | null;
    }>;
    dataPdfs: number[];
    graphPdfs: number[];
  }> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    this.logger.log(`Analyzing ${files.length} files before upload...`);

    const analysis = await this.inboundEmailService.analyzeFiles(files);

    return {
      files: analysis.files.map((f) => ({
        filename: f.filename,
        isGraph: f.isGraph,
        cocType: f.cocType,
        companyId: f.companyId,
        companyName: f.companyName,
        batchNumbers: f.batchNumbers,
        linkedToIndex: f.linkedToIndex,
        compoundCode: (f.extractedData?.compoundCode as string) || null,
        extractedData: f.extractedData,
      })),
      dataPdfs: analysis.dataPdfs,
      graphPdfs: analysis.graphPdfs,
    };
  }

  @Post("portal/supplier-cocs/create-from-analysis")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor("files", 20))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create supplier CoCs from analyzed files" })
  async createFromAnalysis(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { analysis: string },
    @Req() req: AdminRequest,
  ): Promise<{ cocIds: number[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    const user = req.user;
    const createdBy = user?.email || "upload";

    const analysis: AnalyzeFilesResult = JSON.parse(body.analysis);

    this.logger.log(`Creating CoCs from ${files.length} analyzed files...`);

    return this.inboundEmailService.createCocsFromAnalysis(files, analysis, createdBy);
  }

  @Post("portal/delivery-notes/upload")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor("files", 20))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload delivery note PDF files" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        deliveryNoteType: { type: "string", enum: ["COMPOUND", "ROLL"] },
        supplierCompanyId: { type: "number" },
        deliveryNoteNumber: { type: "string" },
        deliveryDate: { type: "string", format: "date" },
      },
    },
  })
  async uploadDeliveryNotes(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
    @Req() req: AdminRequest,
  ): Promise<{ deliveryNoteIds: number[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    const supplierCompanyId = parseInt(body.supplierCompanyId, 10);
    if (Number.isNaN(supplierCompanyId)) {
      throw new BadRequestException("Invalid supplierCompanyId");
    }

    const deliveryNoteType =
      (body.deliveryNoteType as DeliveryNoteType) || DeliveryNoteType.COMPOUND;
    const user = req.user;
    const createdBy = user?.email || "upload";

    this.logger.log(
      `Uploading ${files.length} delivery note files for company ${supplierCompanyId}`,
    );

    const result = await this.inboundEmailService.uploadFiles(
      files,
      "delivery_note",
      {
        supplierCompanyId,
        deliveryNoteType,
        deliveryNoteNumber: body.deliveryNoteNumber,
        deliveryDate: body.deliveryDate,
      },
      createdBy,
    );

    return { deliveryNoteIds: result.deliveryNoteIds || [] };
  }

  @Post("portal/orders/analyze")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor("files", 20))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Analyze order files (PDF, Excel, Email) for import" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
    },
  })
  async analyzeOrderFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<AnalyzeOrderFilesResult> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    this.logger.log(`Analyzing ${files.length} files for order import...`);
    return this.orderImportService.analyzeFiles(files);
  }

  @Post("portal/orders/from-analysis")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create order from analyzed file data" })
  async createOrderFromAnalysis(
    @Body() dto: CreateOrderFromAnalysisDto,
    @Req() req: AdminRequest,
  ): Promise<{ orderId: number; orderNumber: string }> {
    const user = req.user;
    this.logger.log(`Creating order from analysis by ${user?.email || "unknown"}`);

    const result = await this.orderImportService.createOrderFromAnalysis(dto);
    return {
      orderId: result.orderId,
      orderNumber: `ORD-${String(result.orderId).padStart(5, "0")}`,
    };
  }

  @Post("webhook/inbound-email/order")
  @ApiOperation({
    summary: "Receive inbound order email webhook",
    description: "Receives order emails and extracts order data from PDF attachments",
  })
  @UseInterceptors(FilesInterceptor("attachments", 20))
  @ApiConsumes("multipart/form-data")
  async receiveInboundOrderEmail(
    @Req() req: Request,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<AnalyzeOrderFilesResult> {
    this.logger.log("Received inbound order email webhook");

    const emailData = await this.parseEmailWebhook(body, files);

    const multerFiles: Express.Multer.File[] = emailData.attachments
      .filter(
        (att) =>
          att.contentType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf"),
      )
      .map((att) => ({
        fieldname: "files",
        originalname: att.filename,
        encoding: "7bit",
        mimetype: att.contentType,
        size: att.size,
        buffer: att.content,
        stream: null as never,
        destination: "",
        filename: "",
        path: "",
      }));

    if (multerFiles.length === 0) {
      return { files: [], totalLines: 0 };
    }

    return this.orderImportService.analyzeFiles(multerFiles);
  }

  private async parseEmailWebhook(
    body: Record<string, string>,
    files: Express.Multer.File[],
  ): Promise<InboundEmailData> {
    const attachments = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
      size: file.size,
    }));

    return {
      from: body.from || body.sender || body.envelope_from || "",
      to: body.to || body.recipient || body.envelope_to || "",
      subject: body.subject || "",
      text: body.text || body.plain || body.body_plain || "",
      html: body.html || body.body_html || "",
      attachments,
    };
  }
}
