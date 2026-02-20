import {
  Body,
  Controller,
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
import { ImportService } from "../services/import.service";

@ApiTags("Stock Control - Import")
@Controller("stock-control/import")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload and parse an Excel or PDF file for import" })
  async upload(@UploadedFile() file: Express.Multer.File) {
    const isExcel =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel";
    const isPdf = file.mimetype === "application/pdf";

    if (isExcel) {
      const rows = await this.importService.parseExcel(file.buffer);
      return { format: "excel", rows };
    } else if (isPdf) {
      const rows = await this.importService.parsePdf(file.buffer);
      return { format: "pdf", rows };
    } else {
      return { format: "unknown", rows: [], error: "Unsupported file type" };
    }
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm and import parsed rows into inventory" })
  async confirm(@Body() body: { rows: any[] }, @Req() req: any) {
    return this.importService.importRows(req.user.companyId, body.rows, req.user.name);
  }
}
