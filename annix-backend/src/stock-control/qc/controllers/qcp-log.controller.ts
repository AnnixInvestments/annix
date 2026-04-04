import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../../guards/stock-control-role.guard";
import { QcEnabledGuard } from "../guards/qc-enabled.guard";
import { QcMeasurementService } from "../services/qc-measurement.service";

@ApiTags("Stock Control - QCP Log")
@Controller("stock-control/qcp-log")
@UseGuards(StockControlAuthGuard, QcEnabledGuard, StockControlRoleGuard)
@StockControlRoles("quality", "manager", "admin")
@PermissionKey("qc.measurements")
export class QcpLogController {
  constructor(private readonly qcService: QcMeasurementService) {}

  @Get()
  @ApiOperation({ summary: "List all QCPs across all job cards" })
  @ApiQuery({ name: "search", required: false })
  async listAll(@Req() req: any, @Query("search") search?: string) {
    return this.qcService.allControlPlans(req.user.companyId, search || null);
  }
}
