import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import { DemoSeedService } from "../services/demo-seed.service";

@ApiTags("stock-management/demo-seed")
@Controller("stock-management/demo-seed")
@UseGuards(StockControlAuthGuard)
export class DemoSeedController {
  constructor(private readonly demoSeedService: DemoSeedService) {}

  @Post()
  @ApiOperation({
    summary:
      "Seed demo data (4 consumables, 3 paints, 3 rubber rolls + their categories, compounds, and FIFO batches) — idempotent",
  })
  async seed(@Req() req: any) {
    const companyId = Number(req.user.companyId);
    return this.demoSeedService.seed(companyId);
  }

  @Post("sync-legacy-stock")
  @ApiOperation({
    summary:
      "Sync all stock_items from stock control into sm_issuable_product — idempotent, skips already-mapped items",
  })
  async syncLegacyStock(@Req() req: any) {
    const companyId = Number(req.user.companyId);
    return this.demoSeedService.syncLegacyStock(companyId);
  }
}
