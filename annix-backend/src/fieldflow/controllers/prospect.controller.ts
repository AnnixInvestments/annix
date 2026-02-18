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
  BulkUpdateStatusDto,
  BulkUpdateStatusResponseDto,
  CreateProspectDto,
  ImportProspectsDto,
  ImportProspectsResultDto,
  NearbyProspectsQueryDto,
  ProspectResponseDto,
  UpdateProspectDto,
} from "../dto";
import { ProspectStatus } from "../entities";
import { ProspectService } from "../services";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Prospects")
@Controller("annix-rep/prospects")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class ProspectController {
  constructor(private readonly prospectService: ProspectService) {}

  @Post()
  @ApiOperation({ summary: "Create a new prospect" })
  @ApiResponse({ status: 201, description: "Prospect created", type: ProspectResponseDto })
  create(@Req() req: AnnixRepRequest, @Body() dto: CreateProspectDto) {
    return this.prospectService.create(req.annixRepUser.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all prospects for current user" })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  findAll(@Req() req: AnnixRepRequest) {
    return this.prospectService.findAll(req.annixRepUser.userId);
  }

  @Get("status/:status")
  @ApiOperation({ summary: "Get prospects by status" })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "List of prospects", type: [ProspectResponseDto] })
  findByStatus(@Req() req: AnnixRepRequest, @Param("status") status: ProspectStatus) {
    return this.prospectService.findByStatus(req.annixRepUser.userId, status);
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
    @Req() req: AnnixRepRequest,
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
    return this.prospectService.findNearby(req.annixRepUser.userId, query);
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
  followUpsDue(@Req() req: AnnixRepRequest) {
    return this.prospectService.followUpsDue(req.annixRepUser.userId);
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
  findDuplicates(@Req() req: AnnixRepRequest) {
    return this.prospectService.findDuplicates(req.annixRepUser.userId);
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

  @Get(":id")
  @ApiOperation({ summary: "Get a prospect by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect details", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  findOne(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.findOne(req.annixRepUser.userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a prospect" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Prospect updated", type: ProspectResponseDto })
  @ApiResponse({ status: 404, description: "Prospect not found" })
  update(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProspectDto,
  ) {
    return this.prospectService.update(req.annixRepUser.userId, id, dto);
  }

  @Patch(":id/status/:status")
  @ApiOperation({ summary: "Update prospect status" })
  @ApiParam({ name: "id", type: Number })
  @ApiParam({ name: "status", enum: ProspectStatus })
  @ApiResponse({ status: 200, description: "Status updated", type: ProspectResponseDto })
  updateStatus(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Param("status") status: ProspectStatus,
  ) {
    return this.prospectService.updateStatus(req.annixRepUser.userId, id, status);
  }

  @Post(":id/contacted")
  @ApiOperation({ summary: "Mark prospect as contacted" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Marked as contacted", type: ProspectResponseDto })
  markContacted(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.markContacted(req.annixRepUser.userId, id);
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
  completeFollowUp(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.prospectService.completeFollowUp(req.annixRepUser.userId, id);
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
