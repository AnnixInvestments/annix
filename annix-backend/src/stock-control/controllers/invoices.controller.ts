import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { SageExportFilterDto } from "../../sage-export/dto/sage-export.dto";
import { SageExportService } from "../../sage-export/sage-export.service";
import { LinkInvoiceToDeliveryNoteDto } from "../dto/create-invoice.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import {
  CreateInvoiceDto,
  InvoiceService,
  SuggestedDeliveryNote,
} from "../services/invoice.service";
import { SageInvoiceAdapterService } from "../services/sage-invoice-adapter.service";

@ApiTags("Stock Control - Invoices")
@Controller("stock-control/invoices")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class InvoicesController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly sageAdapter: SageInvoiceAdapterService,
    private readonly sageExportService: SageExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all supplier invoices" })
  async list(@Req() req: any) {
    return this.invoiceService.findAll(req.user.companyId);
  }

  @Get("unlinked")
  @ApiOperation({ summary: "List invoices not linked to a delivery note" })
  async listUnlinked(@Req() req: any) {
    return this.invoiceService.findUnlinked(req.user.companyId);
  }

  @StockControlRoles("manager", "admin")
  @Get("export/sage-preview")
  @ApiOperation({ summary: "Preview Sage export: count and totals" })
  async sageExportPreview(@Req() req: any, @Query() filters: SageExportFilterDto) {
    return this.sageAdapter.previewCount(req.user.companyId, filters);
  }

  @StockControlRoles("manager", "admin")
  @Get("export/sage-csv")
  @ApiOperation({ summary: "Download approved invoices as Sage CSV" })
  async sageExportCsv(
    @Req() req: any,
    @Query() filters: SageExportFilterDto,
    @Res() res: Response,
  ) {
    const { invoices, invoiceIds } = await this.sageAdapter.exportableInvoices(
      req.user.companyId,
      filters,
    );
    const csv = this.sageExportService.generateCsv(invoices);
    await this.sageAdapter.markExported(req.user.companyId, invoiceIds);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="sage-export.csv"');
    res.send(csv);
  }

  @Post("auto-link")
  @ApiOperation({ summary: "Auto-link all unlinked invoices to matching delivery notes" })
  async autoLinkAll(@Req() req: any) {
    return this.invoiceService.autoLinkAllUnlinked(req.user.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Invoice by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.findById(req.user.companyId, id);
  }

  @Get(":id/suggested-delivery-notes")
  @ApiOperation({ summary: "Suggest delivery notes to link to this invoice" })
  async suggestedDeliveryNotes(
    @Req() req: any,
    @Param("id") id: number,
  ): Promise<SuggestedDeliveryNote[]> {
    return this.invoiceService.suggestDeliveryNoteMatches(req.user.companyId, id);
  }

  @Post(":id/link-delivery-note")
  @ApiOperation({ summary: "Link invoice to a delivery note" })
  async linkToDeliveryNote(
    @Req() req: any,
    @Param("id") id: number,
    @Body() dto: LinkInvoiceToDeliveryNoteDto,
  ) {
    return this.invoiceService.linkToDeliveryNote(req.user.companyId, id, dto.deliveryNoteId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new supplier invoice" })
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoiceService.create(req.user.companyId, dto);
  }

  @Post(":id/scan")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload invoice scan and trigger AI extraction" })
  async uploadScan(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.invoiceService.uploadScan(req.user.companyId, id, file);
  }

  @Post(":id/re-extract")
  @ApiOperation({ summary: "Re-trigger AI extraction on an existing invoice scan" })
  async reExtract(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.reExtract(req.user.companyId, id);
  }

  @Get(":id/clarifications")
  @ApiOperation({ summary: "Pending clarifications for invoice" })
  async clarifications(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.pendingClarifications(req.user.companyId, id);
  }

  @Post(":id/clarifications/:clarificationId")
  @ApiOperation({ summary: "Submit clarification response" })
  async submitClarification(
    @Req() req: any,
    @Param("id") id: number,
    @Param("clarificationId") clarificationId: number,
    @Body()
    body: {
      selectedStockItemId?: number;
      createNewItem?: {
        sku: string;
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
      };
      skipPriceUpdate?: boolean;
      confirmed?: boolean;
    },
  ) {
    return this.invoiceService.submitClarification(
      req.user.companyId,
      id,
      clarificationId,
      body,
      req.user.id,
    );
  }

  @Post(":id/clarifications/:clarificationId/skip")
  @ApiOperation({ summary: "Skip a clarification" })
  async skipClarification(
    @Req() req: any,
    @Param("id") id: number,
    @Param("clarificationId") clarificationId: number,
  ) {
    return this.invoiceService.skipClarification(
      req.user.companyId,
      id,
      clarificationId,
      req.user.id,
    );
  }

  @Get(":id/price-summary")
  @ApiOperation({ summary: "Price change summary for approval" })
  async priceSummary(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.priceChangeSummary(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post(":id/approve")
  @ApiOperation({ summary: "Approve and apply price updates" })
  async approve(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.approve(req.user.companyId, id, req.user.id);
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id")
  @ApiOperation({ summary: "Delete an invoice" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.remove(req.user.companyId, id);
  }
}
