import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard, AnnixRepUser } from "../auth";
import { TeamRoleGuard, TeamRoles } from "../auth/guards/team-role.guard";
import { SetReportsToDto, TeamMemberResponseDto, UpdateMemberRoleDto } from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { TeamService } from "../services/team.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Team")
@Controller("annix-rep/team")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get("members")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "List all team members" })
  @ApiResponse({ status: 200, type: [TeamMemberResponseDto] })
  async members(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const members = await this.teamService.members(orgId);
    return members.map((m) => ({
      ...m,
      userName: m.user ? `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() : undefined,
      userEmail: m.user?.email,
    }));
  }

  @Get("members/:id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get team member by ID" })
  @ApiResponse({ status: 200, type: TeamMemberResponseDto })
  memberById(@Param("id", ParseIntPipe) id: number) {
    return this.teamService.memberById(id);
  }

  @Patch("members/:id/role")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN)
  @ApiOperation({ summary: "Update member role" })
  @ApiResponse({ status: 200, type: TeamMemberResponseDto })
  updateRole(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateMemberRoleDto) {
    return this.teamService.updateMemberRole(id, dto.role);
  }

  @Delete("members/:id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN)
  @ApiOperation({ summary: "Remove team member" })
  @ApiResponse({ status: 200, description: "Member removed" })
  removeMember(@Param("id", ParseIntPipe) id: number) {
    return this.teamService.removeMember(id);
  }

  @Patch("members/:id/reports-to")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Set member's manager" })
  @ApiResponse({ status: 200, type: TeamMemberResponseDto })
  setReportsTo(@Param("id", ParseIntPipe) id: number, @Body() dto: SetReportsToDto) {
    return this.teamService.setReportsTo(id, dto.reportsToId);
  }

  @Get("hierarchy")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get team hierarchy" })
  async hierarchy(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.teamService.teamHierarchy(orgId);
  }

  @Get("my-team")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.MANAGER, TeamRole.ADMIN)
  @ApiOperation({ summary: "Get direct reports (for managers)" })
  @ApiResponse({ status: 200, type: [TeamMemberResponseDto] })
  async myTeam(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.teamService.directReports(orgId, req.annixRepUser.userId);
  }
}
