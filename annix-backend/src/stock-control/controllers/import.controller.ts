import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import type { ImportRow, ReviewedRow, StockTakeVariance } from "../services/import.service";
import { ImportService } from "../services/import.service";

@ApiTags("Stock Control - Import")
@Controller("stock-control/import")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
@PermissionKey("job-cards.import")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload and parse an Excel or PDF file for import" })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { monthLabel?: string; sheetName?: string },
  ) {
    const ext = (file.originalname || "").toLowerCase().split(".").pop();
    const isExcel =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/octet-stream" ||
      ext === "xlsx" ||
      ext === "xls" ||
      ext === "csv";
    const isPdf = file.mimetype === "application/pdf";

    if (isExcel) {
      const { headers, rawRows, sheetNames, selectedSheet } =
        await this.importService.parseExcelRaw(
          file.buffer,
          body.monthLabel ?? null,
          body.sheetName ?? null,
        );
      const mapping = await this.importService.mapColumnsWithAi(headers);
      return { format: "excel", headers, rawRows, mapping, sheetNames, selectedSheet };
    } else if (isPdf) {
      const rows = await this.importService.parsePdf(file.buffer);
      return { format: "pdf", rows };
    } else {
      return { format: "unknown", rows: [], error: "Unsupported file type" };
    }
  }

  @Post("match")
  @ApiOperation({ summary: "Match import rows against existing inventory" })
  async match(@Body() body: { rows: ImportRow[] }, @Req() req: any) {
    return this.importService.matchRowsToInventory(req.user.companyId, body.rows);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm and import parsed rows into inventory" })
  async confirm(
    @Body() body: { rows: any[]; isStockTake?: boolean; stockTakeDate?: string },
    @Req() req: any,
  ) {
    return this.importService.importRows(
      req.user.companyId,
      body.rows,
      req.user.name,
      body.isStockTake ?? false,
      body.stockTakeDate ?? null,
    );
  }

  @Post("confirm-reviewed")
  @ApiOperation({ summary: "Confirm reviewed import with Nix learning from corrections" })
  async confirmReviewed(
    @Body()
    body: {
      rows: ReviewedRow[];
      isStockTake?: boolean;
      stockTakeDate?: string;
      zeroMissing?: boolean;
      stockTakePeriod?: string;
    },
    @Req() req: any,
  ) {
    return this.importService.confirmReviewedImport(
      req.user.companyId,
      body.rows,
      req.user.name,
      body.isStockTake ?? false,
      body.stockTakeDate ?? null,
      body.zeroMissing ?? false,
      body.stockTakePeriod ?? null,
    );
  }

  @Post("stock-take-variances/export")
  @ApiOperation({ summary: "Download stock-take variances as an Excel (.xlsx)" })
  async exportVariances(
    @Body() body: { variances: StockTakeVariance[] },
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.importService.buildVarianceWorkbook(body.variances ?? []);
    const stamp = new Date().toISOString().slice(0, 10);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="stock-variances-${stamp}.xlsx"`,
      "Content-Length": String(buffer.length),
    });
    res.end(buffer);
  }
}
