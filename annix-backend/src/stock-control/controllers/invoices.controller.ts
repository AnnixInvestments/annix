import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { CreateInvoiceDto, InvoiceService } from "../services/invoice.service";

@ApiTags("Stock Control - Invoices")
@Controller("stock-control/invoices")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class InvoicesController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: "List all supplier invoices" })
  async list(@Req() req: any) {
    return this.invoiceService.findAll(req.user.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Invoice by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.invoiceService.findById(req.user.companyId, id);
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
