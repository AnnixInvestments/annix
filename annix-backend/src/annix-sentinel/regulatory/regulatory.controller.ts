import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelRegulatoryService } from "./regulatory.service";

@ApiTags("annix-sentinel/regulatory")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/regulatory")
export class AnnixSentinelRegulatoryController {
  constructor(private readonly regulatoryService: AnnixSentinelRegulatoryService) {}

  @Get("updates")
  async recentUpdates(@Query("limit") limit?: string) {
    const parsedLimit = limit != null ? parseInt(limit, 10) : 10;
    return this.regulatoryService.recentUpdates(parsedLimit);
  }

  @Get("updates/category/:category")
  async updatesByCategory(@Param("category") category: string) {
    return this.regulatoryService.updatesByCategory(category);
  }

  @Post("updates")
  async createUpdate(
    @Body()
    body: {
      title: string;
      summary: string;
      category: string;
      effectiveDate?: string;
      sourceUrl?: string;
      affectedRequirementCodes?: string[];
    },
  ) {
    return this.regulatoryService.createUpdate(body);
  }
}
