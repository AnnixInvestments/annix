import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import {
  ConfirmCpoImportDto,
  UpdateCalloffStatusDto,
  UpdateCpoStatusDto,
} from "../dto/additional.dto";
import { CalloffStatus } from "../entities/cpo-calloff-record.entity";
import { CpoStatus } from "../entities/customer-purchase-order.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { CpoService } from "../services/cpo.service";
import { JobCardImportService } from "../services/job-card-import.service";

@ApiTags("Stock Control - Customer Purchase Orders")
@Controller("stock-control/cpos")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
export class CpoController {
  private readonly logger = new Logger(CpoController.name);

  constructor(
    private readonly cpoService: CpoService,
    private readonly jobCardImportService: JobCardImportService,
  ) {}

  @Get()
  @StockControlRoles("viewer", "storeman", "accounts", "manager", "admin")
  @ApiOperation({ summary: "List all CPOs for the company" })
  async findAll(
    @Req() req: any,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    return this.cpoService.findAll(req.user.companyId, status, pageNum, limitNum);
  }

  @Get("reports/fulfillment")
  @StockControlRoles("accounts", "manager", "admin")
  @ApiOperation({ summary: "CPO fulfillment report: ordered vs fulfilled vs remaining" })
  async fulfillmentReport(@Req() req: any) {
    return this.cpoService.fulfillmentReport(req.user.companyId);
  }

  @Get("reports/calloff-breakdown")
  @StockControlRoles("accounts", "manager", "admin")
  @ApiOperation({ summary: "Call-off status breakdown (pending/called-off/delivered/invoiced)" })
  async calloffBreakdown(@Req() req: any) {
    return this.cpoService.calloffStatusBreakdown(req.user.companyId);
  }

  @Get("reports/overdue-invoices")
  @StockControlRoles("accounts", "manager", "admin")
  @ApiOperation({ summary: "Overdue invoice list (delivered 21+ days without invoice)" })
  async overdueInvoiceReport(@Req() req: any) {
    return this.cpoService.overdueInvoiceReport(req.user.companyId);
  }

  @Get("reports/export")
  @StockControlRoles("accounts", "manager", "admin")
  @ApiOperation({ summary: "Export CPO tracking data as CSV" })
  async exportCsv(@Req() req: any, @Res() res: Response) {
    const csv = await this.cpoService.exportCsv(req.user.companyId);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=cpo-tracking-export.csv");
    res.send(csv);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload and parse a file for CPO import" })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const { grid, documentNumber, drawingRows } = await this.jobCardImportService.parseFile(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
    const savedMapping = await this.jobCardImportService.mapping(req.user.companyId);
    const docMatch = file.originalname?.match(/^([A-Z]{1,5}\d{4,})/i);
    const resolvedDocNumber = documentNumber || (docMatch ? docMatch[1].toUpperCase() : null);
    return { grid, savedMapping, documentNumber: resolvedDocNumber, drawingRows };
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm and import mapped rows as CPO" })
  async confirm(@Body() dto: ConfirmCpoImportDto, @Req() req: any) {
    const result = await this.cpoService.createFromImportRows(
      req.user.companyId,
      dto.rows,
      req.user.name || null,
    );
    return result;
  }

  @Put("calloff-records/:recordId/status")
  @ApiOperation({ summary: "Update call-off record status" })
  async updateCalloffStatus(
    @Req() req: any,
    @Param("recordId", ParseIntPipe) recordId: number,
    @Body() dto: UpdateCalloffStatusDto,
  ) {
    return this.cpoService.updateCalloffStatus(
      req.user.companyId,
      recordId,
      dto.status as CalloffStatus,
    );
  }

  @Get(":id")
  @StockControlRoles("viewer", "storeman", "accounts", "manager", "admin")
  @ApiOperation({ summary: "Get a CPO by ID" })
  async findById(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.cpoService.findById(req.user.companyId, id);
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update CPO status" })
  async updateStatus(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCpoStatusDto,
  ) {
    return this.cpoService.updateStatus(req.user.companyId, id, dto.status as CpoStatus);
  }

  @Get(":id/calloff-records")
  @StockControlRoles("viewer", "storeman", "accounts", "manager", "admin")
  @ApiOperation({ summary: "List call-off records for a CPO" })
  async calloffRecords(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.cpoService.calloffRecordsForCpo(req.user.companyId, id);
  }

  @Get(":id/overdue-records")
  @StockControlRoles("viewer", "storeman", "accounts", "manager", "admin")
  @ApiOperation({ summary: "List overdue (uninvoiced 21+ days) call-off records for a CPO" })
  async overdueRecords(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.cpoService.overdueCalloffRecordsForCpo(req.user.companyId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a CPO" })
  async deleteCpo(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.cpoService.deleteCpo(req.user.companyId, id);
    return { deleted: true };
  }
}
