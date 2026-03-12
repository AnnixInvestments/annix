import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaCompaniesService } from "./companies.service";
import { ComplySaCompany } from "./entities/company.entity";

@ApiTags("comply-sa/companies")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard)
@Controller("comply-sa/companies")
export class ComplySaCompaniesController {
  constructor(private readonly companiesService: ComplySaCompaniesService) {}

  @Get("profile")
  async profile(@Req() req: { user: { companyId: number } }) {
    return this.companiesService.companyProfile(req.user.companyId);
  }

  @Patch("profile")
  async updateProfile(
    @Req() req: { user: { companyId: number } },
    @Body() data: Partial<ComplySaCompany>,
  ) {
    return this.companiesService.updateProfile(req.user.companyId, data);
  }
}
