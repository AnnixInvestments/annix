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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CalloffStatus } from "../entities/cpo-calloff-record.entity";
import { CpoStatus } from "../entities/customer-purchase-order.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { CpoService } from "../services/cpo.service";
import { JobCardImportRow, JobCardImportService } from "../services/job-card-import.service";

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
  async findAll(@Req() req: any, @Query("status") status?: string) {
    return this.cpoService.findAll(req.user.companyId, status);
  }

  @Get(":id")
  @StockControlRoles("viewer", "storeman", "accounts", "manager", "admin")
  @ApiOperation({ summary: "Get a CPO by ID" })
  async findById(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.cpoService.findById(req.user.companyId, id);
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
  async confirm(@Body() body: { rows: JobCardImportRow[] }, @Req() req: any) {
    const result = await this.cpoService.createFromImportRows(
      req.user.companyId,
      body.rows,
      req.user.name || null,
    );
    return result;
  }

  @Put(":id/status")
  @ApiOperation({ summary: "Update CPO status" })
  async updateStatus(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: CpoStatus },
  ) {
    return this.cpoService.updateStatus(req.user.companyId, id, body.status);
  }

  @Get(":id/calloff-records")
  @StockControlRoles("viewer", "storeman", "accounts", "manager", "admin")
  @ApiOperation({ summary: "List call-off records for a CPO" })
  async calloffRecords(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.cpoService.calloffRecordsForCpo(req.user.companyId, id);
  }

  @Put("calloff-records/:recordId/status")
  @ApiOperation({ summary: "Update call-off record status" })
  async updateCalloffStatus(
    @Req() req: any,
    @Param("recordId", ParseIntPipe) recordId: number,
    @Body() body: { status: CalloffStatus },
  ) {
    return this.cpoService.updateCalloffStatus(req.user.companyId, recordId, body.status);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a CPO" })
  async deleteCpo(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.cpoService.deleteCpo(req.user.companyId, id);
    return { deleted: true };
  }
}
