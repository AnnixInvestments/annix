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
import { FieldFlowAuthGuard } from "../auth";
import {
  CreateProspectDto,
  NearbyProspectsQueryDto,
  ProspectResponseDto,
  UpdateProspectDto,
} from "../dto";
import { ProspectStatus } from "../entities";
import { ProspectService } from "../services";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Prospects")
@Controller("fieldflow/prospects")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class ProspectController {
  constructor(private readonly prospectService: ProspectService) {}

  @Post()
  @ApiOperation({ summary: "Create a new prospect" })
  @ApiResponse({ status: 201, description: "Prospect created", type: ProspectResponseDto })
  create(@Req() req: FieldFlowRequest, @Body() dto: CreateProspectDto) {
    return this.prospectService.create(req.fieldflowUser.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all prospects for current user" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  findAll(@Req() req: FieldFlowRequest) {
    return this.prospectService.findAll(req.fieldflowUser.userId);
  }

  @Get("status/:status")
  @ApiOperation({ summary: "Get prospects by status" })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  findByStatus(@Req() req: FieldFlowRequest, @Param("status") status: ProspectStatus) {
    return this.prospectService.findByStatus(req.fieldflowUser.userId, status);
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
    @Req() req: FieldFlowRequest,
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
    return this.prospectService.findNearby(req.fieldflowUser.userId, query);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get prospect counts by status" })
  @ApiResponse({ status: 200, description: "Counts by status" })
  countByStatus(@Req() req: FieldFlowRequest) {
    return this.prospectService.countByStatus(req.fieldflowUser.userId);
  }

  @Get("follow-ups")
  @ApiOperation({ summary: "Get prospects with due follow-ups" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  followUpsDue(@Req() req: FieldFlowRequest) {
    return this.prospectService.followUpsDue(req.fieldflowUser.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a prospect by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect details", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  findOne(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.findOne(req.fieldflowUser.userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect updated", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  update(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProspectDto,
  ) {
    return this.prospectService.update(req.fieldflowUser.userId, id, dto);
  }

  @Patch(":id/status/:status")
  @ApiOperation({ summary: "Update prospect status" })
  @ApiParam({ name: "id", type: Number })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "Status updated", type: ProspectResponseDto })
  updateStatus(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("status") status: ProspectStatus,
  ) {
    return this.prospectService.updateStatus(req.fieldflowUser.userId, id, status);
  }

  @Post(":id/contacted")
  @ApiOperation({ summary: "Mark prospect as contacted" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Marked as contacted", type: ProspectResponseDto })
  markContacted(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.markContacted(req.fieldflowUser.userId, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect deleted" })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  remove(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.remove(req.fieldflowUser.userId, id);
  }
}
