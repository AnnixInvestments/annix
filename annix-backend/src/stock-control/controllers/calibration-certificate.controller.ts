import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import {
  CalibrationCertificateService,
  type UpdateCalibrationCertificateDto,
  type UploadCalibrationCertificateDto,
} from "../services/calibration-certificate.service";

@ApiTags("Stock Control - Calibration Certificates")
@Controller("stock-control/calibration-certificates")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
export class CalibrationCertificateController {
  private readonly logger = new Logger(CalibrationCertificateController.name);

  constructor(private readonly calCertService: CalibrationCertificateService) {}

  @Post()
  @StockControlRoles("manager", "admin")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a calibration certificate" })
  async uploadCalibrationCertificate(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    const dto: UploadCalibrationCertificateDto = {
      equipmentName: body.equipmentName,
      equipmentIdentifier: body.equipmentIdentifier || null,
      certificateNumber: body.certificateNumber || null,
      description: body.description || null,
      expiryDate: body.expiryDate,
    };

    return this.calCertService.uploadCalibrationCertificate(
      req.user.companyId,
      dto,
      file,
      req.user,
    );
  }

  @Get()
  @ApiOperation({ summary: "List calibration certificates" })
  async findAll(@Req() req: any, @Query("active") active?: string) {
    const filters: { active?: boolean } = {};

    if (active === "true") filters.active = true;
    if (active === "false") filters.active = false;

    return this.calCertService.findAll(req.user.companyId, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a calibration certificate with presigned URL" })
  async findById(@Req() req: any, @Param("id") id: number) {
    const cert = await this.calCertService.findById(req.user.companyId, id);
    const downloadUrl = await this.calCertService.presignedUrl(req.user.companyId, id);
    return { ...cert, downloadUrl };
  }

  @Patch(":id")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Update calibration certificate details" })
  async updateCertificate(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: UpdateCalibrationCertificateDto,
  ) {
    return this.calCertService.updateCertificate(req.user.companyId, id, body);
  }

  @Post(":id/deactivate")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Deactivate a calibration certificate" })
  async deactivateCertificate(@Req() req: any, @Param("id") id: number) {
    return this.calCertService.deactivateCertificate(req.user.companyId, id);
  }

  @Delete(":id")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Delete a calibration certificate" })
  async deleteCertificate(@Req() req: any, @Param("id") id: number) {
    await this.calCertService.deleteCertificate(req.user.companyId, id);
    return { deleted: true };
  }
}
