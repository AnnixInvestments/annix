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
import { AnnixRepAuthGuard } from "../auth";
import { MeetingPlatform } from "../entities/meeting-platform.enums";
import {
  type ConnectPlatformDto,
  MeetingPlatformService,
  type PlatformConnectionResponseDto,
  type PlatformMeetingRecordResponseDto,
  type UpdatePlatformConnectionDto,
} from "../services/meeting-platform.service";
import { MeetingSchedulerService } from "../services/meeting-scheduler.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

interface OAuthUrlResponse {
  url: string;
  state: string;
}

interface SyncResponse {
  synced: number;
  recordings: number;
}

@ApiTags("Annix Rep - Meeting Platforms")
@Controller("annix-rep/meeting-platforms")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class MeetingPlatformController {
  constructor(
    private readonly platformService: MeetingPlatformService,
    private readonly schedulerService: MeetingSchedulerService,
  ) {}

  @Get("oauth/:platform/url")
  @ApiOperation({ summary: "Generate OAuth URL for meeting platform" })
  @ApiParam({ name: "platform", enum: MeetingPlatform })
  @ApiQuery({ name: "redirectUri", type: String, required: true })
  @ApiResponse({ status: 200, description: "OAuth URL generated" })
  oauthUrl(
    @Param("platform") platform: MeetingPlatform,
    @Query("redirectUri") redirectUri: string,
  ): OAuthUrlResponse {
    const state = Buffer.from(JSON.stringify({ platform, timestamp: Date.now() })).toString(
      "base64",
    );

    const url = this.platformService.oauthUrl(platform, redirectUri, state);

    return { url, state };
  }

  @Post("oauth/:platform/callback")
  @ApiOperation({ summary: "Handle OAuth callback from platform" })
  @ApiParam({ name: "platform", enum: MeetingPlatform })
  @ApiResponse({
    status: 201,
    description: "Platform connected",
  })
  connect(
    @Req() req: AnnixRepRequest,
    @Param("platform") platform: MeetingPlatform,
    @Body() dto: { authCode: string; redirectUri: string },
  ): Promise<PlatformConnectionResponseDto> {
    const connectDto: ConnectPlatformDto = {
      platform,
      authCode: dto.authCode,
      redirectUri: dto.redirectUri,
    };
    return this.platformService.connectPlatform(req.annixRepUser.userId, connectDto);
  }

  @Get("connections")
  @ApiOperation({ summary: "List all meeting platform connections" })
  @ApiResponse({
    status: 200,
    description: "List of connections",
  })
  listConnections(@Req() req: AnnixRepRequest): Promise<PlatformConnectionResponseDto[]> {
    return this.platformService.listConnections(req.annixRepUser.userId);
  }

  @Get("connections/:id")
  @ApiOperation({ summary: "Get a platform connection by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Connection details",
  })
  @ApiResponse({ status: 404, description: "Connection not found" })
  connection(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<PlatformConnectionResponseDto> {
    return this.platformService.connection(req.annixRepUser.userId, id);
  }

  @Patch("connections/:id")
  @ApiOperation({ summary: "Update a platform connection settings" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: 200,
    description: "Connection updated",
  })
  @ApiResponse({ status: 404, description: "Connection not found" })
  updateConnection(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePlatformConnectionDto,
  ): Promise<PlatformConnectionResponseDto> {
    return this.platformService.updateConnection(req.annixRepUser.userId, id, dto);
  }

  @Delete("connections/:id")
  @ApiOperation({ summary: "Disconnect a meeting platform" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Platform disconnected" })
  @ApiResponse({ status: 404, description: "Connection not found" })
  async disconnect(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.platformService.disconnectPlatform(req.annixRepUser.userId, id);
    return { success: true };
  }

  @Post("connections/:id/sync")
  @ApiOperation({ summary: "Trigger sync for recent meetings" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "daysBack", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Sync completed" })
  @ApiResponse({ status: 404, description: "Connection not found" })
  sync(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query("daysBack") daysBack?: string,
  ): Promise<SyncResponse> {
    const days = daysBack ? parseInt(daysBack, 10) : 7;
    return this.schedulerService.manualSync(req.annixRepUser.userId, id, days);
  }

  @Get("connections/:id/recordings")
  @ApiOperation({ summary: "List meeting recordings from platform" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiResponse({
    status: 200,
    description: "List of meeting recordings",
  })
  @ApiResponse({ status: 404, description: "Connection not found" })
  listRecordings(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Query("limit") limit?: string,
  ): Promise<PlatformMeetingRecordResponseDto[]> {
    const recordLimit = limit ? parseInt(limit, 10) : 50;
    return this.platformService.listMeetingRecords(req.annixRepUser.userId, id, recordLimit);
  }

  @Get("recordings/:recordId")
  @ApiOperation({ summary: "Get a specific platform recording record" })
  @ApiParam({ name: "recordId", type: Number })
  @ApiResponse({
    status: 200,
    description: "Recording details",
  })
  @ApiResponse({ status: 404, description: "Recording not found" })
  recording(
    @Req() req: AnnixRepRequest,
    @Param("recordId", ParseIntPipe) recordId: number,
  ): Promise<PlatformMeetingRecordResponseDto> {
    return this.platformService.meetingRecord(req.annixRepUser.userId, recordId);
  }

  @Get("available")
  @ApiOperation({ summary: "List available platforms for connection" })
  @ApiResponse({ status: 200, description: "List of available platforms" })
  availablePlatforms(): {
    platforms: Array<{
      id: MeetingPlatform;
      name: string;
      description: string;
    }>;
  } {
    return {
      platforms: [
        {
          id: MeetingPlatform.ZOOM,
          name: "Zoom",
          description: "Connect your Zoom account to sync meeting recordings",
        },
        {
          id: MeetingPlatform.TEAMS,
          name: "Microsoft Teams",
          description: "Connect your Teams account to sync meeting recordings",
        },
        {
          id: MeetingPlatform.GOOGLE_MEET,
          name: "Google Meet",
          description: "Connect your Google account to sync Meet recordings",
        },
      ],
    };
  }
}
