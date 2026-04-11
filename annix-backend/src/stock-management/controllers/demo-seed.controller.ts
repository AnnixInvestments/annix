import { Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { DemoSeedService } from "../services/demo-seed.service";

@ApiTags("stock-management/demo-seed")
@Controller("stock-management/demo-seed")
@UseGuards(JwtAuthGuard)
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
}
