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
  CalendarConnectionResponseDto,
  CalendarEventResponseDto,
  CalendarListResponseDto,
  ConnectCalendarDto,
  SyncCalendarDto,
  UpdateCalendarConnectionDto,
} from "../dto";
import { CalendarProvider } from "../entities";
import { CalendarService } from "../services/calendar.service";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

interface OAuthUrlResponse {
  url: string;
}

interface SyncResponse {
  synced: number;
  deleted: number;
  errors: string[];
}

@ApiTags("FieldFlow - Calendars")
@Controller("fieldflow/calendars")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get("oauth-url/:provider")
  @ApiOperation({ summary: "Generate OAuth URL for calendar provider" })
  @ApiParam({ name: "provider", enum: CalendarProvider })
  @ApiQuery({ name: "redirectUri", type: String, required: true })
  @ApiResponse({ status: 200, description: "OAuth URL generated" })
  oauthUrl(
    @Param("provider") provider: CalendarProvider,
    @Query("redirectUri") redirectUri: string,
  ): OAuthUrlResponse {
    const url = this.calendarService.oauthUrl(provider, redirectUri);
    return { url };
  }

  @Post("connect")
  @ApiOperation({ summary: "Connect a calendar by exchanging auth code" })
  @ApiResponse({
    status: 201,
    description: "Calendar connected",
    type: CalendarConnectionResponseDto,
  })
  connect(@Req() req: FieldFlowRequest, @Body() dto: ConnectCalendarDto) {
    return this.calendarService.connectCalendar(req.fieldflowUser.userId, dto);
  }

  @Get("connections")
  @ApiOperation({ summary: "List all calendar connections for current user" })
  @ApiResponse({
    status: 200,
    description: "List of connections",
    type: [CalendarConnectionResponseDto],
  })
  listConnections(@Req() req: FieldFlowRequest) {
    return this.calendarService.listConnections(req.fieldflowUser.userId);
  }

  @Get("connections/:id")
  @ApiOperation({ summary: "Get a calendar connection by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Connection details",
    type: CalendarConnectionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Connection not found" })
  connection(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.calendarService.connection(req.fieldflowUser.userId, id);
  }

  @Patch("connections/:id")
  @ApiOperation({ summary: "Update a calendar connection" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Connection updated",
    type: CalendarConnectionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Connection not found" })
  updateConnection(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarConnectionDto,
  ) {
    return this.calendarService.updateConnection(req.fieldflowUser.userId, id, dto);
  }

  @Delete("connections/:id")
  @ApiOperation({ summary: "Disconnect a calendar" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Calendar disconnected" })
  @ApiResponse({ status: 404, description: "Connection not found" })
  disconnect(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.calendarService.disconnectCalendar(req.fieldflowUser.userId, id);
  }

  @Get("connections/:id/calendars")
  @ApiOperation({ summary: "List available calendars for a connection" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "List of calendars", type: [CalendarListResponseDto] })
  @ApiResponse({ status: 404, description: "Connection not found" })
  listAvailableCalendars(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.calendarService.listAvailableCalendars(req.fieldflowUser.userId, id);
  }

  @Post("connections/:id/sync")
  @ApiOperation({ summary: "Trigger sync for a calendar connection" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Sync completed" })
  @ApiResponse({ status: 404, description: "Connection not found" })
  sync(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SyncCalendarDto,
  ): Promise<SyncResponse> {
    return this.calendarService.syncConnection(req.fieldflowUser.userId, id, dto);
  }

  @Get("events")
  @ApiOperation({ summary: "Get calendar events in date range" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "List of events", type: [CalendarEventResponseDto] })
  events(
    @Req() req: FieldFlowRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.calendarService.eventsInRange(
      req.fieldflowUser.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
