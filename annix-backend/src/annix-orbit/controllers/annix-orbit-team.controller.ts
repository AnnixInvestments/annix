import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  CreateAnnixOrbitTeamInviteDto,
  UpdateAnnixOrbitMemberRoleDto,
} from "../dto/annix-orbit-team.dto";
import type { AnnixOrbitRecruiterRole } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitTeamService } from "../services/annix-orbit-team.service";

type TeamRequest = {
  user: { companyId: number; id: number; recruiterRole: AnnixOrbitRecruiterRole | null };
};

@Controller("annix-orbit/team")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitTeamController {
  constructor(private readonly teamService: AnnixOrbitTeamService) {}

  @Get()
  list(@Request() req: TeamRequest) {
    return this.teamService.listTeam(req.user.companyId);
  }

  @Post("invites")
  invite(@Request() req: TeamRequest, @Body() dto: CreateAnnixOrbitTeamInviteDto) {
    return this.teamService.createInvite(
      req.user.companyId,
      { id: req.user.id, recruiterRole: req.user.recruiterRole },
      dto,
    );
  }

  @Put("members/:userId/role")
  updateRole(
    @Request() req: TeamRequest,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() dto: UpdateAnnixOrbitMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(
      req.user.companyId,
      { id: req.user.id, recruiterRole: req.user.recruiterRole },
      userId,
      dto,
    );
  }

  @Delete("members/:userId")
  removeMember(@Request() req: TeamRequest, @Param("userId", ParseIntPipe) userId: number) {
    return this.teamService.removeMember(
      req.user.companyId,
      { id: req.user.id, recruiterRole: req.user.recruiterRole },
      userId,
    );
  }

  @Delete("invites/:id")
  cancelInvite(@Request() req: TeamRequest, @Param("id", ParseIntPipe) id: number) {
    return this.teamService.cancelInvite(
      req.user.companyId,
      { id: req.user.id, recruiterRole: req.user.recruiterRole },
      id,
    );
  }
}
