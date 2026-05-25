import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { IdentityReconciliationReportDto } from "./dto/identity-reconciliation-report.dto";
import { IdentityReconciliationService } from "./identity-reconciliation.service";

@ApiTags("Admin SSO")
@Controller("admin/sso")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class SsoAdminController {
  constructor(private readonly identityReconciliationService: IdentityReconciliationService) {}

  @Get("identity-reconciliation")
  @ApiOperation({
    summary: "Read-only cross-app identity reconciliation report for SSO planning",
  })
  @ApiResponse({
    status: 200,
    description: "Identity reconciliation report computed successfully",
    type: IdentityReconciliationReportDto,
  })
  async identityReconciliation(): Promise<IdentityReconciliationReportDto> {
    return this.identityReconciliationService.buildReport();
  }
}
