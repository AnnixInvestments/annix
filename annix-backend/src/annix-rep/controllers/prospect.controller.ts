import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
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
import { Request, Response } from "express";
import { AnnixRepAuthGuard } from "../auth";
import {
  BulkDeleteDto,
  BulkDeleteResponseDto,
  BulkTagOperationDto,
  BulkTagOperationResponseDto,
  BulkUpdateStatusDto,
  BulkUpdateStatusResponseDto,
  CreateProspectDto,
  ImportProspectsDto,
  ImportProspectsResultDto,
  MergeProspectsDto,
  NearbyProspectsQueryDto,
  ProspectActivityResponseDto,
  ProspectResponseDto,
  toProspectResponse,
  UpdateProspectDto,
} from "../dto";
import { ProspectStatus } from "../entities";
import { ProspectActivityService, ProspectService } from "../services";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Pulse - Prospects")
@Controller("annix-rep/prospects")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class ProspectController {
  constructor(
    private readonly prospectService: ProspectService,
    private readonly activityService: ProspectActivityService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new prospect" })
  @ApiResponse({ status: 201, description: "Prospect created", type: ProspectResponseDto })
  async create(
    @Req() req: AnnixRepRequest,
    @Body() dto: CreateProspectDto,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.create(req.annixRepUser.userId, dto);
    return toProspectResponse(prospect);
  }

  @Get()
  @ApiOperation({ summary: "Get all prospects for current user" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  async findAll(@Req() req: AnnixRepRequest): Promise<ProspectResponseDto[]> {
    const prospects = await this.prospectService.findAll(req.annixRepUser.userId);
    return prospects.map(toProspectResponse);
  }

  @Get("status/:status")
  @ApiOperation({ summary: "Get prospects by status" })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  async findByStatus(
    @Req() req: AnnixRepRequest,
    @Param("status") status: ProspectStatus,
  ): Promise<ProspectResponseDto[]> {
    const prospects = await this.prospectService.findByStatus(req.annixRepUser.userId, status);
    return prospects.map(toProspectResponse);
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
  async findNearby(
    @Req() req: AnnixRepRequest,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
    @Query("radiusKm") radiusKm?: string,
    @Query("limit") limit?: string,
  ): Promise<ProspectResponseDto[]> {
    const query: NearbyProspectsQueryDto = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    const prospects = await this.prospectService.findNearby(req.annixRepUser.userId, query);
    return prospects.map(toProspectResponse);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get prospect counts by status" })
  @ApiResponse({ status: 200, description: "Counts by status" })
  countByStatus(@Req() req: AnnixRepRequest) {
    return this.prospectService.countByStatus(req.annixRepUser.userId);
  }

  @Get("follow-ups")
  @ApiOperation({ summary: "Get prospects with due follow-ups" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  async followUpsDue(@Req() req: AnnixRepRequest): Promise<ProspectResponseDto[]> {
    const prospects = await this.prospectService.followUpsDue(req.annixRepUser.userId);
    return prospects.map(toProspectResponse);
  }

  @Get("export/csv")
  @ApiOperation({ summary: "Export all prospects to CSV" })
  @ApiResponse({ status: 200, description: "CSV file download" })
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="prospects.csv"')
  async exportCsv(@Req() req: AnnixRepRequest, @Res() res: Response) {
    const csv = await this.prospectService.exportToCsv(req.annixRepUser.userId);
    res.send(csv);
  }

  @Get("duplicates")
  @ApiOperation({ summary: "Find potential duplicate prospects" })
  @ApiResponse({ status: 200, description: "List of potential duplicates" })
  async findDuplicates(
    @Req() req: AnnixRepRequest,
  ): Promise<Array<{ field: string; value: string; prospects: ProspectResponseDto[] }>> {
    const groups = await this.prospectService.findDuplicates(req.annixRepUser.userId);
    return groups.map((group) => ({
      ...group,
      prospects: group.prospects.map(toProspectResponse),
    }));
  }

  @Patch("bulk/status")
  @ApiOperation({ summary: "Update status for multiple prospects" })
  @ApiResponse({
    status: 200,
    description: "Bulk update result",
    type: BulkUpdateStatusResponseDto,
  })
  bulkUpdateStatus(@Req() req: AnnixRepRequest, @Body() dto: BulkUpdateStatusDto) {
    return this.prospectService.bulkUpdateStatus(req.annixRepUser.userId, dto.ids, dto.status);
  }

  @Delete("bulk")
  @ApiOperation({ summary: "Delete multiple prospects" })
  @ApiResponse({ status: 200, description: "Bulk delete result", type: BulkDeleteResponseDto })
  bulkDelete(@Req() req: AnnixRepRequest, @Body() dto: BulkDeleteDto) {
    return this.prospectService.bulkDelete(req.annixRepUser.userId, dto.ids);
  }

  @Post("import")
  @ApiOperation({ summary: "Import prospects from CSV data" })
  @ApiResponse({ status: 201, description: "Import result", type: ImportProspectsResultDto })
  importProspects(@Req() req: AnnixRepRequest, @Body() dto: ImportProspectsDto) {
    return this.prospectService.importFromCsv(
      req.annixRepUser.userId,
      dto.rows,
      dto.skipInvalid ?? true,
    );
  }

  @Post("merge")
  @ApiOperation({ summary: "Merge duplicate prospects into primary" })
  @ApiResponse({ status: 200, description: "Prospects merged", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "One or more prospects not found" })
  async mergeProspects(
    @Req() req: AnnixRepRequest,
    @Body() dto: MergeProspectsDto,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.mergeProspects(req.annixRepUser.userId, dto);
    return toProspectResponse(prospect);
  }

  @Patch("bulk/tags")
  @ApiOperation({ summary: "Add or remove tags from multiple prospects" })
  @ApiResponse({
    status: 200,
    description: "Bulk tag operation result",
    type: BulkTagOperationResponseDto,
  })
  bulkTagOperation(@Req() req: AnnixRepRequest, @Body() dto: BulkTagOperationDto) {
    return this.prospectService.bulkTagOperation(req.annixRepUser.userId, dto);
  }

  @Patch("bulk/assign")
  @ApiOperation({ summary: "Assign multiple prospects to a user" })
  @ApiResponse({ status: 200, description: "Bulk assignment result" })
  bulkAssign(
    @Req() req: AnnixRepRequest,
    @Body() dto: { ids: number[]; assignedToId: number | null },
  ) {
    return this.prospectService.bulkAssign(req.annixRepUser.userId, dto.ids, dto.assignedToId);
  }

  @Post("recalculate-scores")
  @ApiOperation({ summary: "Recalculate scores for all prospects" })
  @ApiResponse({ status: 200, description: "Scores recalculated" })
  recalculateScores(@Req() req: AnnixRepRequest) {
    return this.prospectService.recalculateAllScores(req.annixRepUser.userId);
  }

  @Get(":id/activities")
  @ApiOperation({ summary: "Get activity history for a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({
    name: "limit",
    type: Number,
    required: false,
    description: "Max activities to return",
  })
  @ApiResponse({
    status: 200,
    description: "List of activities",
    type: [ProspectActivityResponseDto],
  })
  async prospectActivities(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query("limit") limit?: string,
  ) {
    await this.prospectService.findOne(req.annixRepUser.userId, id);
    const activities = await this.activityService.findByProspect(
      id,
      limit ? parseInt(limit, 10) : 50,
    );
    return activities.map((a) => ({
      id: a.id,
      prospectId: a.prospectId,
      userId: a.userId,
      userName: a.user
        ? [a.user.firstName, a.user.lastName].filter(Boolean).join(" ") || a.user.email
        : null,
      activityType: a.activityType,
      oldValues: a.oldValues,
      newValues: a.newValues,
      description: a.description,
      createdAt: a.createdAt,
    }));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a prospect by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect details", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  async findOne(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.findOne(req.annixRepUser.userId, id);
    return toProspectResponse(prospect);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect updated", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  async update(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProspectDto,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.update(req.annixRepUser.userId, id, dto);
    return toProspectResponse(prospect);
  }

  @Patch(":id/status/:status")
  @ApiOperation({ summary: "Update prospect status" })
  @ApiParam({ name: "id", type: Number })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "Status updated", type: ProspectResponseDto })
  async updateStatus(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("status") status: ProspectStatus,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.updateStatus(req.annixRepUser.userId, id, status);
    return toProspectResponse(prospect);
  }

  @Post(":id/contacted")
  @ApiOperation({ summary: "Mark prospect as contacted" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Marked as contacted", type: ProspectResponseDto })
  async markContacted(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.markContacted(req.annixRepUser.userId, id);
    return toProspectResponse(prospect);
  }

  @Post(":id/complete-followup")
  @ApiOperation({
    summary: "Complete follow-up and auto-schedule next based on recurrence",
  })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Follow-up completed, next scheduled if recurring",
    type: ProspectResponseDto,
  })
  async completeFollowUp(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.completeFollowUp(req.annixRepUser.userId, id);
    return toProspectResponse(prospect);
  }

  @Post(":id/snooze-followup")
  @ApiOperation({ summary: "Snooze follow-up by a number of days" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Follow-up snoozed",
    type: ProspectResponseDto,
  })
  async snoozeFollowUp(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: { days: number },
  ): Promise<ProspectResponseDto> {
    const prospect = await this.prospectService.snoozeFollowUp(
      req.annixRepUser.userId,
      id,
      dto.days,
    );
    return toProspectResponse(prospect);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect deleted" })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  remove(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.remove(req.annixRepUser.userId, id);
  }
}
