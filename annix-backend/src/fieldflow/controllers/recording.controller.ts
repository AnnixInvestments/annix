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
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
  CompleteUploadDto,
  InitiateUploadDto,
  InitiateUploadResponseDto,
  RecordingResponseDto,
  RecordingWithSegmentsDto,
  UpdateSpeakerLabelsDto,
} from "../dto";
import { RecordingService } from "../services/recording.service";

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Recordings")
@Controller("fieldflow/recordings")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Post("initiate")
  @ApiOperation({ summary: "Initiate a new recording upload" })
  @ApiResponse({ status: 201, description: "Upload initiated", type: InitiateUploadResponseDto })
  @ApiResponse({ status: 404, description: "Meeting not found" })
  @ApiResponse({ status: 400, description: "Recording already exists" })
  initiateUpload(@Req() req: AuthenticatedRequest, @Body() dto: InitiateUploadDto) {
    return this.recordingService.initiateUpload(req.user.id, dto);
  }

  @Post(":id/chunk")
  @ApiOperation({ summary: "Upload a chunk of audio data" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "index", type: Number, required: true })
  @ApiConsumes("application/octet-stream")
  @ApiBody({ description: "Raw audio chunk data" })
  @ApiResponse({ status: 200, description: "Chunk uploaded" })
  async uploadChunk(
    @Req() req: RawBodyRequest<AuthenticatedRequest>,
    @Param("id", ParseIntPipe) id: number,
    @Query("index", ParseIntPipe) chunkIndex: number,
  ) {
    const body = req.body as Buffer;
    return this.recordingService.uploadChunk(req.user.id, id, chunkIndex, body);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Complete a recording upload" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Upload completed", type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: "Recording not found" })
  completeUpload(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.recordingService.completeUpload(req.user.id, id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get recording details" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Recording details", type: RecordingWithSegmentsDto })
  @ApiResponse({ status: 404, description: "Recording not found" })
  recording(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.recordingService.recording(req.user.id, id);
  }

  @Get("meeting/:meetingId")
  @ApiOperation({ summary: "Get recording for a meeting" })
  @ApiParam({ name: "meetingId", type: Number })
  @ApiResponse({
    status: 200,
    description: "Recording details or null",
    type: RecordingWithSegmentsDto,
  })
  recordingByMeeting(
    @Req() req: AuthenticatedRequest,
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ) {
    return this.recordingService.recordingByMeeting(req.user.id, meetingId);
  }

  @Patch(":id/speaker-labels")
  @ApiOperation({ summary: "Update speaker labels" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Labels updated", type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: "Recording not found" })
  updateSpeakerLabels(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSpeakerLabelsDto,
  ) {
    return this.recordingService.updateSpeakerLabels(req.user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a recording" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Recording deleted" })
  @ApiResponse({ status: 404, description: "Recording not found" })
  deleteRecording(@Req() req: AuthenticatedRequest, @Param("id", ParseIntPipe) id: number) {
    return this.recordingService.deleteRecording(req.user.id, id);
  }
}
