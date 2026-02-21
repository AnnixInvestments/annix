import {
  Body,
  Controller,
  Get,
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
import { JobCardImportService } from "../services/job-card-import.service";

@ApiTags("Stock Control - Job Card Import")
@Controller("stock-control/job-card-import")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
export class JobCardImportController {
  constructor(private readonly jobCardImportService: JobCardImportService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload and parse a file for job card import" })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const { headers, rawRows } = await this.jobCardImportService.parseFile(
      file.buffer,
      file.mimetype,
    );
    const savedMapping = await this.jobCardImportService.mapping(req.user.companyId);
    return { headers, rawRows, savedMapping };
  }

  @Get("mapping")
  @ApiOperation({ summary: "Get saved column mapping for job card import" })
  async savedMapping(@Req() req: any) {
    return this.jobCardImportService.mapping(req.user.companyId);
  }

  @Post("mapping")
  @ApiOperation({ summary: "Save column mapping for job card import" })
  async saveMapping(
    @Body()
    body: {
      jobNumberColumn: string;
      jobNameColumn: string;
      customerNameColumn?: string | null;
      descriptionColumn?: string | null;
    },
    @Req() req: any,
  ) {
    return this.jobCardImportService.saveMapping(req.user.companyId, body);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm and import mapped job card rows" })
  async confirm(@Body() body: { rows: any[] }, @Req() req: any) {
    return this.jobCardImportService.importJobCards(req.user.companyId, body.rows);
  }
}
