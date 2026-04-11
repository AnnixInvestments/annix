import { Body, Controller, Get, Param, ParseIntPipe, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import type {
  StockManagementFeatureKey,
  StockManagementTier,
} from "../config/stock-management-features.constants";
import { StockManagementLicenseService } from "../services/stock-management-license.service";

interface SetTierBody {
  tier: StockManagementTier;
  notes?: string;
}

interface SetFeatureOverrideBody {
  feature: StockManagementFeatureKey;
  enabled: boolean | null;
}

interface SetValidityBody {
  validFrom: string | null;
  validUntil: string | null;
}

interface SetActiveBody {
  active: boolean;
}

@ApiTags("stock-management/license")
@Controller("stock-management/license")
@UseGuards(JwtAuthGuard)
export class StockManagementLicenseController {
  constructor(private readonly licenseService: StockManagementLicenseService) {}

  @Get("self")
  @ApiOperation({ summary: "Snapshot the calling company's stock management license" })
  async self(@Req() req: any) {
    const companyId = Number(req.user.companyId);
    return this.licenseService.snapshot(companyId);
  }

  @Get(":companyId")
  @ApiOperation({ summary: "Snapshot a specific company's stock management license" })
  async byCompany(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.licenseService.snapshot(companyId);
  }

  @Patch(":companyId/tier")
  @ApiOperation({ summary: "Set the tier for a company's stock management license" })
  async setTier(@Param("companyId", ParseIntPipe) companyId: number, @Body() body: SetTierBody) {
    return this.licenseService.setTier(companyId, body.tier, body.notes);
  }

  @Patch(":companyId/feature-override")
  @ApiOperation({
    summary: "Override a single feature flag (true/false) or clear an override (null)",
  })
  async setFeatureOverride(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() body: SetFeatureOverrideBody,
  ) {
    return this.licenseService.setFeatureOverride(companyId, body.feature, body.enabled);
  }

  @Patch(":companyId/validity")
  @ApiOperation({ summary: "Set validFrom and validUntil for a company's license" })
  async setValidity(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() body: SetValidityBody,
  ) {
    const validFrom = body.validFrom ? new Date(body.validFrom) : null;
    const validUntil = body.validUntil ? new Date(body.validUntil) : null;
    return this.licenseService.setValidity(companyId, validFrom, validUntil);
  }

  @Patch(":companyId/active")
  @ApiOperation({ summary: "Activate or deactivate a company's license" })
  async setActive(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() body: SetActiveBody,
  ) {
    return this.licenseService.setActive(companyId, body.active);
  }
}
