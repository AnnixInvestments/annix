import { Controller, Get, Header } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminCompanyProfileService } from "./admin-company-profile.service";
import { CompanyProfile } from "./entities/company-profile.entity";

@ApiTags("Public Company Profile")
@Controller("public/company-profile")
export class PublicCompanyProfileController {
  constructor(private readonly companyProfileService: AdminCompanyProfileService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=900, stale-while-revalidate=3600")
  @ApiOperation({ summary: "Retrieve public company profile (unauthenticated)" })
  @ApiResponse({ status: 200, type: CompanyProfile })
  async profile(): Promise<CompanyProfile> {
    return this.companyProfileService.profile();
  }
}
