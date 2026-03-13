import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard, AnnixRepUser } from "../auth";
import { TeamRoleGuard, TeamRoles } from "../auth/guards/team-role.guard";
import {
  CreateOrganizationDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
} from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { OrganizationService } from "../services/organization.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Organization")
@Controller("annix-rep/organization")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: "Create a new organization" })
  @ApiResponse({ status: 201, description: "Organization created", type: OrganizationResponseDto })
  create(@Req() req: AnnixRepRequest, @Body() dto: CreateOrganizationDto) {
    return this.organizationService.create(req.annixRepUser.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get current user's organization" })
  @ApiResponse({ status: 200, description: "Organization details", type: OrganizationResponseDto })
  current(@Req() req: AnnixRepRequest) {
    return this.organizationService.findByUser(req.annixRepUser.userId);
  }

  @Get(":id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get organization by ID" })
  @ApiResponse({ status: 200, description: "Organization details", type: OrganizationResponseDto })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.organizationService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN)
  @ApiOperation({ summary: "Update organization" })
  @ApiResponse({ status: 200, description: "Organization updated", type: OrganizationResponseDto })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN)
  @ApiOperation({ summary: "Delete organization (owner only)" })
  @ApiResponse({ status: 200, description: "Organization deleted" })
  delete(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.organizationService.delete(id, req.annixRepUser.userId);
  }

  @Get(":id/stats")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Get organization statistics" })
  stats(@Param("id", ParseIntPipe) id: number) {
    return this.organizationService.stats(id);
  }
}
