import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminCompanyProfileService } from "./admin-company-profile.service";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { CompanyProfile } from "./entities/company-profile.entity";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin Company Profile")
@Controller("admin/company-profile")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminCompanyProfileController {
  constructor(private readonly companyProfileService: AdminCompanyProfileService) {}

  @Get()
  @ApiOperation({ summary: "Retrieve company profile" })
  @ApiResponse({ status: 200, type: CompanyProfile })
  async profile(): Promise<CompanyProfile> {
    return this.companyProfileService.profile();
  }

  @Patch()
  @ApiOperation({ summary: "Update company profile" })
  @ApiResponse({ status: 200, type: CompanyProfile })
  async updateProfile(@Body() dto: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    return this.companyProfileService.updateProfile(dto);
  }
}
