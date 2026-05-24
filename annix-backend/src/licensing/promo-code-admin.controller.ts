import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreatePromoCodeDto, UpdatePromoCodeDto } from "./dto/promo-code.dto";
import type { PromoCode } from "./entities/promo-code.entity";
import type { PromoCodeRedemption } from "./entities/promo-code-redemption.entity";
import { PromoCodeService } from "./promo-code.service";

@ApiTags("Admin Promo Codes")
@Controller("admin/promo-codes")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class PromoCodeAdminController {
  constructor(
    private readonly promoCodeService: PromoCodeService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all promo codes" })
  list(): Promise<PromoCode[]> {
    return this.promoCodeService.list();
  }

  @Get(":id/redemptions")
  @ApiOperation({ summary: "List redemptions for a promo code" })
  redemptions(@Param("id", ParseIntPipe) id: number): Promise<PromoCodeRedemption[]> {
    return this.promoCodeService.redemptions(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a promo code" })
  async create(
    @Body() dto: CreatePromoCodeDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<PromoCode> {
    const userId = req.user?.id ?? null;
    const created = await this.promoCodeService.create(dto, userId);
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: "promo_code",
      entityId: created.id,
      userId,
      metadata: { code: created.code, discountType: created.discountType },
    });
    return created;
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a promo code" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePromoCodeDto,
    @Req() req: { user?: { id?: number } },
  ): Promise<PromoCode> {
    const userId = req.user?.id ?? null;
    const updated = await this.promoCodeService.update(id, dto);
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: "promo_code",
      entityId: id,
      userId,
      metadata: { ...dto },
    });
    return updated;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a promo code" })
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ): Promise<{ success: boolean }> {
    const userId = req.user?.id ?? null;
    await this.promoCodeService.remove(id);
    await this.auditService.log({
      action: AuditAction.DELETE,
      entityType: "promo_code",
      entityId: id,
      userId,
    });
    return { success: true };
  }
}
