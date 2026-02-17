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
import { FieldFlowAuthGuard } from "../auth";
import {
  CompleteUploadDto,
  InitiateUploadDto,
  InitiateUploadResponseDto,
  RecordingResponseDto,
  RecordingWithSegmentsDto,
  UpdateSpeakerLabelsDto,
} from "../dto";
import { RecordingService } from "../services/recording.service";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Recordings")
@Controller("fieldflow/recordings")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Post("initiate")
  @ApiOperation({ summary: "Initiate a new recording upload" })
  @ApiResponse({ status: 201, description: "Upload initiated", type: InitiateUploadResponseDto })
  @ApiResponse({ status: 404, description: "Meeting not found" })
  @ApiResponse({ status: 400, description: "Recording already exists" })
  initiateUpload(@Req() req: FieldFlowRequest, @Body() dto: InitiateUploadDto) {
    return this.recordingService.initiateUpload(req.fieldflowUser.userId, dto);
  }

  @Post(":id/chunk")
  @ApiOperation({ summary: "Upload a chunk of audio data" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "index", type: Number, required: true })
  @ApiConsumes("application/octet-stream")
  @ApiBody({ description: "Raw audio chunk data" })
  @ApiResponse({ status: 200, description: "Chunk uploaded" })
  async uploadChunk(
    @Req() req: RawBodyRequest<FieldFlowRequest>,
    @Param("id", ParseIntPipe) id: number,
    @Query("index", ParseIntPipe) chunkIndex: number,
  ) {
    const body = req.body as Buffer;
    return this.recordingService.uploadChunk(req.fieldflowUser.userId, id, chunkIndex, body);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Complete a recording upload" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Upload completed", type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: "Recording not found" })
  completeUpload(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CompleteUploadDto,
  ) {
    return this.recordingService.completeUpload(req.fieldflowUser.userId, id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get recording details" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Recording details", type: RecordingWithSegmentsDto })
  @ApiResponse({ status: 404, description: "Recording not found" })
  recording(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.recordingService.recording(req.fieldflowUser.userId, id);
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
    @Req() req: FieldFlowRequest,
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ) {
    return this.recordingService.recordingByMeeting(req.fieldflowUser.userId, meetingId);
  }

  @Patch(":id/speaker-labels")
  @ApiOperation({ summary: "Update speaker labels" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Labels updated", type: RecordingResponseDto })
  @ApiResponse({ status: 404, description: "Recording not found" })
  updateSpeakerLabels(
    @Req() req: FieldFlowRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSpeakerLabelsDto,
  ) {
    return this.recordingService.updateSpeakerLabels(req.fieldflowUser.userId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a recording" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, description: "Recording deleted" })
  @ApiResponse({ status: 404, description: "Recording not found" })
  deleteRecording(@Req() req: FieldFlowRequest, @Param("id", ParseIntPipe) id: number) {
    return this.recordingService.deleteRecording(req.fieldflowUser.userId, id);
  }
}
