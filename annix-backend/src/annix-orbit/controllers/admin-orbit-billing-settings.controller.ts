import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { UpdateOrbitBillingModuleDto } from "../dto/orbit-billing-settings.dto";
import { OrbitBillingSettingsService } from "../services/orbit-billing-settings.service";

@Controller("admin/annix-orbit/billing-settings")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminOrbitBillingSettingsController {
  constructor(private readonly billingSettings: OrbitBillingSettingsService) {}

  @Get()
  @Roles("admin")
  settings() {
    return this.billingSettings.settings();
  }

  @Put(":module")
  @Roles("admin")
  setModule(@Param("module") module: string, @Body() body: UpdateOrbitBillingModuleDto) {
    return this.billingSettings.setEnabled(module, body.enabled);
  }
}
