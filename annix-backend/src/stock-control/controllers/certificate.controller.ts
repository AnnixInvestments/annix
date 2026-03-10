import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
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
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import {
  type CertificateFilters,
  CertificateService,
  type UploadCertificateDto,
} from "../services/certificate.service";

@ApiTags("Stock Control - Certificates")
@Controller("stock-control/certificates")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class CertificateController {
  private readonly logger = new Logger(CertificateController.name);

  constructor(private readonly certificateService: CertificateService) {}

  @Post()
  @StockControlRoles("manager", "admin")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a supplier certificate (COA/COC)" })
  async uploadCertificate(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    const dto: UploadCertificateDto = {
      supplierId: parseInt(body.supplierId, 10),
      stockItemId: body.stockItemId ? parseInt(body.stockItemId, 10) : null,
      jobCardId: body.jobCardId ? parseInt(body.jobCardId, 10) : null,
      certificateType: body.certificateType,
      batchNumber: body.batchNumber,
      description: body.description || null,
      expiryDate: body.expiryDate || null,
    };

    return this.certificateService.uploadCertificate(req.user.companyId, dto, file, req.user);
  }

  @Get()
  @ApiOperation({ summary: "List certificates with optional filters" })
  async findAll(
    @Req() req: any,
    @Query("supplierId") supplierId?: string,
    @Query("stockItemId") stockItemId?: string,
    @Query("jobCardId") jobCardId?: string,
    @Query("batchNumber") batchNumber?: string,
    @Query("certificateType") certificateType?: string,
  ) {
    const filters: CertificateFilters = {};

    if (supplierId) filters.supplierId = parseInt(supplierId, 10);
    if (stockItemId) filters.stockItemId = parseInt(stockItemId, 10);
    if (jobCardId) filters.jobCardId = parseInt(jobCardId, 10);
    if (batchNumber) filters.batchNumber = batchNumber;
    if (certificateType) filters.certificateType = certificateType;

    return this.certificateService.findAll(req.user.companyId, filters);
  }

  @Get("batch/:batchNumber")
  @ApiOperation({ summary: "Find certificates by batch number" })
  async findByBatchNumber(@Req() req: any, @Param("batchNumber") batchNumber: string) {
    return this.certificateService.findByBatchNumber(req.user.companyId, batchNumber);
  }

  @Get("job-card/:jobCardId")
  @ApiOperation({ summary: "All certificates linked to a job card" })
  async certificatesForJobCard(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.certificateService.certificatesForJobCard(req.user.companyId, jobCardId);
  }

  @Get("job-card/:jobCardId/batch-records")
  @ApiOperation({ summary: "All batch records for a job card" })
  async batchRecordsForJobCard(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.certificateService.batchRecordsForJobCard(req.user.companyId, jobCardId);
  }

  @Get("job-card/:jobCardId/data-book/status")
  @ApiOperation({ summary: "Data book status for a job card" })
  async dataBookStatus(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.certificateService.dataBookStatus(req.user.companyId, jobCardId);
  }

  @Post("job-card/:jobCardId/data-book")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Compile data book for a job card" })
  async compileDataBook(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.certificateService.compileDataBook(req.user.companyId, jobCardId, req.user);
  }

  @Get("job-card/:jobCardId/data-book")
  @ApiOperation({ summary: "Download data book for a job card" })
  async downloadDataBook(
    @Req() req: any,
    @Res() res: Response,
    @Param("jobCardId") jobCardId: number,
  ) {
    const { buffer, filename } = await this.certificateService.downloadDataBook(
      req.user.companyId,
      jobCardId,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    });

    res.end(buffer);
  }

  @Get("recent-batches/:stockItemId")
  @ApiOperation({ summary: "Recent batch numbers for a stock item" })
  async recentBatches(@Req() req: any, @Param("stockItemId") stockItemId: number) {
    return this.certificateService.recentBatches(req.user.companyId, stockItemId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific certificate with presigned download URL" })
  async findById(@Req() req: any, @Param("id") id: number) {
    const cert = await this.certificateService.findById(req.user.companyId, id);
    const downloadUrl = await this.certificateService.presignedUrl(req.user.companyId, id);
    return { ...cert, downloadUrl };
  }

  @Delete(":id")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Delete a certificate" })
  async deleteCertificate(@Req() req: any, @Param("id") id: number) {
    await this.certificateService.deleteCertificate(req.user.companyId, id);
    return { deleted: true };
  }
}
