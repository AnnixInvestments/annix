import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { TranscriptWithSegmentsDto, UpdateTranscriptDto } from "../dto";
import { TranscriptionService } from "../services/transcription.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Transcripts")
@ApiBearerAuth()
@UseGuards(AnnixRepAuthGuard)
@Controller("annix-rep/transcripts")
export class TranscriptController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Get("recording/:recordingId")
  @ApiOperation({ summary: "Get transcript for a recording" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 200, type: TranscriptWithSegmentsDto })
  async transcriptByRecording(
    @Param("recordingId", ParseIntPipe) recordingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.transcript(recordingId);
    if (!transcript) {
      throw new NotFoundException("Transcript not found");
    }
    return transcript;
  }

  @Get("meeting/:meetingId")
  @ApiOperation({ summary: "Get transcript for a meeting" })
  @ApiParam({ name: "meetingId", type: Number })
  @ApiResponse({ status: 200, type: TranscriptWithSegmentsDto })
  async transcriptByMeeting(
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.transcriptByMeeting(meetingId);
    if (!transcript) {
      throw new NotFoundException("Transcript not found");
    }
    return transcript;
  }

  @Post("recording/:recordingId/transcribe")
  @ApiOperation({ summary: "Transcribe a recording" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 201, type: TranscriptWithSegmentsDto })
  async transcribe(
    @Param("recordingId", ParseIntPipe) recordingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.transcribeRecording(recordingId);
    return {
      id: transcript.id,
      recordingId: transcript.recordingId,
      fullText: transcript.fullText,
      wordCount: transcript.wordCount,
      summary: transcript.summary,
      analysis: transcript.analysis,
      whisperModel: transcript.whisperModel,
      language: transcript.language,
      processingTimeMs: transcript.processingTimeMs,
      createdAt: transcript.createdAt,
      segments: transcript.segments,
    };
  }

  @Post("recording/:recordingId/retranscribe")
  @ApiOperation({ summary: "Re-transcribe a recording (deletes existing transcript)" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 201, type: TranscriptWithSegmentsDto })
  async retranscribe(
    @Param("recordingId", ParseIntPipe) recordingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.retranscribe(recordingId);
    return {
      id: transcript.id,
      recordingId: transcript.recordingId,
      fullText: transcript.fullText,
      wordCount: transcript.wordCount,
      summary: transcript.summary,
      analysis: transcript.analysis,
      whisperModel: transcript.whisperModel,
      language: transcript.language,
      processingTimeMs: transcript.processingTimeMs,
      createdAt: transcript.createdAt,
      segments: transcript.segments,
    };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update transcript segments (speaker labels and text)" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({ status: 200, type: TranscriptWithSegmentsDto })
  async updateTranscript(
    @Req() req: AnnixRepRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTranscriptDto,
  ): Promise<TranscriptWithSegmentsDto> {
    return this.transcriptionService.updateSegments(req.annixRepUser.userId, id, dto);
  }

  @Delete("recording/:recordingId")
  @ApiOperation({ summary: "Delete transcript for a recording" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 204 })
  async deleteTranscript(@Param("recordingId", ParseIntPipe) recordingId: number): Promise<void> {
    await this.transcriptionService.deleteTranscript(recordingId);
  }
}
