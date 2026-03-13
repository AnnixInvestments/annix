import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard, AnnixRepUser } from "../auth";
import { TeamRoleGuard, TeamRoles } from "../auth/guards/team-role.guard";
import { BulkHandoffDto, HandoffProspectDto } from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { ProspectHandoffService } from "../services/prospect-handoff.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Prospect Handoff")
@Controller("annix-rep/prospects/handoff")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class ProspectHandoffController {
  constructor(private readonly handoffService: ProspectHandoffService) {}

  @Post(":prospectId")
  @ApiOperation({ summary: "Handoff prospect to another team member" })
  @ApiResponse({ status: 200, description: "Prospect handed off" })
  handoff(
    @Req() req: AnnixRepRequest,
    @Param("prospectId", ParseIntPipe) prospectId: number,
    @Body() dto: HandoffProspectDto,
  ) {
    return this.handoffService.handoff(
      prospectId,
      req.annixRepUser.userId,
      dto.toUserId,
      dto.reason,
    );
  }

  @Post("bulk")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.MANAGER, TeamRole.ADMIN)
  @ApiOperation({ summary: "Bulk handoff prospects" })
  @ApiResponse({ status: 200, description: "Prospects handed off" })
  bulkHandoff(@Req() req: AnnixRepRequest, @Body() dto: BulkHandoffDto) {
    return this.handoffService.handoffBulk(
      dto.prospectIds,
      req.annixRepUser.userId,
      dto.toUserId,
      dto.reason,
    );
  }

  @Get(":prospectId/history")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get handoff history for prospect" })
  history(@Param("prospectId", ParseIntPipe) prospectId: number) {
    return this.handoffService.handoffHistory(prospectId);
  }
}
