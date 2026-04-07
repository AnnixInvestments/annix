import { Controller, Delete, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../../guards/stock-control-role.guard";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import { QcMeasurementService } from "../services/qc-measurement.service";

@ApiTags("Stock Control - QC Records (Cross-Job-Card)")
@Controller("stock-control/qc-records")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
@StockControlRoles("quality", "manager", "admin")
@PermissionKey("qc.measurements")
export class QcRecordsController {
  constructor(private readonly qcService: QcMeasurementService) {}

  @Get("dft-readings")
  @ApiOperation({ summary: "All DFT readings across all job cards" })
  async allDftReadings(@Req() req: any) {
    return this.qcService.allDftReadings(req.user.companyId);
  }

  @Delete("dft-readings/:id")
  @ApiOperation({ summary: "Delete DFT reading by id" })
  async deleteDftReading(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteDftReading(req.user.companyId, id);
    return { deleted: true };
  }

  @Get("blast-profiles")
  @ApiOperation({ summary: "All blast profile readings across all job cards" })
  async allBlastProfiles(@Req() req: any) {
    return this.qcService.allBlastProfiles(req.user.companyId);
  }

  @Delete("blast-profiles/:id")
  @ApiOperation({ summary: "Delete blast profile by id" })
  async deleteBlastProfile(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteBlastProfile(req.user.companyId, id);
    return { deleted: true };
  }

  @Get("shore-hardness")
  @ApiOperation({ summary: "All shore hardness readings across all job cards" })
  async allShoreHardness(@Req() req: any) {
    return this.qcService.allShoreHardnessRecords(req.user.companyId);
  }

  @Delete("shore-hardness/:id")
  @ApiOperation({ summary: "Delete shore hardness record by id" })
  async deleteShoreHardness(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteShoreHardness(req.user.companyId, id);
    return { deleted: true };
  }
}
