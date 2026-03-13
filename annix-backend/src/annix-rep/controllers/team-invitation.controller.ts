import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard, AnnixRepUser } from "../auth";
import { TeamRoleGuard, TeamRoles } from "../auth/guards/team-role.guard";
import { CreateInvitationDto, InvitationResponseDto } from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { TeamInvitationService } from "../services/team-invitation.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Team Invitations")
@Controller("annix-rep/team/invitations")
@ApiBearerAuth()
export class TeamInvitationController {
  constructor(private readonly invitationService: TeamInvitationService) {}

  @Post()
  @UseGuards(AnnixRepAuthGuard, TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Send team invitation" })
  @ApiResponse({ status: 201, type: InvitationResponseDto })
  async create(@Req() req: AnnixRepRequest, @Body() dto: CreateInvitationDto) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.invitationService.create(orgId, req.annixRepUser.userId, dto);
  }

  @Get()
  @UseGuards(AnnixRepAuthGuard, TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "List pending invitations" })
  @ApiResponse({ status: 200, type: [InvitationResponseDto] })
  async pending(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const invitations = await this.invitationService.findPending(orgId);
    return invitations.map((inv) => ({
      ...inv,
      invitedByName: inv.invitedBy
        ? `${inv.invitedBy.firstName ?? ""} ${inv.invitedBy.lastName ?? ""}`.trim()
        : undefined,
    }));
  }

  @Get("validate/:token")
  @ApiOperation({ summary: "Validate invitation token (public)" })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  async validate(@Param("token") token: string) {
    const invitation = await this.invitationService.findByToken(token);
    if (!invitation) {
      return { valid: false, message: "Invitation not found" };
    }
    return {
      valid: invitation.status === "pending",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        inviteeName: invitation.inviteeName,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationName: invitation.organization?.name,
        invitedByName: invitation.invitedBy
          ? `${invitation.invitedBy.firstName ?? ""} ${invitation.invitedBy.lastName ?? ""}`.trim()
          : undefined,
      },
    };
  }

  @Post(":token/accept")
  @UseGuards(AnnixRepAuthGuard)
  @ApiOperation({ summary: "Accept invitation" })
  @ApiResponse({ status: 200, description: "Invitation accepted" })
  accept(@Req() req: AnnixRepRequest, @Param("token") token: string) {
    return this.invitationService.accept(token, req.annixRepUser.userId);
  }

  @Post(":token/decline")
  @ApiOperation({ summary: "Decline invitation (public)" })
  @ApiResponse({ status: 200, description: "Invitation declined" })
  decline(@Param("token") token: string) {
    return this.invitationService.decline(token);
  }

  @Delete(":id")
  @UseGuards(AnnixRepAuthGuard, TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Cancel invitation" })
  @ApiResponse({ status: 200, description: "Invitation cancelled" })
  cancel(@Param("id", ParseIntPipe) id: number) {
    return this.invitationService.cancel(id);
  }

  @Post(":id/resend")
  @UseGuards(AnnixRepAuthGuard, TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Resend invitation" })
  @ApiResponse({ status: 200, type: InvitationResponseDto })
  resend(@Param("id", ParseIntPipe) id: number) {
    return this.invitationService.resend(id);
  }
}
