import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateTierInviteDto, GrantTierInviteDto } from "./dto/tier-invite.dto";
import type { TierInvite } from "./entities/tier-invite.entity";
import { TierInviteService } from "./tier-invite.service";

@ApiTags("Admin Tier Invites")
@Controller("admin/access/tier-invites")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class TierInviteAdminController {
  constructor(private readonly tierInviteService: TierInviteService) {}

  @Get()
  @ApiOperation({ summary: "List tier invites for an app" })
  list(@Query("moduleKey") moduleKey: string): Promise<TierInvite[]> {
    return this.tierInviteService.listForModule(moduleKey);
  }

  @Post()
  @ApiOperation({ summary: "Invite a user to a tier with a free trial" })
  create(
    @Body() dto: CreateTierInviteDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<TierInvite> {
    const invitedById = req.user?.id ?? null;
    return this.tierInviteService.create({
      moduleKey: dto.moduleKey,
      email: dto.email,
      tierKey: dto.tierKey,
      freeDays: dto.freeDays,
      invitedById,
    });
  }

  @Post(":token/grant")
  @ApiOperation({ summary: "Apply an invite's trial to a company" })
  grant(
    @Param("token") token: string,
    @Body() dto: GrantTierInviteDto,
  ): Promise<{ granted: boolean }> {
    return this.tierInviteService.grantForCompany(token, dto.companyId);
  }
}
