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
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import {
  CalendarConnectionResponseDto,
  CalendarEventResponseDto,
  CalendarListResponseDto,
  ConnectCalendarDto,
  SyncCalendarDto,
  UpdateCalendarConnectionDto,
} from "../dto";
import { type CalendarColorType, CalendarProvider } from "../entities";
import { CalendarService } from "../services/calendar.service";
import { CalendarColorService, type UserColorScheme } from "../services/calendar-color.service";
import { CalendarSyncService, type SyncConflictDto } from "../services/calendar-sync.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
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

@ApiTags("Annix Rep - Calendars")
@Controller("annix-rep/calendars")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly calendarColorService: CalendarColorService,
    private readonly calendarSyncService: CalendarSyncService,
  ) {}

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
  connect(@Req() req: AnnixRepRequest, @Body() dto: ConnectCalendarDto) {
    return this.calendarService.connectCalendar(req.annixRepUser.userId, dto);
  }

  @Get("connections")
  @ApiOperation({ summary: "List all calendar connections for current user" })
  @ApiResponse({
    status: 200,
    description: "List of connections",
    type: [CalendarConnectionResponseDto],
  })
  listConnections(@Req() req: AnnixRepRequest) {
    return this.calendarService.listConnections(req.annixRepUser.userId);
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
  connection(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.calendarService.connection(req.annixRepUser.userId, id);
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
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarConnectionDto,
  ) {
    return this.calendarService.updateConnection(req.annixRepUser.userId, id, dto);
  }

  @Delete("connections/:id")
  @ApiOperation({ summary: "Disconnect a calendar" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Calendar disconnected" })
  @ApiResponse({ status: 404, description: "Connection not found" })
  disconnect(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.calendarService.disconnectCalendar(req.annixRepUser.userId, id);
  }

  @Get("connections/:id/calendars")
  @ApiOperation({ summary: "List available calendars for a connection" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "List of calendars", type: [CalendarListResponseDto] })
  @ApiResponse({ status: 404, description: "Connection not found" })
  listAvailableCalendars(@Req() req: AnnixRepRequest, @Param("id", ParseIntPipe) id: number) {
    return this.calendarService.listAvailableCalendars(req.annixRepUser.userId, id);
  }

  @Post("connections/:id/sync")
  @ApiOperation({ summary: "Trigger sync for a calendar connection" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Sync completed" })
  @ApiResponse({ status: 404, description: "Connection not found" })
  sync(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SyncCalendarDto,
  ): Promise<SyncResponse> {
    return this.calendarService.syncConnection(req.annixRepUser.userId, id, dto);
  }

  @Get("events")
  @ApiOperation({ summary: "Get calendar events in date range" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "List of events", type: [CalendarEventResponseDto] })
  events(
    @Req() req: AnnixRepRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.calendarService.eventsInRange(
      req.annixRepUser.userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get("colors")
  @ApiOperation({ summary: "Get user color scheme for calendar" })
  @ApiResponse({ status: 200, description: "User color scheme" })
  colors(@Req() req: AnnixRepRequest): Promise<UserColorScheme> {
    return this.calendarColorService.colorsForUser(req.annixRepUser.userId);
  }

  @Post("colors")
  @ApiOperation({ summary: "Set multiple colors at once" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        colors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              colorType: { type: "string", enum: ["meeting_type", "status", "calendar"] },
              colorKey: { type: "string" },
              colorValue: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Colors updated" })
  async setColors(
    @Req() req: AnnixRepRequest,
    @Body()
    body: {
      colors: Array<{ colorType: CalendarColorType; colorKey: string; colorValue: string }>;
    },
  ): Promise<{ success: boolean }> {
    await this.calendarColorService.setColors(req.annixRepUser.userId, body.colors);
    return { success: true };
  }

  @Patch("colors/:colorType/:colorKey")
  @ApiOperation({ summary: "Set a single color" })
  @ApiParam({ name: "colorType", enum: ["meeting_type", "status", "calendar"] })
  @ApiParam({ name: "colorKey", type: String })
  @ApiBody({ schema: { type: "object", properties: { colorValue: { type: "string" } } } })
  @ApiResponse({ status: 200, description: "Color updated" })
  setColor(
    @Req() req: AnnixRepRequest,
    @Param("colorType") colorType: CalendarColorType,
    @Param("colorKey") colorKey: string,
    @Body() body: { colorValue: string },
  ) {
    return this.calendarColorService.setColor(
      req.annixRepUser.userId,
      colorType,
      colorKey,
      body.colorValue,
    );
  }

  @Delete("colors/reset")
  @ApiOperation({ summary: "Reset colors to defaults" })
  @ApiQuery({ name: "colorType", enum: ["meeting_type", "status", "calendar"], required: false })
  @ApiResponse({ status: 200, description: "Colors reset" })
  async resetColors(
    @Req() req: AnnixRepRequest,
    @Query("colorType") colorType?: CalendarColorType,
  ): Promise<{ success: boolean }> {
    await this.calendarColorService.resetToDefaults(req.annixRepUser.userId, colorType);
    return { success: true };
  }

  @Get("conflicts")
  @ApiOperation({ summary: "Get pending sync conflicts" })
  @ApiResponse({ status: 200, description: "List of pending conflicts" })
  pendingConflicts(@Req() req: AnnixRepRequest): Promise<SyncConflictDto[]> {
    return this.calendarSyncService.pendingConflicts(req.annixRepUser.userId);
  }

  @Get("conflicts/count")
  @ApiOperation({ summary: "Get count of pending sync conflicts" })
  @ApiResponse({ status: 200, description: "Number of pending conflicts" })
  async conflictCount(@Req() req: AnnixRepRequest): Promise<{ count: number }> {
    const count = await this.calendarSyncService.conflictCount(req.annixRepUser.userId);
    return { count };
  }

  @Get("conflicts/:id")
  @ApiOperation({ summary: "Get a sync conflict by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Conflict details" })
  @ApiResponse({ status: 404, description: "Conflict not found" })
  conflict(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<SyncConflictDto> {
    return this.calendarSyncService.conflictById(req.annixRepUser.userId, id);
  }

  @Post("conflicts/:id/resolve")
  @ApiOperation({ summary: "Resolve a sync conflict" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        resolution: { type: "string", enum: ["keep_local", "keep_remote", "dismissed"] },
      },
      required: ["resolution"],
    },
  })
  @ApiResponse({ status: 200, description: "Conflict resolved" })
  @ApiResponse({ status: 404, description: "Conflict not found" })
  resolveConflict(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { resolution: "keep_local" | "keep_remote" | "dismissed" },
  ): Promise<SyncConflictDto> {
    return this.calendarSyncService.resolveConflict(req.annixRepUser.userId, id, body.resolution);
  }

  @Post("conflicts/detect")
  @ApiOperation({ summary: "Manually trigger conflict detection" })
  @ApiResponse({ status: 200, description: "Detected conflicts" })
  async detectConflicts(@Req() req: AnnixRepRequest): Promise<{ detected: number }> {
    const conflicts = await this.calendarSyncService.detectTimeOverlaps(req.annixRepUser.userId);
    return { detected: conflicts.length };
  }
}
