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
  CreateMeetingDto,
  EndMeetingDto,
  MeetingResponseDto,
  MeetingWithDetailsDto,
  StartMeetingDto,
  UpdateMeetingDto,
} from "../dto";
import { MeetingService } from "../services";

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Meetings")
@Controller("fieldflow/meetings")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({ summary: "Create a new meeting" })
  @ApiResponse({ status: 201, description: "Meeting created", type: MeetingResponseDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateMeetingDto) {
    return this.meetingService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all meetings for current user" })
  @ApiResponse({ status: 200, description: "List of meetings", type: [MeetingResponseDto] })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.meetingService.findAll(req.user.id);
  }

  @Get("today")
  @ApiOperation({ summary: "Get today's meetings" })
  @ApiResponse({ status: 200, description: "Today's meetings", type: [MeetingResponseDto] })
  todaysMeetings(@Req() req: AuthenticatedRequest) {
    return this.meetingService.todaysMeetings(req.user.id);
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Get upcoming meetings" })
  @ApiQuery({ name: "days", type: Number, required: false, description: "Number of days ahead" })
  @ApiResponse({ status: 200, description: "Upcoming meetings", type: [MeetingResponseDto] })
  findUpcoming(@Req() req: AuthenticatedRequest, @Query("days") days?: string) {
    return this.meetingService.findUpcoming(req.user.id, days ? parseInt(days, 10) : 7);
  }

  @Get("active")
  @ApiOperation({ summary: "Get currently active meeting" })
  @ApiResponse({ status: 200, description: "Active meeting or null", type: MeetingResponseDto })
  activeMeeting(@Req() req: AuthenticatedRequest) {
    return this.meetingService.activeMeeting(req.user.id);
  }

  @Get("with-recordings")
  @ApiOperation({ summary: "Get meetings that have recordings" })
  @ApiResponse({ status: 200, description: "Meetings with recordings", type: [MeetingResponseDto] })
  meetingsWithRecordings(@Req() req: AuthenticatedRequest) {
    return this.meetingService.meetingsWithRecordings(req.user.id);
  }

  @Get("pending-transcription")
  @ApiOperation({ summary: "Get meetings pending transcription" })
  @ApiResponse({
    status: 200,
    description: "Meetings pending transcription",
    type: [MeetingResponseDto],
  })
  meetingsPendingTranscription(@Req() req: AuthenticatedRequest) {
    return this.meetingService.meetingsPendingTranscription(req.user.id);
  }

  @Get("range")
  @ApiOperation({ summary: "Get meetings in date range" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "List of meetings", type: [MeetingResponseDto] })
  findByDateRange(
    @Req() req: AuthenticatedRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.meetingService.findByDateRange(req.user.id, new Date(startDate), new Date(endDate));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a meeting by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting details", type: MeetingResponseDto })
  @ApiResponse({ status: 404, description: "Meeting not found" })
  findOne(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.meetingService.findOne(req.user.id, id);
  }

  @Get(":id/details")
  @ApiOperation({ summary: "Get meeting with recording and transcript details" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting with details", type: MeetingWithDetailsDto })
  @ApiResponse({ status: 404, description: "Meeting not found" })
  findOneWithDetails(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.meetingService.findOneWithDetails(req.user.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a meeting" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting updated", type: MeetingResponseDto })
  @ApiResponse({ status: 404, description: "Meeting not found" })
  update(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetingService.update(req.user.id, id, dto);
  }

  @Post(":id/start")
  @ApiOperation({ summary: "Start a meeting" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting started", type: MeetingResponseDto })
  @ApiResponse({ status: 400, description: "Meeting already in progress or completed" })
  start(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: StartMeetingDto,
  ) {
    return this.meetingService.start(req.user.id, id, dto);
  }

  @Post(":id/end")
  @ApiOperation({ summary: "End a meeting" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting ended", type: MeetingResponseDto })
  @ApiResponse({ status: 400, description: "Meeting not in progress" })
  end(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: EndMeetingDto,
  ) {
    return this.meetingService.end(req.user.id, id, dto);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel a meeting" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting cancelled", type: MeetingResponseDto })
  @ApiResponse({ status: 400, description: "Cannot cancel completed meeting" })
  cancel(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.meetingService.cancel(req.user.id, id);
  }

  @Post(":id/no-show")
  @ApiOperation({ summary: "Mark meeting as no-show" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Marked as no-show", type: MeetingResponseDto })
  markNoShow(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.meetingService.markNoShow(req.user.id, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a meeting" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Meeting deleted" })
  @ApiResponse({ status: 404, description: "Meeting not found" })
  remove(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.meetingService.remove(req.user.id, id);
  }
}
