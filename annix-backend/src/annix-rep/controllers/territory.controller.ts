import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  AssignTerritoryDto,
  CreateTerritoryDto,
  TerritoryResponseDto,
  UpdateTerritoryDto,
} from "../dto/team.dto";
import { TeamRole } from "../entities/team-member.entity";
import { TerritoryService } from "../services/territory.service";

interface AnnixRepRequest extends Request {
  annixRepUser: AnnixRepUser;
}

@ApiTags("Annix Rep - Territories")
@Controller("annix-rep/territories")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Post()
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Create territory" })
  @ApiResponse({ status: 201, type: TerritoryResponseDto })
  async create(@Req() req: AnnixRepRequest, @Body() dto: CreateTerritoryDto) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    return this.territoryService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List territories" })
  @ApiResponse({ status: 200, type: [TerritoryResponseDto] })
  async findAll(@Req() req: AnnixRepRequest) {
    const orgId = req.annixRepUser.organizationId;
    if (!orgId) {
      throw new ForbiddenException("User is not part of an organization");
    }
    const territories = await this.territoryService.findAll(orgId);
    return territories.map((t) => ({
      ...t,
      assignedToName: t.assignedTo
        ? `${t.assignedTo.firstName ?? ""} ${t.assignedTo.lastName ?? ""}`.trim()
        : null,
    }));
  }

  @Get("my")
  @ApiOperation({ summary: "Get territories assigned to current user" })
  @ApiResponse({ status: 200, type: [TerritoryResponseDto] })
  myTerritories(@Req() req: AnnixRepRequest) {
    return this.territoryService.territoriesForUser(req.annixRepUser.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get territory by ID" })
  @ApiResponse({ status: 200, type: TerritoryResponseDto })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.territoryService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Update territory" })
  @ApiResponse({ status: 200, type: TerritoryResponseDto })
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateTerritoryDto) {
    return this.territoryService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN)
  @ApiOperation({ summary: "Delete territory" })
  @ApiResponse({ status: 200, description: "Territory deleted" })
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.territoryService.delete(id);
  }

  @Patch(":id/assign")
  @UseGuards(TeamRoleGuard)
  @TeamRoles(TeamRole.ADMIN, TeamRole.MANAGER)
  @ApiOperation({ summary: "Assign territory to user" })
  @ApiResponse({ status: 200, type: TerritoryResponseDto })
  assign(@Param("id", ParseIntPipe) id: number, @Body() dto: AssignTerritoryDto) {
    return this.territoryService.assign(id, dto.userId);
  }

  @Get(":id/prospects")
  @ApiOperation({ summary: "Get prospects in territory" })
  prospects(@Param("id", ParseIntPipe) id: number) {
    return this.territoryService.prospectsInTerritory(id);
  }
}
