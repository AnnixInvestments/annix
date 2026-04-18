import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Company } from "../../platform/entities/company.entity";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaCompaniesService } from "./companies.service";

@ApiTags("comply-sa/companies")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/companies")
export class ComplySaCompaniesController {
  constructor(private readonly companiesService: ComplySaCompaniesService) {}

  @Get("profile")
  async profile(@Req() req: { user: { companyId: number } }) {
    return this.companiesService.companyProfile(req.user.companyId);
  }

  @Patch("profile")
  async updateProfile(@Req() req: { user: { companyId: number } }, @Body() data: Partial<Company>) {
    return this.companiesService.updateProfile(req.user.companyId, data);
  }
}
