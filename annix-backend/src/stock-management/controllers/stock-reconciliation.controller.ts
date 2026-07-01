import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { StockReconciliationService } from "../services/stock-reconciliation.service";

@ApiTags("stock-management/reconciliation")
@Controller("stock-management/reconciliation")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class StockReconciliationController {
  constructor(private readonly reconciliationService: StockReconciliationService) {}

  @Get("divergence")
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({
    summary:
      "Read-only report of on-hand divergence between legacy stock_items and stock-management FIFO, plus new-system cache-invariant violations",
  })
  async divergence(@Req() req: any) {
    return this.reconciliationService.divergenceReport(Number(req.user.companyId));
  }
}
