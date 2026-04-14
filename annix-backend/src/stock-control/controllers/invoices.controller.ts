import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { IdempotencyInterceptor } from "../../shared/interceptors/idempotency.interceptor";
import { UpdateInvoiceItemDto } from "../dto/additional.dto";
import { LinkInvoiceToDeliveryNoteDto, SubmitClarificationDto } from "../dto/create-invoice.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import {
  CreateInvoiceDto,
  InvoiceService,
  SuggestedDeliveryNote,
} from "../services/invoice.service";
import { InvoiceExtractionService } from "../services/invoice-extraction.service";
import { SageInvoiceAdapterService } from "../services/sage-invoice-adapter.service";

@ApiTags("Stock Control - Invoices")
@Controller("stock-control/invoices")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class InvoicesController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly extractionService: InvoiceExtractionService,
    private readonly sageAdapter: SageInvoiceAdapterService,
    private readonly sageExportService: SageExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all supplier invoices" })
  async list(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    return this.invoiceService.findAll(req.user.companyId, pageNum, limitNum);
  }

  @Get("unlinked")
  @ApiOperation({ summary: "List invoices not linked to a delivery note" })
  async listUnlinked(@Req() req: any) {
    return this.invoiceService.findUnlinked(req.user.companyId);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("invoices.sage-export")
  @Get("export/sage-preview")
  @ApiOperation({ summary: "Preview Sage export: count and totals" })
  async sageExportPreview(@Req() req: any, @Query() filters: SageExportFilterDto) {
    const context = { companyId: req.user.companyId, appKey: "stock-control" };
    return this.sageAdapter.previewCount(filters, context);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("invoices.sage-export")
  @Get("export/sage-csv")
  @ApiOperation({ summary: "Download approved invoices as Sage CSV" })
  async sageExportCsv(
    @Req() req: any,
    @Query() filters: SageExportFilterDto,
    @Res() res: Response,
  ) {
    const context = { companyId: req.user.companyId, appKey: "stock-control" };
    const { invoices, entityIds } = await this.sageAdapter.exportableInvoices(filters, context);
    const csv = this.sageExportService.generateCsv(invoices);
    await this.sageAdapter.markExported(entityIds, context);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="sage-export.csv"');
    res.send(csv);
  }

  @Post("auto-link")
  @ApiOperation({ summary: "Auto-link all unlinked invoices to matching delivery notes" })
  async autoLinkAll(@Req() req: any) {
    return this.invoiceService.autoLinkAllUnlinked(req.user.companyId);
  }

  @Post("re-extract-all-failed")
  @ApiOperation({ summary: "Re-trigger AI extraction on all failed invoices" })
  async reExtractAllFailed(@Req() req: any) {
    return this.invoiceService.reExtractAllFailed(req.user.companyId);
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
  @UseInterceptors(IdempotencyInterceptor)
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
    @Body() dto: SubmitClarificationDto,
  ) {
    return this.invoiceService.submitClarification(
      req.user.companyId,
      id,
      clarificationId,
      dto,
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

  @StockControlRoles("accounts", "manager", "admin")
  @PermissionKey("invoices.approve")
  @Post(":id/approve")
  @ApiOperation({ summary: "Approve and apply price updates" })
  async approve(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.approve(req.user.companyId, id, req.user.id);
  }

  @StockControlRoles("accounts", "manager", "admin")
  @PermissionKey("invoices.approve")
  @Post(":id/resolve-and-approve")
  @ApiOperation({ summary: "Skip all pending clarifications and approve" })
  async resolveAndApprove(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.resolveAndApprove(req.user.companyId, id, req.user.id);
  }

  @StockControlRoles("accounts", "manager", "admin")
  @Patch(":id/items/:itemId")
  @ApiOperation({ summary: "Update an invoice line item (correction)" })
  async updateItem(
    @Req() req: any,
    @Param("id") id: number,
    @Param("itemId") itemId: number,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    await this.invoiceService.findById(req.user.companyId, id);
    return this.extractionService.updateInvoiceItem(id, itemId, dto, req.user.id);
  }

  @StockControlRoles("accounts", "manager", "admin")
  @Delete(":id/items/:itemId")
  @ApiOperation({ summary: "Delete an invoice line item" })
  async removeItem(@Req() req: any, @Param("id") id: number, @Param("itemId") itemId: number) {
    await this.invoiceService.findById(req.user.companyId, id);
    return this.extractionService.removeItem(id, itemId);
  }

  @StockControlRoles("accounts", "manager", "admin")
  @Post(":id/items/:itemId/match")
  @ApiOperation({ summary: "Manually match an invoice item to a stock item" })
  async manualMatchItem(
    @Req() req: any,
    @Param("id") id: number,
    @Param("itemId") itemId: number,
    @Body() dto: { stockItemId: number },
  ) {
    await this.invoiceService.findById(req.user.companyId, id);
    return this.extractionService.manualMatchInvoiceItem(id, itemId, dto.stockItemId, req.user.id);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("invoices.delete")
  @Delete(":id")
  @ApiOperation({ summary: "Delete an invoice" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.remove(req.user.companyId, id);
  }
}
