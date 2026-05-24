import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateTenantDto, InviteTenantUserDto, TransferOwnerDto } from "./dto/tenancy.dto";
import { TenancyService, type TenantSummary } from "./tenancy.service";

@ApiTags("Admin Tenancy")
@Controller("admin/tenancy")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class TenancyAdminController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly auditService: AuditService,
  ) {}

  @Get(":moduleKey/tenants")
  @ApiOperation({ summary: "List tenants for a module" })
  list(@Param("moduleKey") moduleKey: string): Promise<TenantSummary[]> {
    return this.tenancyService.listTenants(moduleKey);
  }

  @Post(":moduleKey/tenants")
  @ApiOperation({ summary: "Create a tenant (company + owner) and set its tier" })
  async create(
    @Param("moduleKey") moduleKey: string,
    @Body() dto: CreateTenantDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<TenantSummary> {
    const grantedById = req.user?.id ?? 0;
    const tenant = await this.tenancyService.createTenant(moduleKey, dto, grantedById);
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: "tenant",
      entityId: tenant.companyId,
      userId: grantedById,
      metadata: { moduleKey, companyName: dto.companyName, tier: dto.tier },
    });
    return tenant;
  }

  @Post(":moduleKey/tenants/:companyId/users")
  @ApiOperation({ summary: "Invite a user into a tenant" })
  async inviteUser(
    @Param("moduleKey") moduleKey: string,
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: InviteTenantUserDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<{ userId: number; email: string }> {
    const grantedById = req.user?.id ?? 0;
    const result = await this.tenancyService.inviteTenantUser(
      moduleKey,
      companyId,
      dto,
      grantedById,
    );
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: "tenant_user",
      entityId: companyId,
      userId: grantedById,
      metadata: { moduleKey, email: dto.email },
    });
    return result;
  }

  @Post(":moduleKey/tenants/:companyId/transfer-owner")
  @ApiOperation({ summary: "Transfer tenant ownership to another user in the tenant" })
  async transferOwner(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Body() dto: TransferOwnerDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<TenantSummary> {
    const result = await this.tenancyService.transferOwnership(companyId, dto);
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: "tenant_owner",
      entityId: companyId,
      userId: req.user?.id ?? null,
      metadata: { newOwnerUserId: dto.newOwnerUserId },
    });
    return result;
  }
}
