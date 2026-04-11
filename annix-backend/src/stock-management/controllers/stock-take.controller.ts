import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type { StockTakeStatus } from "../entities/stock-take.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import {
  type CreateStockTakeInput,
  type RecordCountInput,
  StockTakeService,
} from "../services/stock-take.service";
import { StockTakeExportService } from "../services/stock-take-export.service";

interface RejectBody {
  reason: string;
}

@ApiTags("stock-management/stock-take")
@Controller("stock-management/stock-take")
@UseGuards(JwtAuthGuard, StockManagementFeatureGuard)
export class StockTakeController {
  constructor(
    private readonly stockTakeService: StockTakeService,
    private readonly exportService: StockTakeExportService,
  ) {}

  @Get()
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "List stock takes for the calling company" })
  async list(@Req() req: any, @Query("status") status?: StockTakeStatus) {
    return this.stockTakeService.list(Number(req.user.companyId), status);
  }

  @Get(":id")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Get a single stock take with all lines" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.stockTakeService.byId(Number(req.user.companyId), id);
  }

  @Post()
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Create a new draft stock take" })
  async create(@Req() req: any, @Body() body: CreateStockTakeInput) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? null;
    return this.stockTakeService.createSession(Number(req.user.companyId), {
      ...body,
      startedByStaffId: staffId,
    });
  }

  @Post(":id/snapshot")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Capture a snapshot of stock for an existing draft stock take" })
  async snapshot(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.stockTakeService.captureSnapshot(Number(req.user.companyId), id);
  }

  @Post(":id/count")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Record a counted quantity against a stock take line" })
  async recordCount(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RecordCountInput,
  ) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.stockTakeService.recordCount(Number(req.user.companyId), id, {
      ...body,
      countedByStaffId: staffId,
    });
  }

  @Post(":id/submit")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Submit the stock take for approval" })
  async submit(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.stockTakeService.submitForApproval(Number(req.user.companyId), id, staffId);
  }

  @Post(":id/approve")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Approve a pending stock take" })
  async approve(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    const role = (req.user.roles ?? [])[0] ?? "manager";
    return this.stockTakeService.approve(Number(req.user.companyId), id, staffId, role);
  }

  @Post(":id/reject")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Reject a pending stock take" })
  async reject(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Body() body: RejectBody) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.stockTakeService.reject(Number(req.user.companyId), id, staffId, body.reason);
  }

  @Post(":id/post")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({
    summary: "Post the stock take adjustments and update product quantities + valuation",
  })
  async post(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const staffId = req.user.linkedStaffId ?? req.user.id ?? 0;
    return this.stockTakeService.post(Number(req.user.companyId), id, staffId);
  }

  @Get(":id/export.pdf")
  @StockManagementFeature("VALUATION_EXPORTS")
  @Header("Content-Type", "application/pdf")
  @ApiOperation({ summary: "Export a stock take as a PDF report" })
  async exportPdf(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.exportService.exportPdf(Number(req.user.companyId), id);
    res.setHeader("Content-Disposition", `attachment; filename="stock-take-${id}.pdf"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.end(buffer);
  }

  @Get(":id/export.csv")
  @StockManagementFeature("VALUATION_EXPORTS")
  @Header("Content-Type", "text/csv")
  @ApiOperation({
    summary: "Export a stock take as a CSV file (opens in Excel / Numbers / Sheets)",
  })
  async exportCsv(@Req() req: any, @Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const csv = await this.exportService.exportCsv(Number(req.user.companyId), id);
    res.setHeader("Content-Disposition", `attachment; filename="stock-take-${id}.csv"`);
    res.send(csv);
  }
}
