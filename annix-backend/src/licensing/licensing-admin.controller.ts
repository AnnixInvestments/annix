import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SetAddOnDto, SetTierFeaturesDto, SetTierPricingDto } from "./dto/licensing-admin.dto";
import type { ModuleCatalog } from "./dto/module-catalog";
import { LicensingCatalogService } from "./licensing-catalog.service";

@ApiTags("Admin Licensing")
@Controller("admin/licensing")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class LicensingAdminController {
  constructor(
    private readonly catalogService: LicensingCatalogService,
    private readonly auditService: AuditService,
  ) {}

  @Get(":moduleKey/catalog")
  @ApiOperation({ summary: "Effective (override-applied) catalog for editing" })
  catalog(@Param("moduleKey") moduleKey: string): Promise<ModuleCatalog> {
    return this.catalogService.effectiveCatalog(moduleKey);
  }

  @Put(":moduleKey/tiers/:tierKey/pricing")
  @ApiOperation({ summary: "Update a tier's pricing / seats / AI allowance / visibility" })
  async setTierPricing(
    @Param("moduleKey") moduleKey: string,
    @Param("tierKey") tierKey: string,
    @Body() dto: SetTierPricingDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<ModuleCatalog> {
    const userId = req.user?.id ?? null;
    const result = await this.catalogService.setTierPricing(moduleKey, tierKey, dto, userId);
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: "module_catalog_tier_pricing",
      userId,
      metadata: { moduleKey, tierKey, ...dto },
    });
    return result;
  }

  @Put(":moduleKey/tiers/:tierKey/features")
  @ApiOperation({ summary: "Set which features a tier includes" })
  async setTierFeatures(
    @Param("moduleKey") moduleKey: string,
    @Param("tierKey") tierKey: string,
    @Body() dto: SetTierFeaturesDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<ModuleCatalog> {
    const userId = req.user?.id ?? null;
    const result = await this.catalogService.setTierFeatures(
      moduleKey,
      tierKey,
      dto.featureKeys,
      userId,
    );
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: "module_catalog_tier_features",
      userId,
      metadata: { moduleKey, tierKey, featureKeys: dto.featureKeys },
    });
    return result;
  }

  @Put(":moduleKey/add-ons/:addOnKey")
  @ApiOperation({ summary: "Update an add-on's price / discountability" })
  async setAddOn(
    @Param("moduleKey") moduleKey: string,
    @Param("addOnKey") addOnKey: string,
    @Body() dto: SetAddOnDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<ModuleCatalog> {
    const userId = req.user?.id ?? null;
    const result = await this.catalogService.setAddOn(moduleKey, addOnKey, dto, userId);
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: "module_catalog_add_on",
      userId,
      metadata: { moduleKey, addOnKey, ...dto },
    });
    return result;
  }
}
