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

@ApiTags("Stock Control - Environmental Records")
@Controller("stock-control/environmental-records")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
@StockControlRoles("quality", "manager", "admin")
@PermissionKey("qc.measurements")
export class EnvironmentalController {
  constructor(private readonly qcService: QcMeasurementService) {}

  @Get()
  @ApiOperation({ summary: "All environmental records across all job cards" })
  async listAll(@Req() req: any) {
    return this.qcService.allEnvironmentalRecords(req.user.companyId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete environmental record by id" })
  async deleteRecord(@Req() req: any, @Param("id") id: number) {
    await this.qcService.deleteEnvironmentalRecord(req.user.companyId, id);
    return { deleted: true };
  }
}
