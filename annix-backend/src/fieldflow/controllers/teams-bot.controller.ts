import {
  Body,
  Controller,
  Get,
  Param,
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
import {
  JoinTeamsMeetingDto,
  LeaveTeamsMeetingDto,
  type TeamsBotSessionResponseDto,
  type TeamsBotTranscriptResponseDto,
} from "../dto/teams-bot.dto";
import { TeamsBotService } from "../services/teams-bot.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Teams Bot")
@Controller("annix-rep/teams-bot")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class TeamsBotController {
  constructor(private readonly teamsBotService: TeamsBotService) {}

  @Post("join")
  @ApiOperation({ summary: "Join a Teams meeting with the AI assistant bot" })
  @ApiResponse({ status: 201, description: "Bot joined meeting successfully" })
  @ApiResponse({ status: 400, description: "Invalid meeting URL or bot not configured" })
  join(
    @Req() req: AnnixRepRequest,
    @Body() dto: JoinTeamsMeetingDto,
  ): Promise<TeamsBotSessionResponseDto> {
    return this.teamsBotService.joinMeeting(req.annixRepUser.userId, dto);
  }

  @Post("leave")
  @ApiOperation({ summary: "Leave a Teams meeting" })
  @ApiResponse({ status: 200, description: "Bot left meeting successfully" })
  @ApiResponse({ status: 404, description: "Session not found" })
  leave(
    @Req() req: AnnixRepRequest,
    @Body() dto: LeaveTeamsMeetingDto,
  ): Promise<TeamsBotSessionResponseDto> {
    return this.teamsBotService.leaveMeeting(req.annixRepUser.userId, dto.sessionId);
  }

  @Get("sessions/active")
  @ApiOperation({ summary: "List active bot sessions" })
  @ApiResponse({ status: 200, description: "List of active sessions" })
  activeSessions(@Req() req: AnnixRepRequest): Promise<TeamsBotSessionResponseDto[]> {
    return this.teamsBotService.activeSessions(req.annixRepUser.userId);
  }

  @Get("sessions/history")
  @ApiOperation({ summary: "List session history" })
  @ApiQuery({ name: "limit", type: Number, required: false })
  @ApiResponse({ status: 200, description: "Session history" })
  sessionHistory(
    @Req() req: AnnixRepRequest,
    @Query("limit") limit?: string,
  ): Promise<TeamsBotSessionResponseDto[]> {
    const historyLimit = limit ? parseInt(limit, 10) : 20;
    return this.teamsBotService.sessionHistory(req.annixRepUser.userId, historyLimit);
  }

  @Get("sessions/:sessionId")
  @ApiOperation({ summary: "Get session details" })
  @ApiParam({ name: "sessionId", type: String })
  @ApiResponse({ status: 200, description: "Session details" })
  @ApiResponse({ status: 404, description: "Session not found" })
  session(
    @Req() req: AnnixRepRequest,
    @Param("sessionId") sessionId: string,
  ): Promise<TeamsBotSessionResponseDto> {
    return this.teamsBotService.session(req.annixRepUser.userId, sessionId);
  }

  @Get("sessions/:sessionId/transcript")
  @ApiOperation({ summary: "Get session transcript" })
  @ApiParam({ name: "sessionId", type: String })
  @ApiResponse({ status: 200, description: "Session transcript" })
  @ApiResponse({ status: 404, description: "Session not found" })
  transcript(
    @Req() req: AnnixRepRequest,
    @Param("sessionId") sessionId: string,
  ): Promise<TeamsBotTranscriptResponseDto> {
    return this.teamsBotService.transcript(req.annixRepUser.userId, sessionId);
  }
}
