import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaRegulatoryService } from "./regulatory.service";

@ApiTags("comply-sa/regulatory")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/regulatory")
export class ComplySaRegulatoryController {
  constructor(private readonly regulatoryService: ComplySaRegulatoryService) {}

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
