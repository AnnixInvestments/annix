import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { SearchService } from "../services/search.service";

@ApiTags("Stock Control - Search")
@Controller("stock-control/search")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: "Global search across all entity types" })
  async search(@Req() req: any, @Query("q") query: string, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    return this.searchService.search(req.user.companyId, query || "", req.user.role, parsedLimit);
  }
}
