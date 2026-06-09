import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  AdminPlatformLimitsService,
  type PlatformLimitsResponse,
} from "./admin-platform-limits.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin Platform Limits")
@Controller("admin/platform-limits")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class AdminPlatformLimitsController {
  constructor(private readonly platformLimitsService: AdminPlatformLimitsService) {}

  @Get()
  @ApiOperation({ summary: "Normalised platform capacity/limit dials for the admin dashboard" })
  limits(): Promise<PlatformLimitsResponse> {
    return this.platformLimitsService.limits();
  }
}
