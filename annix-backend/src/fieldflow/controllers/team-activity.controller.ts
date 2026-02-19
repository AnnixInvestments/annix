import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard, AnnixRepUser } from "../auth";
import { TeamRoleGuard, TeamRoles } from "../auth/guards/team-role.guard";
import { TeamActivityResponseDto } from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { TeamActivityService } from "../services/team-activity.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Team Activity")
@Controller("annix-rep/team/activity")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class TeamActivityController {
  constructor(private readonly activityService: TeamActivityService) {}

  @Get("feed")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get team activity feed" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, type: [TeamActivityResponseDto] })
  async feed(@Req() req: AnnixRepRequest, @Query("limit") limit?: string) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const activities = await this.activityService.feed(orgId, {
      limit: limit ? parseInt(limit, 10) : 50,
    });
    return activities.map((a) => ({
      ...a,
      userName: a.user ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() : undefined,
    }));
  }

  @Get("feed/my-team")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.MANAGER, TeamRole.ADMIN)
  @ApiOperation({ summary: "Get direct reports activity feed" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, type: [TeamActivityResponseDto] })
  async myTeamFeed(@Req() req: AnnixRepRequest, @Query("limit") limit?: string) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const activities = await this.activityService.feedForManager(
      orgId,
      req.annixRepUser.userId,
      limit ? parseInt(limit, 10) : 50,
    );
    return activities.map((a) => ({
      ...a,
      userName: a.user ? `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim() : undefined,
    }));
  }

  @Get("user/:userId")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get activity for specific user" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, type: [TeamActivityResponseDto] })
  async userActivity(
    @Req() req: AnnixRepRequest,
    @Param("userId", ParseIntPipe) userId: number,
    @Query("limit") limit?: string,
  ) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.activityService.userActivity(orgId, userId, limit ? parseInt(limit, 10) : 50);
  }
}
