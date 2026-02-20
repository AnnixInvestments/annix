import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { StockControlInvitationService } from "../services/invitation.service";

@ApiTags("Stock Control - Invitations")
@Controller("stock-control/invitations")
export class InvitationController {
  constructor(private readonly invitationService: StockControlInvitationService) {}

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post()
  @ApiOperation({ summary: "Create a team invitation" })
  async create(@Req() req: any, @Body() body: { email: string; role: string }) {
    return this.invitationService.create(req.user.companyId, req.user.id, body.email, body.role);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Get()
  @ApiOperation({ summary: "List pending invitations for company" })
  async list(@Req() req: any) {
    return this.invitationService.findByCompany(req.user.companyId);
  }

  @Get("validate/:token")
  @ApiOperation({ summary: "Validate an invitation token (public)" })
  async validate(@Param("token") token: string) {
    const invitation = await this.invitationService.findByToken(token);
    if (!invitation) {
      return { valid: false };
    }

    return {
      valid: invitation.status === "pending",
      email: invitation.email,
      role: invitation.role,
      companyName: invitation.company?.name ?? null,
      status: invitation.status,
    };
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Delete(":id")
  @ApiOperation({ summary: "Cancel an invitation" })
  async cancel(@Req() req: any, @Param("id") id: number) {
    await this.invitationService.cancel(req.user.companyId, id);
    return { message: "Invitation cancelled" };
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post(":id/resend")
  @ApiOperation({ summary: "Resend an invitation" })
  async resend(@Req() req: any, @Param("id") id: number) {
    return this.invitationService.resend(req.user.companyId, id);
  }
}
