import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelCompaniesService } from "./companies.service";

@ApiTags("annix-sentinel/companies")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/companies")
export class AnnixSentinelCompaniesController {
  constructor(private readonly companiesService: AnnixSentinelCompaniesService) {}

  @Get("profile")
  async profile(@Req() req: { user: { companyId: number } }) {
    return this.companiesService.companyProfile(req.user.companyId);
  }

  @Patch("profile")
  async updateProfile(@Req() req: { user: { companyId: number } }, @Body() data: Partial<Company>) {
    return this.companiesService.updateProfile(req.user.companyId, data);
  }
}
