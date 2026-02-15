import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import {
  CreateProspectDto,
  NearbyProspectsQueryDto,
  ProspectResponseDto,
  UpdateProspectDto,
} from "../dto";
import { ProspectStatus } from "../entities";
import { ProspectService } from "../services";

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Prospects")
@Controller("fieldflow/prospects")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class ProspectController {
  constructor(private readonly prospectService: ProspectService) {}

  @Post()
  @ApiOperation({ summary: "Create a new prospect" })
  @ApiResponse({ status: 201, description: "Prospect created", type: ProspectResponseDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProspectDto) {
    return this.prospectService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all prospects for current user" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.prospectService.findAll(req.user.id);
  }

  @Get("status/:status")
  @ApiOperation({ summary: "Get prospects by status" })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  findByStatus(@Req() req: AuthenticatedRequest, @Param("status") status: ProspectStatus) {
    return this.prospectService.findByStatus(req.user.id, status);
  }

  @Get("nearby")
  @ApiOperation({ summary: "Find nearby prospects" })
  @ApiQuery({ name: "latitude", type: Number, required: true })
  @ApiQuery({ name: "longitude", type: Number, required: true })
  @ApiQuery({ name: "radiusKm", type: Number, required: false })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiResponse({
    status: 200,
    description: "List of nearby prospects",
    type: [ProspectResponseDto],
  })
  findNearby(
    @Req() req: AuthenticatedRequest,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
    @Query("radiusKm") radiusKm?: string,
    @Query("limit") limit?: string,
  ) {
    const query: NearbyProspectsQueryDto = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.prospectService.findNearby(req.user.id, query);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get prospect counts by status" })
  @ApiResponse({ status: 200, description: "Counts by status" })
  countByStatus(@Req() req: AuthenticatedRequest) {
    return this.prospectService.countByStatus(req.user.id);
  }

  @Get("follow-ups")
  @ApiOperation({ summary: "Get prospects with due follow-ups" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  followUpsDue(@Req() req: AuthenticatedRequest) {
    return this.prospectService.followUpsDue(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a prospect by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect details", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  findOne(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.findOne(req.user.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect updated", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProspectDto,
  ) {
    return this.prospectService.update(req.user.id, id, dto);
  }

  @Patch(":id/status/:status")
  @ApiOperation({ summary: "Update prospect status" })
  @ApiParam({ name: "id", type: Number })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "Status updated", type: ProspectResponseDto })
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("status") status: ProspectStatus,
  ) {
    return this.prospectService.updateStatus(req.user.id, id, status);
  }

  @Post(":id/contacted")
  @ApiOperation({ summary: "Mark prospect as contacted" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Marked as contacted", type: ProspectResponseDto })
  markContacted(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.markContacted(req.user.id, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect deleted" })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  remove(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.remove(req.user.id, id);
  }
}
